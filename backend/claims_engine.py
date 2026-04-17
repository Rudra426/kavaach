from sqlalchemy.orm import Session
from database import SessionLocal
from models import Rider, Policy, Claim, TriggerEvent, Payout
from datetime import datetime
import json, hashlib

with open("pincode_risk_map.json") as f:
    PINCODE_DATA = json.load(f)

def mock_platform_check(rider: Rider) -> dict:
    seed_str = f"{rider.id}:{datetime.utcnow().strftime('%Y-%m-%d')}"
    seed_int = int(hashlib.sha256(seed_str.encode()).hexdigest(), 16)
    last_active = 5 + (seed_int % 176)
    orders = 4 + ((seed_int >> 8) % 13)
    return {
        "rider_id": rider.id,
        "last_active_minutes_ago": last_active,
        "orders_assigned_today": orders,
        "last_location_pincode": rider.pincode,
        "current_order_status": "active"
    }

def calculate_fraud_score(rider: Rider, trigger: TriggerEvent, platform_data: dict) -> float:
    score = 0.0
    mins = platform_data.get("last_active_minutes_ago", 999)
    if mins > 180: score += 25
    elif mins > 60: score += 10
    orders = platform_data.get("orders_assigned_today", 0)
    if orders == 0: score += 20
    elif orders < 3: score += 8
    if platform_data.get("last_location_pincode") != rider.pincode:
        score += 20
    if rider.experience_years < 0.5: score += 10
    elif rider.experience_years < 1: score += 5
    db = SessionLocal()
    try:
        recent_claims = db.query(Claim).filter(Claim.rider_id == rider.id).count()
        if recent_claims > 5: score += 15
        elif recent_claims > 2: score += 5
    finally:
        db.close()
    if trigger.severity and trigger.severity > 1.5:
        score = max(0, score - 10)
    return round(min(score, 100), 2)

def assign_tier(fraud_score: float) -> str:
    if fraud_score <= 30: return "GREEN"
    if fraud_score <= 65: return "YELLOW"
    return "RED"

def calculate_payout(policy: Policy, tier: str) -> dict:
    base_payout = round(policy.weekly_premium * 3, 2)
    cap = policy.coverage_amount / 52
    payout = min(base_payout, cap)
    if tier == "GREEN":
        return {"immediate": round(payout, 2), "held": 0.0}
    elif tier == "YELLOW":
        return {"immediate": round(payout * 0.6, 2), "held": round(payout * 0.4, 2)}
    return {"immediate": 0.0, "held": round(payout, 2)}

def process_trigger_for_riders(trigger_id: str):
    db: Session = SessionLocal()
    results = []
    try:
        trigger = db.query(TriggerEvent).filter(TriggerEvent.id == trigger_id).first()
        if not trigger:
            return {"error": "Trigger not found"}
        riders = db.query(Rider).filter(Rider.pincode == trigger.pincode).all()
        for rider in riders:
            policy = db.query(Policy).filter(Policy.rider_id == rider.id, Policy.status == "active").first()
            if not policy:
                continue
            existing = db.query(Claim).filter(Claim.rider_id == rider.id, Claim.trigger_id == trigger_id).first()
            if existing:
                continue
            platform_data = mock_platform_check(rider)
            fraud_score = calculate_fraud_score(rider, trigger, platform_data)
            tier = assign_tier(fraud_score)
            payout_split = calculate_payout(policy, tier)
            claim = Claim(rider_id=rider.id, policy_id=policy.id, trigger_id=trigger_id, fraud_score=fraud_score, tier=tier, status="approved" if tier in ["GREEN", "YELLOW"] else "review", payout_amount=payout_split["immediate"], held_amount=payout_split["held"])
            db.add(claim)
            db.flush()
            if payout_split["immediate"] > 0:
                db.add(Payout(claim_id=claim.id, rider_id=rider.id, upi_id=rider.upi_id, amount=payout_split["immediate"], status="pending", payout_type="full" if tier == "GREEN" else "partial"))
            if tier == "RED" and payout_split["held"] > 0:
                db.add(Payout(claim_id=claim.id, rider_id=rider.id, upi_id=rider.upi_id, amount=payout_split["held"], status="held", payout_type="held_red"))
            results.append({"rider_id": rider.id, "rider_name": rider.name, "claim_id": claim.id, "fraud_score": fraud_score, "tier": tier, "payout_amount": payout_split["immediate"], "held_amount": payout_split["held"]})
        db.commit()
    except Exception as e:
        db.rollback()
        return {"error": str(e)}
    finally:
        db.close()
    return {"triggered": len(results), "claims": results}
