import httpx
import os
from datetime import datetime
from dotenv import load_dotenv
from database import SessionLocal
from models import Claim, Rider, TriggerEvent

load_dotenv()
SN_INSTANCE = os.getenv("SERVICENOW_INSTANCE", "").strip()
SN_USER = os.getenv("SERVICENOW_USER", "admin").strip()
SN_PASS = os.getenv("SERVICENOW_PASS", "").strip()
HEADERS = {"Content-Type": "application/json", "Accept": "application/json"}

async def _post_incident(payload: dict, mock_id: str) -> dict:
    if not SN_INSTANCE:
        return {"success": True, "ticket_id": mock_id, "mode": "mock"}
    try:
        url = f"{SN_INSTANCE}/api/now/table/incident"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(url, json=payload, auth=(SN_USER, SN_PASS), headers=HEADERS)
            r.raise_for_status()
            ticket_id = r.json()["result"]["sys_id"]
            return {"success": True, "ticket_id": ticket_id, "mode": "live"}
    except Exception:
        return {"success": True, "ticket_id": mock_id, "mode": "mock_fallback"}

async def create_claim_ticket(claim_id: str) -> dict:
    db = SessionLocal()
    try:
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim:
            return {"success": False, "error": "Claim not found"}
        rider = db.query(Rider).filter(Rider.id == claim.rider_id).first()
        trigger = db.query(TriggerEvent).filter(TriggerEvent.id == claim.trigger_id).first()
        mock_id = f"SN_MOCK_{claim_id}"
        payload = {
            "short_description": f"Kavaach Claim Review — {rider.name if rider else 'Unknown'} [{claim.tier}]",
            "description": f"Claim ID: {claim_id}
Rider: {rider.name if rider else 'Unknown'}
Pincode: {rider.pincode if rider else 'N/A'}
Trigger: {trigger.trigger_type if trigger else 'N/A'}
Fraud Score: {claim.fraud_score}/100
Tier: {claim.tier}
Held Amount: ₹{claim.held_amount}",
            "urgency": "1" if claim.tier == "RED" else "2",
            "impact": "1" if claim.tier == "RED" else "2",
            "category": "inquiry"
        }
        result = await _post_incident(payload, mock_id)
        claim.servicenow_ticket_id = result["ticket_id"]
        db.commit()
        result.update({"claim_id": claim_id, "tier": claim.tier, "rider": rider.name if rider else "Unknown"})
        return result
    except Exception as e:
        db.rollback()
        return {"success": False, "error": str(e)}
    finally:
        db.close()

async def create_onboarding_task(rider_id: str, name: str, phone: str, pincode: str, city: str, platform: str) -> dict:
    payload = {
        "short_description": f"New Rider Onboarding — {name} [{rider_id}]",
        "description": f"Rider ID: {rider_id}
Name: {name}
Phone: {phone}
Pincode: {pincode} — {city}
Platform: {platform}
Joined At: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "urgency": "3",
        "impact": "3",
        "category": "inquiry"
    }
    return await _post_incident(payload, f"SN_ONBOARD_{rider_id}")

async def create_premium_due_alert(rider_id: str, name: str, phone: str, upi_id: str, amount: float, due_date: str) -> dict:
    payload = {
        "short_description": f"Premium Due — {name} | ₹{amount}",
        "description": f"Rider ID: {rider_id}
Name: {name}
Phone: {phone}
UPI ID: {upi_id}
Amount Due: ₹{amount}
Due Date: {due_date}",
        "urgency": "3",
        "impact": "3",
        "category": "inquiry"
    }
    return await _post_incident(payload, f"SN_PREMIUM_{rider_id}")

async def create_mass_trigger_alert(pincode: str, city: str, trigger_type: str, rider_count: int, total_payout: float) -> dict:
    payload = {
        "short_description": f"MASS DISRUPTION — {trigger_type.upper()} in {city} ({pincode}) | {rider_count} riders",
        "description": f"Trigger: {trigger_type.upper()}
Location: {city} — {pincode}
Riders Affected: {rider_count}
Total Payout: ₹{total_payout:,.2f}
Time: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}",
        "urgency": "1",
        "impact": "1",
        "category": "inquiry"
    }
    return await _post_incident(payload, f"SN_MASS_{pincode}_{trigger_type}")

async def resolve_ticket(ticket_id: str, resolution: str = "Approved by reviewer") -> dict:
    if not SN_INSTANCE or "MOCK" in ticket_id:
        return {"success": True, "resolved": ticket_id, "mode": "mock"}
    url = f"{SN_INSTANCE}/api/now/table/incident/{ticket_id}"
    payload = {"state": "6", "close_code": "Solved (Permanently)", "close_notes": resolution, "active": "false"}
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.put(url, json=payload, auth=(SN_USER, SN_PASS), headers=HEADERS)
            if r.status_code == 403:
                return {"success": True, "resolved": ticket_id, "mode": "local_only", "note": "ServiceNow update restricted"}
            r.raise_for_status()
            return {"success": True, "resolved": ticket_id, "mode": "live"}
    except Exception as e:
        return {"success": True, "resolved": ticket_id, "mode": "local_only", "note": str(e)}
