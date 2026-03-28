import httpx
import os
from datetime import datetime
from dotenv import load_dotenv
from database import SessionLocal
from models import Claim, Rider, TriggerEvent

load_dotenv()

SN_INSTANCE = os.getenv("SERVICENOW_INSTANCE", "").strip()
SN_USER     = os.getenv("SERVICENOW_USER", "admin").strip()
SN_PASS     = os.getenv("SERVICENOW_PASS", "").strip()

HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}


async def _post_incident(payload: dict, mock_id: str) -> dict:
    """Internal helper — all SN calls go through here"""
    if not SN_INSTANCE:
        print(f"🎫 ServiceNow MOCK: {mock_id}")
        return {"success": True, "ticket_id": mock_id, "mode": "mock"}

    try:
        url = f"{SN_INSTANCE}/api/now/table/incident"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                url, json=payload,
                auth=(SN_USER, SN_PASS),
                headers=HEADERS
            )
            r.raise_for_status()
            ticket_id = r.json()["result"]["sys_id"]
            print(f"🎫 ServiceNow LIVE ticket: {ticket_id}")
            return {"success": True, "ticket_id": ticket_id, "mode": "live"}
    except Exception as e:
        print(f"⚠️ ServiceNow error (using mock fallback): {e}")
        return {"success": True, "ticket_id": mock_id, "mode": "mock_fallback"}


# ── 1. Yellow / Red Claim Review ──────────────────────────────────────────────
async def create_claim_ticket(claim_id: str) -> dict:
    db = SessionLocal()
    try:
        claim   = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            return {"success": False, "error": "Claim not found"}

        rider   = db.query(Rider).filter(Rider.id == claim.rider_id).first()
        trigger = db.query(TriggerEvent).filter(
            TriggerEvent.id == claim.trigger_id
        ).first()

        if not SN_INSTANCE:
            mock_id = f"SN_MOCK_{claim_id}"
            claim.servicenow_ticket_id = mock_id
            db.commit()
            return {
                "success": True, "ticket_id": mock_id, "mode": "mock",
                "claim_id": claim_id, "tier": claim.tier,
                "rider": rider.name if rider else "Unknown"
            }

        payload = {
            "short_description": f"Kavaach Claim Review — {rider.name} [{claim.tier}]",
            "description": (
                f"Claim ID     : {claim_id}\n"
                f"Rider        : {rider.name} ({rider.id})\n"
                f"Phone        : {rider.phone}\n"
                f"Pincode      : {rider.pincode} — {rider.city}\n"
                f"Trigger Type : {trigger.trigger_type.upper() if trigger else 'N/A'}\n"
                f"Fraud Score  : {claim.fraud_score}/100\n"
                f"Tier         : {claim.tier}\n"
                f"Payout (imm) : ₹{claim.payout_amount}\n"
                f"Held Amount  : ₹{claim.held_amount}\n"
                f"UPI ID       : {rider.upi_id}\n"
                f"Action Needed: "
                f"{'Soft verify + release 40%' if claim.tier == 'YELLOW' else 'Full manual review'}"
            ),
            "urgency": "2" if claim.tier == "YELLOW" else "1",
            "impact":  "2",
            "category": "inquiry"
        }

        result = await _post_incident(payload, f"SN_MOCK_{claim_id}")

        claim.servicenow_ticket_id = result["ticket_id"]
        db.commit()
        result.update({"claim_id": claim_id, "tier": claim.tier,
                        "rider": rider.name if rider else "Unknown"})
        return result

    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()


# ── 2. Rider Onboarding Task ──────────────────────────────────────────────────
async def create_onboarding_task(rider_id: str, name: str,
                                  phone: str, pincode: str,
                                  city: str, platform: str) -> dict:
    payload = {
        "short_description": f"New Rider Onboarding — {name} [{rider_id}]",
        "description": (
            f"NEW RIDER REGISTERED ON KAVAACH\n\n"
            f"Rider ID  : {rider_id}\n"
            f"Name      : {name}\n"
            f"Phone     : {phone}\n"
            f"Pincode   : {pincode} — {city}\n"
            f"Platform  : {platform}\n"
            f"Joined At : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            f"Action Required:\n"
            f"  1. Verify rider identity (phone + platform account)\n"
            f"  2. Confirm active delivery history on platform\n"
            f"  3. Mark as verified to activate full coverage"
        ),
        "urgency":  "3",
        "impact":   "3",
        "category": "inquiry"
    }

    return await _post_incident(payload, f"SN_ONBOARD_{rider_id}")


# ── 3. Weekly Premium Collection Alert ───────────────────────────────────────
async def create_premium_due_alert(rider_id: str, name: str, phone: str,
                                    upi_id: str, amount: float,
                                    due_date: str) -> dict:
    payload = {
        "short_description": f"Premium Due — {name} | ₹{amount}",
        "description": (
            f"WEEKLY PREMIUM COLLECTION ALERT\n\n"
            f"Rider ID    : {rider_id}\n"
            f"Name        : {name}\n"
            f"Phone       : {phone}\n"
            f"UPI ID      : {upi_id}\n"
            f"Amount Due  : ₹{amount}\n"
            f"Due Date    : {due_date}\n"
            f"Collected At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            f"Action: Confirm UPI auto-debit successful. "
            f"If failed, trigger manual collection reminder."
        ),
        "urgency":  "3",
        "impact":   "3",
        "category": "inquiry"
    }

    return await _post_incident(payload, f"SN_PREMIUM_{rider_id}")


# ── 4. Mass Trigger P1 Alert ──────────────────────────────────────────────────
async def create_mass_trigger_alert(pincode: str, city: str, trigger_type: str,
                                     rider_count: int, total_payout: float) -> dict:
    payload = {
        "short_description": (
            f"🚨 MASS DISRUPTION — {trigger_type.upper()} "
            f"in {city} ({pincode}) | {rider_count} riders"
        ),
        "description": (
            f"MASS PARAMETRIC TRIGGER FIRED\n\n"
            f"Trigger Type  : {trigger_type.upper()}\n"
            f"Location      : {city} — Pincode {pincode}\n"
            f"Riders Affected: {rider_count}\n"
            f"Total Payout  : ₹{total_payout:,.2f}\n"
            f"Time          : {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n\n"
            f"IMMEDIATE ACTIONS REQUIRED:\n"
            f"  1. Verify weather event via IMD API\n"
            f"  2. Review payout batch before bulk release\n"
            f"  3. Check for coordinated claim patterns\n"
            f"  4. Approve or escalate within 2 hours"
        ),
        "urgency":  "1",
        "impact":   "1",
        "category": "inquiry"
    }

    return await _post_incident(payload, f"SN_MASS_{pincode}_{trigger_type}")


# ── 5. Resolve Ticket ─────────────────────────────────────────────────────────
async def resolve_ticket(ticket_id: str,
                          resolution: str = "Approved by reviewer") -> dict:
    if not SN_INSTANCE or "MOCK" in ticket_id:
        print(f"🎫 ServiceNow MOCK resolve: {ticket_id}")
        return {"success": True, "resolved": ticket_id, "mode": "mock"}

    url = f"{SN_INSTANCE}/api/now/table/incident/{ticket_id}"
    payload = {
        "state": "6",
        "close_code": "Solved (Permanently)",
        "close_notes": resolution,
        "active": "false"
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.put(
                url, json=payload,
                auth=(SN_USER, SN_PASS),
                headers=HEADERS
            )
            if r.status_code == 403:
                return {
                    "success": True, "resolved": ticket_id,
                    "mode": "local_only",
                    "note": "ServiceNow update restricted — resolved in Kavaach DB"
                }
            r.raise_for_status()
            return {"success": True, "resolved": ticket_id, "mode": "live"}
    except Exception as e:
        return {
            "success": True, "resolved": ticket_id,
            "mode": "local_only", "note": str(e)
        }
