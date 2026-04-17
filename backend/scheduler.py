import asyncio
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timedelta
from database import SessionLocal
from models import TriggerEvent, Policy, Rider, Claim, Payout
from weather_service import poll_all_pincodes
from claims_engine import process_trigger_for_riders
from payout_service import process_payout
from servicenow_client import create_claim_ticket, create_premium_due_alert
from main import calculate_premium


scheduler = AsyncIOScheduler()


async def job_process_trigger(trigger_id: str):
    try:
        result = process_trigger_for_riders(trigger_id)
        claims = result.get("claims", [])
        for claim in claims:
            claim_id = claim["claim_id"]
            tier = claim["tier"]
            if tier == "GREEN":
                process_payout(claim_id)
            elif tier == "YELLOW":
                process_payout(claim_id)
                await create_claim_ticket(claim_id)
            else:
                await create_claim_ticket(claim_id)
    except Exception as e:
        print(f"⚠️ [SCHEDULER] Trigger process error: {e}")



async def job_poll_weather():
    print(f"\n⏰ [SCHEDULER] Weather poll — {datetime.now().strftime('%H:%M:%S')}")  # ✅ FIXED
    try:
        fired_triggers = await poll_all_pincodes()
        for trigger in fired_triggers:
            await job_process_trigger(trigger["trigger_id"])
    except Exception as e:
        print(f"⚠️ [SCHEDULER] Weather poll error: {e}")


async def job_resolve_stale_triggers():
    db = SessionLocal()
    try:
        cutoff = datetime.utcnow() - timedelta(hours=6)
        stale = db.query(TriggerEvent).filter(TriggerEvent.status == "active", TriggerEvent.fired_at < cutoff).all()
        for t in stale:
            t.status = "resolved"
            t.resolved_at = datetime.utcnow()
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ [SCHEDULER] Stale trigger cleanup error: {e}")
    finally:
        db.close()


async def job_weekly_renewal():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        due_policies = db.query(Policy).filter(Policy.status == "active", Policy.next_payment_due <= now).all()
        for policy in due_policies:
            week_ago = now - timedelta(days=7)
            had_claim = db.query(Claim).filter(Claim.policy_id == policy.id, Claim.created_at >= week_ago, Claim.status.in_(["paid", "partial_paid"])).first()
            if not had_claim:
                policy.no_claim_weeks = min(policy.no_claim_weeks + 1, 5)
            else:
                policy.no_claim_weeks = 0
            rider = db.query(Rider).filter(Rider.id == policy.rider_id).first()
            if rider:
                new_premium = calculate_premium(rider.pincode, rider.weekly_earnings, rider.platform.split(","), rider.delivery_type, rider.cold_chain, rider.medicine_type, rider.experience_years, rider.avg_deliveries_per_day, policy.no_claim_weeks)
                policy.weekly_premium = new_premium["weekly_premium"]
                policy.coverage_amount = new_premium["coverage_amount"]
                policy.next_payment_due = now + timedelta(days=7)
        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ [SCHEDULER] Renewal error: {e}")
    finally:
        db.close()


async def job_premium_due_alerts():
    db = SessionLocal()
    try:
        tomorrow = datetime.utcnow() + timedelta(hours=24)
        due_soon = db.query(Policy).filter(Policy.status == "active", Policy.next_payment_due <= tomorrow).all()
        for policy in due_soon:
            rider = db.query(Rider).filter(Rider.id == policy.rider_id).first()
            if rider:
                await create_premium_due_alert(rider.id, rider.name, rider.phone, rider.upi_id, policy.weekly_premium, policy.next_payment_due.strftime("%Y-%m-%d"))
    except Exception as e:
        print(f"⚠️ [SCHEDULER] Premium alert error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(job_poll_weather, IntervalTrigger(minutes=15), id="weather_poll", replace_existing=True)
    scheduler.add_job(job_resolve_stale_triggers, IntervalTrigger(hours=1), id="stale_triggers", replace_existing=True)
    scheduler.add_job(job_weekly_renewal, IntervalTrigger(hours=24), id="weekly_renewal", replace_existing=True)
    scheduler.add_job(job_premium_due_alerts, IntervalTrigger(hours=12), id="premium_alerts", replace_existing=True)
    scheduler.start()
    print("✅ [SCHEDULER] Started")


def stop_scheduler():
    scheduler.shutdown()
    print("🛑 [SCHEDULER] Stopped")

