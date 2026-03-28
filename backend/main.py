from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import engine, get_db
from models import Base, Rider, Policy, Claim, TriggerEvent, Payout
import json, pickle, numpy as np, pandas as pd
from premium_service import (
    create_subscription_plan, create_subscription, create_payment_link
)

# ── Init DB ───────────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Kavaach API v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# ── Load assets ───────────────────────────────────────────────────────────────
with open("pincode_risk_map.json") as f:
    PINCODE_DATA = json.load(f)

MODEL, MODEL_META = None, {}
try:
    with open("model.pkl", "rb") as f:
        MODEL = pickle.load(f)
    with open("model_meta.json") as f:
        MODEL_META = json.load(f)
    print(f"✅ Model loaded — R²: {MODEL_META.get('r2')}, MAE: ₹{MODEL_META.get('mae')}")
except Exception as e:
    print(f"⚠️ Model not found: {e}")

# ── Encodings ─────────────────────────────────────────────────────────────────
DELIVERY_ENC = {"scheduled": 0, "same_day": 1, "hyperlocal": 2}
ZONE_ENC     = {"residential": 0, "commercial": 1, "industrial": 2, "hospital_adjacent": 3}
PLATFORM_ENC = {"pharmeasy": 0, "netmeds": 1, "tata1mg": 2, "apollo24x7": 3, "phonepe": 4}

# ── Helpers ───────────────────────────────────────────────────────────────────
def compute_risk_score(data: dict) -> float:
    flood   = data.get("flood_risk", 0)
    heat    = data.get("heat_risk", 0)
    aqi     = data.get("aqi_risk", 0)
    cyclone = data.get("cyclone_risk", 0)
    coastal = data.get("coastal_zone", 0) * 0.1
    weighted = (flood * 2.5) + (heat * 1.0) + (aqi * 1.0) + (cyclone * 1.5) + coastal
    return round(max(1.0, min(5.0, (weighted / 6.1) * 5)), 2)

def risk_label(score: float) -> str:
    if score <= 2.0: return "Low"
    if score <= 3.5: return "Medium"
    return "High"

def get_seasonal_index(month: int) -> float:
    return {1:0.35,2:0.30,3:0.40,4:0.50,5:0.55,
            6:0.75,7:0.90,8:1.00,9:0.85,10:0.60,
            11:0.45,12:0.35}.get(month, 0.5)

def calculate_premium(pincode, weekly_earnings, platforms, delivery_type,
                       cold_chain, medicine_type, experience_years,
                       avg_deliveries_per_day, no_claim_weeks) -> dict:
    pincode_data = PINCODE_DATA.get(pincode, {})
    risk_score   = compute_risk_score(pincode_data) if pincode_data else 3.0
    zone         = pincode_data.get("zone", "residential")
    month        = datetime.now().month

    cold_chain_mult = 1.0
    if cold_chain:
        cold_chain_mult = {"insulin":1.35,"vaccine":1.30,
                           "biologic":1.40,"regular_cold":1.20}.get(medicine_type, 1.25)

    no_claim_discount = min(no_claim_weeks * 0.03, 0.20)

    if MODEL:
        priority = {"phonepe":4,"apollo24x7":3,"tata1mg":2,"netmeds":1,"pharmeasy":0}
        best_plat = max([p.lower() for p in platforms], key=lambda p: priority.get(p, 0))
        plat_enc  = PLATFORM_ENC.get(best_plat, 0)
        delivery_enc = DELIVERY_ENC.get(
            delivery_type.lower().replace(" ","_").replace("-","_").split("(")[0].strip(), 1)
        zone_enc = ZONE_ENC.get(zone, 0)

        features = [[
            weekly_earnings, avg_deliveries_per_day, 0, 0.75,
            experience_years * 12, 1 if len(platforms) > 1 else 0,
            1 if cold_chain else 0,
            pincode_data.get("flood_risk", 0.3), pincode_data.get("heat_risk", 0.5),
            pincode_data.get("aqi_risk", 0.5),   pincode_data.get("cyclone_risk", 0.1),
            pincode_data.get("coastal_zone", 0),
            get_seasonal_index(month), month, no_claim_weeks, no_claim_discount,
            delivery_enc, zone_enc, plat_enc
        ]]
        df = pd.DataFrame(features, columns=MODEL_META.get("features", []))
        base = float(MODEL.predict(df)[0])
    else:
        base = weekly_earnings * 0.04

    platform_mult = 1.0 + (len(platforms) - 1) * 0.05
    raw   = base * cold_chain_mult * platform_mult
    cap   = weekly_earnings * 0.15
    final = round(min(raw, cap), 2)

    return {
        "weekly_premium":  final,
        "monthly_premium": round(final * 4.33, 2),
        "annual_premium":  round(final * 52, 2),
        "coverage_amount": round(final * 52 * 10, 2),
        "risk_score":      risk_score,
        "risk_level":      risk_label(risk_score),
        "cap_applied":     raw > cap,
        "city":            pincode_data.get("city", ""),
        "area":            pincode_data.get("area", ""),
        "zone":            zone
    }

# ── Pydantic Schemas ──────────────────────────────────────────────────────────
class RegisterInput(BaseModel):
    name: str
    phone: str
    upi_id: str
    pincode: str
    platforms: list[str]
    delivery_type: str
    weekly_earnings: float
    experience_years: float = 1.0
    cold_chain: bool = False
    medicine_type: str = "regular_cold"
    avg_deliveries_per_day: int = 10

class PremiumInput(BaseModel):
    pincode: str
    weekly_earnings: float
    platforms: list[str]
    delivery_type: str
    cold_chain: bool
    medicine_type: str = "regular_cold"
    experience_years: float = 1.0
    avg_deliveries_per_day: int = 10
    no_claim_weeks: int = 0

# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
def home():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/health")
def health():
    return {
        "status": "ready",
        "message": "Kavaach API v2 ✅",
        "model_loaded": MODEL is not None,
        "pincodes_loaded": len(PINCODE_DATA),
        "model_r2": MODEL_META.get("r2"),
        "model_mae": MODEL_META.get("mae")
    }

# ── Predict (Phase 1 — keep working) ─────────────────────────────────────────
@app.post("/predict")
def predict_premium(data: PremiumInput):
    return calculate_premium(
        data.pincode, data.weekly_earnings, data.platforms,
        data.delivery_type, data.cold_chain, data.medicine_type,
        data.experience_years, data.avg_deliveries_per_day, data.no_claim_weeks
    )

# ── Pincode lookup ────────────────────────────────────────────────────────────
@app.get("/pincode/{pincode}")
def get_pincode(pincode: str):
    data = PINCODE_DATA.get(pincode)
    if not data:
        return {"found": False, "risk_score": 3.0, "risk_level": "Medium",
                "area": "Unknown", "city": "Unknown", "zone": "residential", "risks": {}}
    score = compute_risk_score(data)
    return {
        "found": True, "risk_score": score, "risk_level": risk_label(score),
        "area": data.get("area",""), "city": data.get("city",""),
        "zone": data.get("zone","residential"),
        "risks": {
            "flood": data.get("flood_risk",0), "heat": data.get("heat_risk",0),
            "aqi": data.get("aqi_risk",0),     "cyclone": data.get("cyclone_risk",0),
            "coastal": data.get("coastal_zone",0)
        }
    }

# ── Registration ──────────────────────────────────────────────────────────────
@app.post("/register")
async def register_rider(data: RegisterInput, db: Session = Depends(get_db)):
        # Check duplicate phone
    existing = db.query(Rider).filter(Rider.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")

    pincode_data = PINCODE_DATA.get(data.pincode, {})

    # Create rider
    rider = Rider(
        name=data.name, phone=data.phone, upi_id=data.upi_id,
        pincode=data.pincode, city=pincode_data.get("city",""),
        platform=",".join(data.platforms),
        delivery_type=data.delivery_type,
        weekly_earnings=data.weekly_earnings,
        experience_years=data.experience_years,
        cold_chain=data.cold_chain,
        medicine_type=data.medicine_type,
        avg_deliveries_per_day=data.avg_deliveries_per_day
    )
    db.add(rider)
    db.flush()

    # Calculate premium
    premium_data = calculate_premium(
        data.pincode, data.weekly_earnings, data.platforms,
        data.delivery_type, data.cold_chain, data.medicine_type,
        data.experience_years, data.avg_deliveries_per_day, no_claim_weeks=0
    )

    # Create policy
    policy = Policy(
        rider_id=rider.id,
        weekly_premium=premium_data["weekly_premium"],
        coverage_amount=premium_data["coverage_amount"],
        status="active",
        no_claim_weeks=0,
        next_payment_due=datetime.utcnow() + timedelta(days=7)
    )
    db.add(policy)
    db.commit()# After db.commit() in /register
    import asyncio
    from servicenow_client import create_onboarding_task
    asyncio.ensure_future(create_onboarding_task(
        rider_id=rider.id,
        name=rider.name,
        phone=rider.phone,
        pincode=rider.pincode,
        city=rider.city,
        platform=rider.platform
    ))


    
    db.refresh(rider)
    db.refresh(policy)

    return {
        "success": True,
        "rider_id": rider.id,
        "policy_id": policy.id,
        "name": rider.name,
        "city": rider.city,
        "weekly_premium": policy.weekly_premium,
        "coverage_amount": policy.coverage_amount,
        "next_payment_due": policy.next_payment_due,
        "risk_score": premium_data["risk_score"],
        "risk_level": premium_data["risk_level"],
        "message": f"Welcome to Kavaach, {rider.name}! Your policy is active."
    }

# ── Policy ────────────────────────────────────────────────────────────────────
@app.get("/policy/{rider_id}")
def get_policy(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found")

    return {
        "policy_id": policy.id,
        "rider_id": rider.id,
        "name": rider.name,
        "phone": rider.phone,
        "pincode": rider.pincode,
        "city": rider.city,
        "platform": rider.platform,
        "delivery_type": rider.delivery_type,
        "weekly_premium": policy.weekly_premium,
        "coverage_amount": policy.coverage_amount,
        "status": policy.status,
        "no_claim_weeks": policy.no_claim_weeks,
        "next_payment_due": policy.next_payment_due,
        "start_date": policy.start_date
    }

# ── Dashboard ─────────────────────────────────────────────────────────────────
@app.get("/dashboard/{rider_id}")
def get_dashboard(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()

    claims = db.query(Claim).filter(Claim.rider_id == rider_id)\
               .order_by(Claim.created_at.desc()).limit(10).all()

    active_triggers = db.query(TriggerEvent).filter(
        TriggerEvent.pincode == rider.pincode,
        TriggerEvent.status == "active"
    ).all()

    return {
        "rider": {
            "id": rider.id, "name": rider.name,
            "pincode": rider.pincode, "city": rider.city,
            "platform": rider.platform
        },
        "policy": {
            "id": policy.id if policy else None,
            "status": policy.status if policy else "none",
            "weekly_premium": policy.weekly_premium if policy else 0,
            "coverage_amount": policy.coverage_amount if policy else 0,
            "no_claim_weeks": policy.no_claim_weeks if policy else 0,
            "next_payment_due": policy.next_payment_due if policy else None
        },
        "claims": [
            {
                "id": c.id, "trigger_id": c.trigger_id,
                "fraud_score": c.fraud_score, "tier": c.tier,
                "status": c.status, "payout_amount": c.payout_amount,
                "created_at": c.created_at
            } for c in claims
        ],
        "active_triggers": [
            {
                "id": t.id, "type": t.trigger_type,
                "severity": t.severity, "fired_at": t.fired_at
            } for t in active_triggers
        ],
        "weather_alert": len(active_triggers) > 0
    }

# ── Admin ─────────────────────────────────────────────────────────────────────
@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    total_riders   = db.query(Rider).count()
    active_policies = db.query(Policy).filter(Policy.status == "active").count()
    total_claims   = db.query(Claim).count()
    total_payouts  = db.query(Payout).count()
    paid_amount    = db.query(Payout).filter(Payout.status == "processed").all()
    total_paid     = sum(p.amount for p in paid_amount)

    return {
        "total_riders": total_riders,
        "active_policies": active_policies,
        "total_claims": total_claims,
        "total_payouts": total_payouts,
        "total_paid_amount": round(total_paid, 2)
    }

@app.get("/admin/claims")
def admin_claims(db: Session = Depends(get_db)):
    claims = db.query(Claim).order_by(Claim.created_at.desc()).all()
    return [
        {
            "id": c.id, "rider_id": c.rider_id, "policy_id": c.policy_id,
            "fraud_score": c.fraud_score, "tier": c.tier,
            "status": c.status, "payout_amount": c.payout_amount,
            "held_amount": c.held_amount,
            "servicenow_ticket_id": c.servicenow_ticket_id,
            "created_at": c.created_at
        } for c in claims
    ]

@app.get("/admin/riders")
def admin_riders(db: Session = Depends(get_db)):
    riders = db.query(Rider).all()
    return [
        {
            "id": r.id, "name": r.name, "phone": r.phone,
            "pincode": r.pincode, "city": r.city,
            "platform": r.platform, "weekly_earnings": r.weekly_earnings,
            "created_at": r.created_at
        } for r in riders
    ]

@app.get("/admin/heatmap")
def admin_heatmap(db: Session = Depends(get_db)):
    result = []
    for pincode, data in PINCODE_DATA.items():
        active_riders = db.query(Rider).filter(Rider.pincode == pincode).count()
        active_triggers = db.query(TriggerEvent).filter(
            TriggerEvent.pincode == pincode,
            TriggerEvent.status == "active"
        ).count()
        result.append({
            "pincode": pincode,
            "city": data.get("city", ""),
            "area": data.get("area", ""),
            "risk_score": compute_risk_score(data),
            "active_riders": active_riders,
            "active_triggers": active_triggers,
            "flood_risk": data.get("flood_risk", 0),
            "heat_risk": data.get("heat_risk", 0),
            "aqi_risk": data.get("aqi_risk", 0)
        })
    return result

from weather_service import poll_all_pincodes
from claims_engine import process_trigger_for_riders

# ── Manual trigger (for demo) ─────────────────────────────────────────────────
@app.post("/trigger/manual")
async def manual_trigger(pincode: str, trigger_type: str, actual_value: float,
                         db: Session = Depends(get_db)):
    """Fire a test trigger manually — use this for demo"""
    thresholds = {"flood": 75, "heat": 43, "aqi": 200, "cyclone": 60}
    threshold  = thresholds.get(trigger_type, 75)

    event = TriggerEvent(
        pincode=pincode, trigger_type=trigger_type,
        severity=round(actual_value / threshold, 2),
        threshold_value=threshold, actual_value=actual_value,
        status="active"
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    # Immediately process claims for this trigger
    result = process_trigger_for_riders(event.id)
    return {"trigger_id": event.id, "trigger_type": trigger_type,
            "pincode": pincode, "claims_result": result}

@app.get("/triggers/active")
def active_triggers(db: Session = Depends(get_db)):
    triggers = db.query(TriggerEvent).filter(
        TriggerEvent.status == "active"
    ).order_by(TriggerEvent.fired_at.desc()).all()
    return [{"id": t.id, "pincode": t.pincode, "type": t.trigger_type,
             "severity": t.severity, "actual_value": t.actual_value,
             "fired_at": t.fired_at} for t in triggers]

@app.post("/weather/poll")
async def force_weather_poll():
    """Manually trigger a weather poll — for testing"""
    result = await poll_all_pincodes()
    return {"polled": True, "triggers_fired": result}

from payout_service import process_payout, release_held_payout
from servicenow_client import create_claim_ticket, resolve_ticket

# ── Payouts ───────────────────────────────────────────────────────────────────
@app.post("/payout/{claim_id}")
def fire_payout(claim_id: str):
    return process_payout(claim_id)

@app.post("/payout/release/{claim_id}")
def release_payout(claim_id: str):
    return release_held_payout(claim_id)

@app.get("/payouts/{rider_id}")
def rider_payouts(rider_id: str, db: Session = Depends(get_db)):
    payouts = db.query(Payout).filter(Payout.rider_id == rider_id).all()
    return [
        {
            "id": p.id, "claim_id": p.claim_id,
            "amount": p.amount, "upi_id": p.upi_id,
            "razorpay_payout_id": p.razorpay_payout_id,
            "status": p.status, "payout_type": p.payout_type,
            "created_at": p.created_at
        } for p in payouts
    ]

# ── ServiceNow ────────────────────────────────────────────────────────────────
@app.post("/servicenow/ticket/{claim_id}")
async def create_ticket(claim_id: str):
    return await create_claim_ticket(claim_id)

@app.post("/servicenow/resolve/{ticket_id}")
async def resolve_sn_ticket(ticket_id: str, resolution: str = "Approved by reviewer"):
    return await resolve_ticket(ticket_id, resolution)

# ── Admin approve/reject ──────────────────────────────────────────────────────
@app.post("/admin/approve/{claim_id}")
async def approve_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    result = release_held_payout(claim_id)
    if claim.servicenow_ticket_id:
        await resolve_ticket(claim.servicenow_ticket_id, "Manually approved by admin")
    return {"approved": True, "payout_result": result}

@app.post("/admin/reject/{claim_id}")
async def reject_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "rejected"
    claim.held_amount = 0
    db.commit()
    if claim.servicenow_ticket_id:
        await resolve_ticket(claim.servicenow_ticket_id, "Rejected after review")
    return {"rejected": True, "claim_id": claim_id}


from scheduler import start_scheduler, stop_scheduler

@app.on_event("startup")
async def startup():
    start_scheduler()
    print("🛡️ Kavaach API v2 ready")

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()


# ── Rider full profile ────────────────────────────────────────────────────────
@app.get("/rider/{rider_id}")
def get_rider_profile(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()

    total_claims = db.query(Claim).filter(Claim.rider_id == rider_id).count()
    paid_claims  = db.query(Claim).filter(
        Claim.rider_id == rider_id,
        Claim.status.in_(["paid", "partial_paid"])
    ).count()

    total_received = db.query(Payout).filter(
        Payout.rider_id == rider_id,
        Payout.status == "processed"
    ).all()
    total_amount = sum(p.amount for p in total_received)

    return {
        "rider_id":      rider.id,
        "name":          rider.name,
        "phone":         rider.phone,
        "upi_id":        rider.upi_id,
        "pincode":       rider.pincode,
        "city":          rider.city,
        "platform":      rider.platform,
        "delivery_type": rider.delivery_type,
        "weekly_earnings": rider.weekly_earnings,
        "cold_chain":    rider.cold_chain,
        "medicine_type": rider.medicine_type,
        "member_since":  rider.created_at,

        "policy": {
            "id":               policy.id if policy else None,
            "status":           policy.status if policy else "none",
            "weekly_premium":   policy.weekly_premium if policy else 0,
            "monthly_premium":  round(policy.weekly_premium * 4.33, 2) if policy else 0,
            "coverage_amount":  policy.coverage_amount if policy else 0,
            "no_claim_weeks":   policy.no_claim_weeks if policy else 0,
            "discount_percent": min((policy.no_claim_weeks * 3), 15) if policy else 0,
            "next_payment_due": policy.next_payment_due if policy else None,
            "start_date":       policy.start_date if policy else None,
            "days_until_due":   (policy.next_payment_due - datetime.utcnow()).days
                                 if policy and policy.next_payment_due else None
        },

        "stats": {
            "total_claims":    total_claims,
            "paid_claims":     paid_claims,
            "total_received":  round(total_amount, 2),
            "total_premium_paid": round(
                (policy.weekly_premium if policy else 0) *
                max(1, (datetime.utcnow() - rider.created_at).days // 7), 2
            )
        }
    }


# ── Live weather for rider's pincode ─────────────────────────────────────────
@app.get("/weather/{pincode}")
async def get_live_weather(pincode: str):
    from weather_service import fetch_weather, fetch_aqi, PINCODE_COORDS
    coords = PINCODE_COORDS.get(pincode)
    if not coords:
        raise HTTPException(status_code=404, detail="Pincode not in coverage area")

    lat, lon = coords
    try:
        weather = await fetch_weather(lat, lon)
        aqi     = await fetch_aqi(lat, lon)
        daily   = weather.get("daily", {})

        max_temp   = daily.get("temperature_2m_max",          [None])[0]
        max_precip = daily.get("precipitation_probability_max",[None])[0]
        max_wind   = daily.get("windspeed_10m_max",            [None])[0]

        # Risk alerts
        alerts = []
        if max_precip and max_precip >= 75:
            alerts.append({"type": "flood",   "message": "Heavy rain alert in your area", "severity": "high"})
        if max_temp and max_temp >= 43:
            alerts.append({"type": "heat",    "message": "Extreme heat advisory active",  "severity": "high"})
        if aqi and aqi >= 200:
            alerts.append({"type": "aqi",     "message": "Hazardous AQI — limit outdoor activity", "severity": "high"})
        if max_wind and max_wind >= 60:
            alerts.append({"type": "cyclone", "message": "High wind warning in your zone","severity": "critical"})

        pincode_data = PINCODE_DATA.get(pincode, {})

        return {
            "pincode":     pincode,
            "city":        pincode_data.get("city", ""),
            "area":        pincode_data.get("area", ""),
            "temperature": max_temp,
            "rainfall_probability": max_precip,
            "wind_speed":  max_wind,
            "aqi":         round(aqi, 1),
            "alerts":      alerts,
            "coverage_active": len(alerts) > 0,
            "last_updated": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Premium payment history ───────────────────────────────────────────────────
@app.get("/payments/{rider_id}")
def get_payment_history(rider_id: str, db: Session = Depends(get_db)):
    """Weekly premium deduction history"""
    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy")

    # Generate weekly payment history since policy start
    payments = []
    weeks_active = max(1, (datetime.utcnow() - policy.start_date).days // 7)
    current = policy.start_date

    for i in range(min(weeks_active + 1, 12)):  # last 12 weeks max
        payments.append({
            "week":        i + 1,
            "due_date":    (current + timedelta(days=7)).isoformat(),
            "amount":      policy.weekly_premium,
            "status":      "paid" if i < weeks_active else "due",
            "upi_ref":     f"KVP{policy.id}{i:03d}" if i < weeks_active else None
        })
        current += timedelta(days=7)

    return {
        "policy_id":     policy.id,
        "weekly_premium": policy.weekly_premium,
        "next_due":      policy.next_payment_due,
        "payments":      payments
    }


# ── Claim detail ──────────────────────────────────────────────────────────────
@app.get("/claim/{claim_id}")
def get_claim_detail(claim_id: str, db: Session = Depends(get_db)):
    claim   = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")

    trigger = db.query(TriggerEvent).filter(
        TriggerEvent.id == claim.trigger_id
    ).first()
    payout  = db.query(Payout).filter(Payout.claim_id == claim_id).all()

    return {
        "claim_id":     claim.id,
        "status":       claim.status,
        "tier":         claim.tier,
        "fraud_score":  claim.fraud_score,
        "payout_amount": claim.payout_amount,
        "held_amount":  claim.held_amount,
        "created_at":   claim.created_at,
        "resolved_at":  claim.resolved_at,
        "servicenow_ticket": claim.servicenow_ticket_id,

        "trigger": {
            "type":       trigger.trigger_type if trigger else None,
            "actual":     trigger.actual_value if trigger else None,
            "threshold":  trigger.threshold_value if trigger else None,
            "severity":   trigger.severity if trigger else None,
            "fired_at":   trigger.fired_at if trigger else None
        },

        "payouts": [
            {
                "amount":      p.amount,
                "type":        p.payout_type,
                "status":      p.status,
                "upi_ref":     p.razorpay_payout_id,
                "credited_at": p.created_at
            } for p in payout
        ],

        "tier_explanation": {
            "GREEN":  "Auto-paid immediately — all checks passed",
            "YELLOW": "60% paid immediately, 40% pending soft verification",
            "RED":    "Full hold — manual review in progress"
        }.get(claim.tier, "")
    }


# ── Notifications for rider ───────────────────────────────────────────────────
@app.get("/notifications/{rider_id}")
def get_notifications(rider_id: str, db: Session = Depends(get_db)):
    notifications = []

    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()

    # Premium due soon
    if policy and policy.next_payment_due:
        days_left = (policy.next_payment_due - datetime.utcnow()).days
        if days_left <= 2:
            notifications.append({
                "type":    "warning",
                "title":   "Premium Due Soon",
                "message": f"₹{policy.weekly_premium} due in {days_left} day(s)",
                "time":    datetime.utcnow().isoformat()
            })

    # Recent paid claims
    recent_paid = db.query(Claim).filter(
        Claim.rider_id == rider_id,
        Claim.status.in_(["paid", "partial_paid"])
    ).order_by(Claim.created_at.desc()).limit(3).all()

    for c in recent_paid:
        notifications.append({
            "type":    "success",
            "title":   "Payout Credited",
            "message": f"₹{c.payout_amount} credited to your UPI ({c.tier} tier)",
            "time":    c.created_at.isoformat()
        })

    # Active weather alerts in rider's pincode
    active_triggers = db.query(TriggerEvent).filter(
        TriggerEvent.pincode == rider.pincode,
        TriggerEvent.status == "active"
    ).all()

    for t in active_triggers:
        notifications.append({
            "type":    "alert",
            "title":   f"{t.trigger_type.upper()} Alert in {rider.city}",
            "message": "Coverage active — payout will be processed automatically",
            "time":    t.fired_at.isoformat()
        })

    # No-claim discount milestone
    if policy and policy.no_claim_weeks > 0:
        notifications.append({
            "type":    "info",
            "title":   "No-Claim Discount Active",
            "message": f"{policy.no_claim_weeks} claim-free week(s) — {min(policy.no_claim_weeks * 3, 15)}% discount applied",
            "time":    datetime.utcnow().isoformat()
        })

    return {
        "rider_id":      rider_id,
        "unread_count":  len(notifications),
        "notifications": notifications
    }


# ── Premium collection ────────────────────────────────────────────────────────
@app.post("/premium/subscribe/{rider_id}")
def subscribe_rider(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy")

    plan = create_subscription_plan(policy.weekly_premium)
    sub  = create_subscription(rider_id, plan["plan_id"])

    return {
        "success": True,
        "rider_id": rider_id,
        "weekly_premium": policy.weekly_premium,
        "subscription_id": sub["subscription_id"],
        "payment_link": sub["short_url"],
        "message": "Share this link with rider for UPI auto-debit setup"
    }


@app.post("/premium/pay-now/{rider_id}")
def pay_now(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    policy = db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.status == "active"
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy")

    link = create_payment_link(
        rider_id=rider_id,
        amount=policy.weekly_premium,
        description=f"Kavaach Weekly Premium — {rider.name}"
    )
    return link


@app.get("/payment/callback")
def payment_callback(
    razorpay_payment_id: str = None,
    razorpay_payment_link_id: str = None,
    razorpay_payment_link_status: str = None,
    db: Session = Depends(get_db)
):
    if razorpay_payment_link_status == "paid":
        return {
            "success": True,
            "payment_id": razorpay_payment_id,
            "message": "Premium payment received ✅"
        }
    return {"success": False, "message": "Payment pending or failed"}