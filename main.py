from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import json
import pickle
import numpy as np
import pandas as pd

app = FastAPI(title="Kavaach ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)

# ── Load pincode data ─────────────────────────────────────────────────────────
PINCODE_DATA = {}
try:
    with open("pincode_risk_map.json") as f:
        PINCODE_DATA = json.load(f)
except Exception as e:
    print(f"⚠️ pincode_risk_map.json not found: {e}")

# ── Load ML model + metadata ──────────────────────────────────────────────────
MODEL = None
MODEL_META = {}
try:
    with open("model.pkl", "rb") as f:
        MODEL = pickle.load(f)
    with open("model_meta.json") as f:
        MODEL_META = json.load(f)
    print(f"✅ Model loaded — R²: {MODEL_META.get('r2')}, MAE: ₹{MODEL_META.get('mae')}")
except Exception as e:
    print(f"⚠️ Model not found, falling back to formula: {e}")

# ── Encodings (must match train_model.py exactly) ─────────────────────────────
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
    seasonal = {
        1: 0.35, 2: 0.30, 3: 0.40, 4: 0.50, 5: 0.55,
        6: 0.75, 7: 0.90, 8: 1.00, 9: 0.85, 10: 0.60,
        11: 0.45, 12: 0.35
    }
    return seasonal.get(month, 0.5)

def platform_to_enc(platforms: list) -> int:
    priority = {"phonepe": 4, "apollo24x7": 3, "tata1mg": 2, "netmeds": 1, "pharmeasy": 0}
    best = max(
        [p.lower() for p in platforms],
        key=lambda p: priority.get(p, 0),
        default="pharmeasy"
    )
    return PLATFORM_ENC.get(best, 0)


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def home():
    with open("templates/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/health")
def health():
    return {
        "message": "Kavaach ML Service v2 ✅",
        "status": "ready",
        "pincodes_loaded": len(PINCODE_DATA),
        "model_loaded": MODEL is not None,
        "model_r2": MODEL_META.get("r2"),
        "model_mae": MODEL_META.get("mae")
    }


@app.get("/pincode/{pincode}")
def get_pincode_risk(pincode: str):
    data = PINCODE_DATA.get(pincode)
    if not data:
        return {
            "found": False,
            "risk_score": 3.0, "risk_level": "Medium",
            "area": "Unknown", "city": "Unknown",
            "zone": "residential", "risks": {}
        }
    score = compute_risk_score(data)
    return {
        "found": True,
        "risk_score": score,
        "risk_level": risk_label(score),
        "area": data.get("area", ""),
        "city": data.get("city", ""),
        "zone": data.get("zone", "residential"),
        "risks": {
            "flood":   data.get("flood_risk", 0),
            "heat":    data.get("heat_risk", 0),
            "aqi":     data.get("aqi_risk", 0),
            "cyclone": data.get("cyclone_risk", 0),
            "coastal": data.get("coastal_zone", 0)
        }
    }


# ── Pydantic Model ─────────────────────────────────────────────────────────────
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


@app.post("/predict")
def predict_premium(data: PremiumInput):
    pincode_data  = PINCODE_DATA.get(data.pincode, {})
    risk_score    = compute_risk_score(pincode_data) if pincode_data else 3.0
    zone          = pincode_data.get("zone", "residential")
    current_month = datetime.now().month

    # Cold chain multiplier
    cold_chain_mult = 1.0
    if data.cold_chain:
        cold_chain_mult = {
            "insulin":      1.35,
            "vaccine":      1.30,
            "biologic":     1.40,
            "regular_cold": 1.20
        }.get(data.medicine_type, 1.25)

    # No-claim discount
    no_claim_discount = min(data.no_claim_weeks * 0.03, 0.20)

    # ── ML Prediction ─────────────────────────────────────────────────────────
    if MODEL is not None:
        delivery_enc = DELIVERY_ENC.get(
            data.delivery_type.lower().split("(")[0].strip()
            .replace(" ", "_").replace("-", "_"), 1
        )
        zone_enc = ZONE_ENC.get(zone, 0)
        plat_enc = platform_to_enc(data.platforms)

        feature_values = [[
            data.weekly_earnings,
            data.avg_deliveries_per_day,
            0,
            0.75,
            data.experience_years * 12,
            1 if len(data.platforms) > 1 else 0,
            1 if data.cold_chain else 0,
            pincode_data.get("flood_risk", 0.3),
            pincode_data.get("heat_risk", 0.5),
            pincode_data.get("aqi_risk", 0.5),
            pincode_data.get("cyclone_risk", 0.1),
            pincode_data.get("coastal_zone", 0),
            get_seasonal_index(current_month),
            current_month,
            data.no_claim_weeks,
            no_claim_discount,
            delivery_enc,
            zone_enc,
            plat_enc
        ]]

        # Use named DataFrame to avoid sklearn warning
        FEATURE_NAMES = MODEL_META.get("features", [])
        features_df   = pd.DataFrame(feature_values, columns=FEATURE_NAMES)
        base_predicted = float(MODEL.predict(features_df)[0])

        platform_mult = 1.0 + (len(data.platforms) - 1) * 0.05
        raw = base_predicted * cold_chain_mult * platform_mult
        prediction_source = "ml_model"

    else:
        # ── Fallback formula (if model.pkl missing) ───────────────────────────
        base       = data.weekly_earnings * 0.04
        pincode_m  = round(0.85 + (risk_score / 5) * 0.50, 3)
        platform_m = round(1.0 + (len(data.platforms) - 1) * 0.05, 3)
        delivery_m = {
            "hyperlocal": 1.0, "same_day": 1.1,
            "express": 1.2,    "scheduled": 0.9
        }.get(data.delivery_type.lower().split("(")[0].strip(), 1.0)
        zone_m = {
            "hospital_adjacent": 1.15, "market_area": 1.10,
            "residential": 1.0, "industrial": 1.05, "rural": 0.95
        }.get(zone, 1.0)
        exp_d  = round(max(0.80, 1.0 - (data.experience_years * 0.02)), 3)

        base_predicted = base * pincode_m * delivery_m * zone_m * exp_d
        platform_mult  = platform_m
        raw = base_predicted * cold_chain_mult * platform_mult
        prediction_source = "formula_fallback"

    # ── Fairness cap ──────────────────────────────────────────────────────────
    cap = data.weekly_earnings * 0.04
    final = min(raw, cap)

    return {
        "weekly_premium":    round(final, 2),
        "monthly_premium":   round(final * 4.33, 2),
        "annual_premium":    round(final * 52, 2),
        "coverage_amount":   round(final * 52 * 10, 2),
        "risk_score":        risk_score,
        "risk_level":        risk_label(risk_score),
        "zone":              zone,
        "area":              pincode_data.get("area", ""),
        "city":              pincode_data.get("city", ""),
        "cap_applied":       raw > cap,
        "prediction_source": prediction_source,
        "model_accuracy":    f"R²={MODEL_META.get('r2','N/A')}, MAE=₹{MODEL_META.get('mae','N/A')}",
        "risk_factors": {
            "flood":   pincode_data.get("flood_risk", 0),
            "heat":    pincode_data.get("heat_risk", 0),
            "aqi":     pincode_data.get("aqi_risk", 0),
            "cyclone": pincode_data.get("cyclone_risk", 0)
        }
    }
