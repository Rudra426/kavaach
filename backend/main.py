from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import engine, get_db
from models import Base, Rider, Policy, Claim, TriggerEvent, Payout
import json, pickle, numpy as np, pandas as pd, asyncio
from premium_service import (
    create_subscription_plan, create_subscription, create_payment_link
)
from claims_engine import process_trigger_for_riders
from payout_service import process_payout, release_held_payout
from servicenow_client import (
    create_onboarding_task, create_claim_ticket, resolve_ticket,
    create_mass_trigger_alert, create_premium_due_alert
)
from weather_service import poll_all_pincodes
from scheduler import start_scheduler, stop_scheduler
from schemas_compliance import ConsentPayload, ConsentType
from compliance_routes import router as compliance_router

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Kavaach API v3")

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://kavaach.in",
    "https://kavaach-frontend.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    allow_credentials=True,
)
app.include_router(compliance_router)

with open("pincode_risk_map.json", encoding="utf-8") as f:
    PINCODE_DATA = json.load(f)

MODEL, MODEL_META = None, {}
try:
    with open("model.pkl", "rb") as f:
        MODEL = pickle.load(f)
    with open("model_meta.json", encoding="utf-8") as f:
        MODEL_META = json.load(f)
    print(f"✅ Model loaded — R²: {MODEL_META.get('r2')}, MAE: ₹{MODEL_META.get('mae')}")
except Exception as e:
    print(f"⚠️ Model not found: {e}")

DELIVERY_ENC = {"scheduled": 0, "same_day": 1, "hyperlocal": 2}
ZONE_ENC = {"residential": 0, "commercial": 1, "industrial": 2, "hospital_adjacent": 3}
PLATFORM_ENC = {"pharmeasy": 0, "netmeds": 1, "tata1mg": 2, "apollo24x7": 3, "phonepe": 4}
PLATFORM_RISK_PRIORITY = {"phonepe": 4, "apollo24x7": 3, "tata1mg": 2, "pharmeasy": 2, "netmeds": 1}


def compute_risk_score(data: dict) -> float:
    flood = data.get("flood_risk", 0)
    heat = data.get("heat_risk", 0)
    aqi = data.get("aqi_risk", 0)
    cyclone = data.get("cyclone_risk", 0)
    coastal = data.get("coastal_zone", 0) * 0.1
    weighted = (flood * 2.5) + (heat * 1.0) + (aqi * 1.0) + (cyclone * 1.5) + coastal
    return round(max(1.0, min(5.0, (weighted / 6.1) * 5)), 2)


def risk_label(score: float) -> str:
    if score <= 2.0:
        return "Low"
    if score <= 3.5:
        return "Medium"
    return "High"


def get_seasonal_index(month: int) -> float:
    return {1:0.35,2:0.30,3:0.40,4:0.50,5:0.55,6:0.75,7:0.90,8:1.00,9:0.85,10:0.60,11:0.45,12:0.35}.get(month, 0.5)


def calculate_premium(pincode, weekly_earnings, platforms, delivery_type, cold_chain, medicine_type, experience_years, avg_deliveries_per_day, no_claim_weeks) -> dict:
    pincode_data = PINCODE_DATA.get(pincode, {})
    risk_score = compute_risk_score(pincode_data) if pincode_data else 3.0
    zone = pincode_data.get("zone", "residential")
    month = datetime.now().month
    cold_chain_mult = 1.0
    if cold_chain:
        cold_chain_mult = {"insulin":1.35,"vaccine":1.30,"biologic":1.40,"regular_cold":1.20}.get(medicine_type, 1.25)
    no_claim_discount = min(no_claim_weeks * 0.03, 0.20)
    if MODEL:
        best_plat = max([p.lower() for p in platforms], key=lambda p: PLATFORM_RISK_PRIORITY.get(p, 1))
        plat_enc = PLATFORM_ENC.get(best_plat, 0)
        delivery_enc = DELIVERY_ENC.get(delivery_type.lower().replace(" ", "_").replace("-", "_").split("(")[0].strip(), 1)
        zone_enc = ZONE_ENC.get(zone, 0)
        features = [[
            weekly_earnings, avg_deliveries_per_day, 0, 0.75,
            experience_years * 12, 1 if len(platforms) > 1 else 0,
            1 if cold_chain else 0,
            pincode_data.get("flood_risk", 0.3), pincode_data.get("heat_risk", 0.5),
            pincode_data.get("aqi_risk", 0.5), pincode_data.get("cyclone_risk", 0.1),
            pincode_data.get("coastal_zone", 0), get_seasonal_index(month), month,
            no_claim_weeks, no_claim_discount, delivery_enc, zone_enc, plat_enc
        ]]
        df = pd.DataFrame(features, columns=MODEL_META.get("features", []))
        base = float(MODEL.predict(df)[0])
    else:
        base = weekly_earnings * 0.04 * (1 - no_claim_discount)
    platform_mult = 1.0 + (len(platforms) - 1) * 0.05
    raw = base * cold_chain_mult * platform_mult
    cap = weekly_earnings * 0.15
    final = round(min(raw, cap), 2)
    return {"weekly_premium": final, "monthly_premium": round(final * 4.33, 2), "annual_premium": round(final * 52, 2), "coverage_amount": round(final * 52 * 10, 2), "risk_score": risk_score, "risk_level": risk_label(risk_score), "cap_applied": raw > cap, "city": pincode_data.get("city", ""), "area": pincode_data.get("area", ""), "zone": zone, "no_claim_discount_pct": round(no_claim_discount * 100, 1)}

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
    consent_given: bool
    consent_details: ConsentPayload | None = None

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

@app.get("/", response_class=HTMLResponse)
def home():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/health")
def health():
    return {"status": "ready", "message": "Kavaach API v3 ✅", "version": "3.0.0", "model_loaded": MODEL is not None, "pincodes_loaded": len(PINCODE_DATA), "model_r2": MODEL_META.get("r2"), "model_mae": MODEL_META.get("mae"), "compliance": {"cors_restricted": True, "consent_required": True, "adverse_selection_lockout": True, "fraud_score_deterministic": True, "payout_record_all_tiers": True, "no_claim_discount_active": True}}

@app.post("/predict")
def predict_premium(data: PremiumInput):
    return calculate_premium(data.pincode, data.weekly_earnings, data.platforms, data.delivery_type, data.cold_chain, data.medicine_type, data.experience_years, data.avg_deliveries_per_day, data.no_claim_weeks)

@app.get("/pincode/{pincode}")
def get_pincode(pincode: str):
    data = PINCODE_DATA.get(pincode)
    if not data:
        return {"found": False, "risk_score": 3.0, "risk_level": "Medium", "area": "Unknown", "city": "Unknown", "zone": "residential", "risks": {}}
    score = compute_risk_score(data)
    return {"found": True, "risk_score": score, "risk_level": risk_label(score), "area": data.get("area", ""), "city": data.get("city", ""), "zone": data.get("zone", "residential"), "risks": {"flood": data.get("flood_risk", 0), "heat": data.get("heat_risk", 0), "aqi": data.get("aqi_risk", 0), "cyclone": data.get("cyclone_risk", 0), "coastal": data.get("coastal_zone", 0)}}

@app.post("/register")
async def register_rider(data: RegisterInput, db: Session = Depends(get_db)):
    if not data.consent_given:
        raise HTTPException(status_code=422, detail="Registration requires explicit consent. Set consent_given=true.")
    active_trigger = db.query(TriggerEvent).filter(TriggerEvent.pincode == data.pincode, TriggerEvent.status == "active").first()
    if active_trigger:
        raise HTTPException(status_code=403, detail=f"Registration locked for pincode {data.pincode} during an active {active_trigger.trigger_type} event. Try again after the alert clears.")
    existing = db.query(Rider).filter(Rider.phone == data.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    pincode_data = PINCODE_DATA.get(data.pincode, {})
    rider = Rider(name=data.name, phone=data.phone, upi_id=data.upi_id, pincode=data.pincode, city=pincode_data.get("city", ""), platform=",".join(data.platforms), delivery_type=data.delivery_type, weekly_earnings=data.weekly_earnings, experience_years=data.experience_years, cold_chain=data.cold_chain, medicine_type=data.medicine_type, avg_deliveries_per_day=data.avg_deliveries_per_day)
    db.add(rider)
    db.flush()
    premium_data = calculate_premium(data.pincode, data.weekly_earnings, data.platforms, data.delivery_type, data.cold_chain, data.medicine_type, data.experience_years, data.avg_deliveries_per_day, no_claim_weeks=0)
    policy = Policy(rider_id=rider.id, weekly_premium=premium_data["weekly_premium"], coverage_amount=premium_data["coverage_amount"], status="active", no_claim_weeks=0, next_payment_due=datetime.utcnow() + timedelta(days=7))
    db.add(policy)
    db.commit()
    asyncio.create_task(create_onboarding_task(rider_id=rider.id, name=rider.name, phone=rider.phone, pincode=rider.pincode, city=rider.city, platform=rider.platform))
    db.refresh(rider)
    db.refresh(policy)
    return {"success": True, "rider_id": rider.id, "policy_id": policy.id, "name": rider.name, "city": rider.city, "weekly_premium": policy.weekly_premium, "coverage_amount": policy.coverage_amount, "next_payment_due": policy.next_payment_due, "risk_score": premium_data["risk_score"], "risk_level": premium_data["risk_level"], "message": f"Welcome to Kavaach, {rider.name}! Your policy is active."}

@app.get("/policy/{rider_id}")
def get_policy(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider: raise HTTPException(status_code=404, detail="Rider not found")
    policy = db.query(Policy).filter(Policy.rider_id == rider_id, Policy.status == "active").first()
    if not policy: raise HTTPException(status_code=404, detail="No active policy found")
    return {"policy_id": policy.id, "rider_id": rider.id, "name": rider.name, "phone": rider.phone, "pincode": rider.pincode, "city": rider.city, "platform": rider.platform, "delivery_type": rider.delivery_type, "weekly_premium": policy.weekly_premium, "coverage_amount": policy.coverage_amount, "status": policy.status, "no_claim_weeks": policy.no_claim_weeks, "next_payment_due": policy.next_payment_due, "start_date": policy.start_date}

@app.get("/dashboard/{rider_id}")
def get_dashboard(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider: raise HTTPException(status_code=404, detail="Rider not found")
    policy = db.query(Policy).filter(Policy.rider_id == rider_id, Policy.status == "active").first()
    claims = db.query(Claim).filter(Claim.rider_id == rider_id).order_by(Claim.created_at.desc()).limit(10).all()
    active_triggers = db.query(TriggerEvent).filter(TriggerEvent.pincode == rider.pincode, TriggerEvent.status == "active").all()
    return {"rider": {"id": rider.id, "name": rider.name, "pincode": rider.pincode, "city": rider.city, "platform": rider.platform}, "policy": {"id": policy.id if policy else None, "status": policy.status if policy else "none", "weekly_premium": policy.weekly_premium if policy else 0, "coverage_amount": policy.coverage_amount if policy else 0, "no_claim_weeks": policy.no_claim_weeks if policy else 0, "next_payment_due": policy.next_payment_due if policy else None}, "claims": [{"id": c.id, "trigger_id": c.trigger_id, "fraud_score": c.fraud_score, "tier": c.tier, "status": c.status, "payout_amount": c.payout_amount, "created_at": c.created_at} for c in claims], "active_triggers": [{"id": t.id, "type": t.trigger_type, "severity": t.severity, "fired_at": t.fired_at} for t in active_triggers], "weather_alert": len(active_triggers) > 0}

@app.get("/admin/stats")
def admin_stats(db: Session = Depends(get_db)):
    paid_amount = db.query(Payout).filter(Payout.status == "processed").all()
    return {"total_riders": db.query(Rider).count(), "active_policies": db.query(Policy).filter(Policy.status == "active").count(), "total_claims": db.query(Claim).count(), "total_payouts": db.query(Payout).count(), "total_paid_amount": round(sum(p.amount for p in paid_amount), 2)}

@app.get("/admin/claims")
def admin_claims(db: Session = Depends(get_db)):
    claims = db.query(Claim).order_by(Claim.created_at.desc()).all()
    return [{"id": c.id, "rider_id": c.rider_id, "policy_id": c.policy_id, "fraud_score": c.fraud_score, "tier": c.tier, "status": c.status, "payout_amount": c.payout_amount, "held_amount": c.held_amount, "servicenow_ticket_id": c.servicenow_ticket_id, "created_at": c.created_at} for c in claims]

@app.get("/admin/riders")
def admin_riders(db: Session = Depends(get_db)):
    riders = db.query(Rider).all()
    return [{"id": r.id, "name": r.name, "phone": r.phone, "pincode": r.pincode, "city": r.city, "platform": r.platform, "weekly_earnings": r.weekly_earnings, "created_at": r.created_at} for r in riders]

@app.get("/admin/heatmap")
def admin_heatmap(db: Session = Depends(get_db)):
    result = []
    for pincode, data in PINCODE_DATA.items():
        result.append({"pincode": pincode, "city": data.get("city", ""), "area": data.get("area", ""), "risk_score": compute_risk_score(data), "active_riders": db.query(Rider).filter(Rider.pincode == pincode).count(), "active_triggers": db.query(TriggerEvent).filter(TriggerEvent.pincode == pincode, TriggerEvent.status == "active").count(), "flood_risk": data.get("flood_risk", 0), "heat_risk": data.get("heat_risk", 0), "aqi_risk": data.get("aqi_risk", 0)})
    return result

@app.post("/trigger/manual")
async def manual_trigger(pincode: str, trigger_type: str, actual_value: float, db: Session = Depends(get_db)):
    thresholds = {"flood": 75, "heat": 43, "aqi": 200, "cyclone": 60}
    threshold = thresholds.get(trigger_type, 75)
    event = TriggerEvent(pincode=pincode, trigger_type=trigger_type, severity=round(actual_value / threshold, 2), threshold_value=threshold, actual_value=actual_value, status="active")
    db.add(event); db.commit(); db.refresh(event)
    result = process_trigger_for_riders(event.id)
    return {"trigger_id": event.id, "trigger_type": trigger_type, "pincode": pincode, "claims_result": result}

@app.get("/triggers/active")
def active_triggers(db: Session = Depends(get_db)):
    triggers = db.query(TriggerEvent).filter(TriggerEvent.status == "active").order_by(TriggerEvent.fired_at.desc()).all()
    return [{"id": t.id, "pincode": t.pincode, "type": t.trigger_type, "severity": t.severity, "actual_value": t.actual_value, "fired_at": t.fired_at} for t in triggers]

@app.post("/weather/poll")
async def force_weather_poll():
    result = await poll_all_pincodes()
    return {"polled": True, "triggers_fired": result}

@app.post("/payout/{claim_id}")
def fire_payout(claim_id: str):
    return process_payout(claim_id)

@app.post("/payout/release/{claim_id}")
def release_payout(claim_id: str):
    return release_held_payout(claim_id)

@app.get("/payouts/{rider_id}")
def rider_payouts(rider_id: str, db: Session = Depends(get_db)):
    payouts = db.query(Payout).filter(Payout.rider_id == rider_id).all()
    return [{"id": p.id, "claim_id": p.claim_id, "amount": p.amount, "upi_id": p.upi_id, "razorpay_payout_id": p.razorpay_payout_id, "status": p.status, "payout_type": p.payout_type, "created_at": p.created_at} for p in payouts]

@app.post("/servicenow/ticket/{claim_id}")
async def create_ticket(claim_id: str):
    return await create_claim_ticket(claim_id)

@app.post("/servicenow/resolve/{ticket_id}")
async def resolve_sn_ticket(ticket_id: str, resolution: str = "Approved by reviewer"):
    return await resolve_ticket(ticket_id, resolution)

@app.post("/admin/approve/{claim_id}")
async def approve_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim: raise HTTPException(status_code=404, detail="Claim not found")
    result = release_held_payout(claim_id)
    if claim.servicenow_ticket_id:
        await resolve_ticket(claim.servicenow_ticket_id, "Manually approved by admin")
    return {"approved": True, "payout_result": result}

@app.post("/admin/reject/{claim_id}")
async def reject_claim(claim_id: str, db: Session = Depends(get_db)):
    claim = db.query(Claim).filter(Claim.id == claim_id).first()
    if not claim: raise HTTPException(status_code=404, detail="Claim not found")
    claim.status = "rejected"; claim.held_amount = 0; db.commit()
    if claim.servicenow_ticket_id:
        await resolve_ticket(claim.servicenow_ticket_id, "Rejected after review")
    return {"rejected": True, "claim_id": claim_id}

@app.get("/weather/{pincode}")
async def get_live_weather(pincode: str):
    from weather_service import fetch_weather, fetch_aqi, PINCODE_COORDS
    coords = PINCODE_COORDS.get(pincode)
    if not coords:
        raise HTTPException(status_code=404, detail="Pincode not in coverage area")
    lat, lon = coords
    try:
        weather = await fetch_weather(lat, lon)
        aqi = await fetch_aqi(lat, lon)
        daily = weather.get("daily", {})
        max_temp = daily.get("temperature_2m_max", [None])[0]
        max_precip = daily.get("precipitation_probability_max", [None])[0]
        max_wind = daily.get("windspeed_10m_max", [None])[0]
        THRESHOLDS = {"flood": 75, "heat": 43, "aqi": 200, "cyclone": 60}
        alerts = []
        if max_precip and max_precip >= THRESHOLDS["flood"]:
            alerts.append({"type":"flood","message":"Heavy rain alert in your area","severity":"high","threshold":THRESHOLDS["flood"],"actual_value":max_precip,"unit":"%"})
        if max_temp and max_temp >= THRESHOLDS["heat"]:
            alerts.append({"type":"heat","message":"Extreme heat advisory active","severity":"high","threshold":THRESHOLDS["heat"],"actual_value":max_temp,"unit":"°C"})
        if aqi and aqi >= THRESHOLDS["aqi"]:
            alerts.append({"type":"aqi","message":"Hazardous AQI — limit outdoor activity","severity":"high","threshold":THRESHOLDS["aqi"],"actual_value":round(aqi,1),"unit":"AQI"})
        if max_wind and max_wind >= THRESHOLDS["cyclone"]:
            alerts.append({"type":"cyclone","message":"High wind warning in your zone","severity":"critical","threshold":THRESHOLDS["cyclone"],"actual_value":max_wind,"unit":"km/h"})
        pincode_data = PINCODE_DATA.get(pincode, {})
        return {"pincode": pincode, "city": pincode_data.get("city", ""), "area": pincode_data.get("area", ""), "temperature": max_temp, "rainfall_probability": max_precip, "wind_speed": max_wind, "aqi": round(aqi,1) if aqi else None, "alerts": alerts, "coverage_active": len(alerts) > 0, "thresholds": THRESHOLDS, "last_updated": datetime.utcnow().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup():
    start_scheduler()
    print("🛡️ Kavaach API v3 ready")

@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()


from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Serve static assets (JS, CSS, images built by Vite)
if os.path.exists("static"):
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")

# Catch-all: serve index.html for any non-API route (React Router support)
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def serve_frontend(full_path: str):
    index_path = "static/index.html"
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return HTMLResponse("<h1>Frontend not built yet</h1>")