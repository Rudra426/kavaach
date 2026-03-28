import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from database import SessionLocal
from models import TriggerEvent, Policy, Rider, Claim, Payout
from weather_service import poll_all_pincodes
from claims_engine import process_trigger_for_riders
from payout_service import process_payout
from servicenow_client import create_claim_ticket

scheduler = AsyncIOScheduler()


# ── Job 1: Weather polling every 15 minutes ───────────────────────────────────
async def job_poll_weather():
    print(f"\n⏰ [SCHEDULER] Weather poll — {datetime.now().strftime('%H:%M:%S')}")
    try:
        fired_triggers = await poll_all_pincodes()
        for trigger in fired_triggers:
            await job_process_trigger(trigger["trigger_id"])
    except Exception as e:
        print(f"⚠️ [SCHEDULER] Weather poll error: {e}")


# ── Job 2: Process claims for a trigger ──────────────────────────────────────
async def job_process_trigger(trigger_id: str):
    print(f"\n⚡ [SCHEDULER] Processing trigger {trigger_id}")
    try:
        result = process_trigger_for_riders(trigger_id)
        claims = result.get("claims", [])

        for claim in claims:
            claim_id = claim["claim_id"]
            tier     = claim["tier"]

            # GREEN → auto payout immediately
            if tier == "GREEN":
                payout_result = process_payout(claim_id)
                print(f"  💸 AUTO-PAID: ₹{claim['payout_amount']} → {claim['rider_name']}")

            # YELLOW → pay 60% immediately + create ServiceNow ticket for 40%
            elif tier == "YELLOW":
                payout_result = process_payout(claim_id)
                ticket = await create_claim_ticket(claim_id)
                print(f"  💛 YELLOW: ₹{claim['payout_amount']} paid, "
                      f"₹{claim['held_amount']} held | Ticket: {ticket.get('ticket_id')}")

            # RED → create ServiceNow ticket, no auto-payout
            elif tier == "RED":
                ticket = await create_claim_ticket(claim_id)
                print(f"  🔴 RED: Full hold | Ticket: {ticket.get('ticket_id')}")

    except Exception as e:
        print(f"⚠️ [SCHEDULER] Trigger process error: {e}")


# ── Job 3: Resolve stale active triggers every hour ───────────────────────────
async def job_resolve_stale_triggers():
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=6)
        stale = db.query(TriggerEvent).filter(
            TriggerEvent.status == "active",
            TriggerEvent.fired_at < cutoff
        ).all()

        for t in stale:
            t.status = "resolved"
            t.resolved_at = datetime.utcnow()

        db.commit()
        if stale:
            print(f"🔄 [SCHEDULER] Resolved {len(stale)} stale trigger(s)")
    except Exception as e:
        db.rollback()
        print(f"⚠️ [SCHEDULER] Stale trigger cleanup error: {e}")
    finally:
        db.close()


# ── Job 4: Weekly premium renewal every Sunday midnight ──────────────────────
async def job_weekly_renewal():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due_policies = db.query(Policy).filter(
            Policy.status == "active",
            Policy.next_payment_due <= now
        ).all()

        for policy in due_policies:
            # Check if rider had any claims this week
            week_ago = now - timedelta(days=7)
            had_claim = db.query(Claim).filter(
                Claim.policy_id == policy.id,
                Claim.created_at >= week_ago,
                Claim.status.in_(["paid", "partial_paid"])
            ).first()

            if not had_claim:
                policy.no_claim_weeks = min(policy.no_claim_weeks + 1, 5)
            else:
                policy.no_claim_weeks = 0

            # Recalculate premium with updated no_claim_weeks
            rider = db.query(Rider).filter(Rider.id == policy.rider_id).first()
            from main import calculate_premium
            new_premium = calculate_premium(
                rider.pincode, rider.weekly_earnings,
                rider.platform.split(","), rider.delivery_type,
                rider.cold_chain, rider.medicine_type,
                rider.experience_years, rider.avg_deliveries_per_day,
                policy.no_claim_weeks
            )
            policy.weekly_premium  = new_premium["weekly_premium"]
            policy.coverage_amount = new_premium["coverage_amount"]
            policy.next_payment_due = now + timedelta(days=7)

            print(f"🔁 [RENEWAL] {rider.name} | "
                  f"No-claim weeks: {policy.no_claim_weeks} | "
                  f"New premium: ₹{policy.weekly_premium}")

        db.commit()
        print(f"✅ [SCHEDULER] Weekly renewal done — {len(due_policies)} policies updated")
    except Exception as e:
        db.rollback()
        print(f"⚠️ [SCHEDULER] Renewal error: {e}")
    finally:
        db.close()


# ── Start / Stop ──────────────────────────────────────────────────────────────
def start_scheduler():
    # Weather poll every 15 minutes
    scheduler.add_job(
        job_poll_weather,
        IntervalTrigger(minutes=15),
        id="weather_poll",
        name="Weather Poll",
        replace_existing=True
    )

    # Resolve stale triggers every hour
    scheduler.add_job(
        job_resolve_stale_triggers,
        IntervalTrigger(hours=1),
        id="stale_triggers",
        name="Stale Trigger Cleanup",
        replace_existing=True
    )

    # Weekly renewal every day at midnight (checks due_date internally)
    scheduler.add_job(
        job_weekly_renewal,
        IntervalTrigger(hours=24),
        id="weekly_renewal",
        name="Weekly Premium Renewal",
        replace_existing=True
    )

    scheduler.add_job(
        job_premium_due_alerts,
        IntervalTrigger(hours=12),
        id="premium_alerts",
        name="Premium Due Alerts",
        replace_existing=True
    )


    scheduler.start()
    print("✅ [SCHEDULER] Started — weather poll every 15 min")


def stop_scheduler():
    scheduler.shutdown()
    print("🛑 [SCHEDULER] Stopped")

from servicenow_client import create_premium_due_alert

# ── Job 5: Premium due alerts ─────────────────────────────────────────────────
async def job_premium_due_alerts():
    """Fire ServiceNow alert for every premium due within 24 hours"""
    db = SessionLocal()
    try:
        tomorrow = datetime.utcnow() + timedelta(hours=24)
        due_soon = db.query(Policy).filter(
            Policy.status == "active",
            Policy.next_payment_due <= tomorrow
        ).all()

        for policy in due_soon:
            rider = db.query(Rider).filter(
                Rider.id == policy.rider_id
            ).first()
            if rider:
                await create_premium_due_alert(
                    rider_id=rider.id,
                    name=rider.name,
                    phone=rider.phone,
                    upi_id=rider.upi_id,
                    amount=policy.weekly_premium,
                    due_date=policy.next_payment_due.strftime("%Y-%m-%d")
                )
                print(f"💰 Premium alert sent for {rider.name} — ₹{policy.weekly_premium}")

    except Exception as e:
        print(f"⚠️ [SCHEDULER] Premium alert error: {e}")
    finally:
        db.close()
