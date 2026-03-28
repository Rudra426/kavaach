import httpx
import json
from datetime import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import TriggerEvent, Rider

# Pincode → lat/lon mapping for API calls
PINCODE_COORDS = {
    "400063": (19.0760, 72.8777),  "400001": (18.9388, 72.8354),
    "400070": (19.0728, 72.8826),  "110001": (28.6139, 77.2090),
    "110085": (28.7041, 77.1025),  "560001": (12.9716, 77.5946),
    "560034": (12.9352, 77.6245),  "600001": (13.0827, 80.2707),
    "500001": (17.3850, 78.4867),  "700001": (22.5726, 88.3639),
    "411001": (18.5204, 73.8567),  "380001": (23.0225, 72.5714),
    "302001": (26.9124, 75.7873),  "226001": (26.8467, 80.9462),
}

# Thresholds
THRESHOLDS = {
    "flood":   {"param": "precipitation_probability", "value": 75, "label": "Heavy Rain / Flood Risk"},
    "heat":    {"param": "temperature_2m_max",         "value": 43, "label": "Extreme Heat"},
    "aqi":     {"param": "aqi",                        "value": 200, "label": "Hazardous AQI"},
    "cyclone": {"param": "windspeed_10m_max",          "value": 60, "label": "Cyclone Warning"},
}


async def fetch_weather(lat: float, lon: float) -> dict:
    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        f"&hourly=temperature_2m,precipitation_probability,windspeed_10m"
        f"&daily=temperature_2m_max,precipitation_probability_max,windspeed_10m_max"
        f"&timezone=Asia%2FKolkata&forecast_days=1"
    )
    async with httpx.AsyncClient(timeout=10) as client:
        r = await client.get(url)
        r.raise_for_status()
        return r.json()


async def fetch_aqi(lat: float, lon: float) -> float:
    """OpenAQ free endpoint — no key needed for basic use"""
    url = (
        f"https://api.openaq.org/v3/locations"
        f"?coordinates={lat},{lon}&radius=25000&limit=1&order_by=distance"
    )
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            r = await client.get(url)
            data = r.json()
            locations = data.get("results", [])
            if locations:
                # Return a mock AQI for now if live data unavailable
                return locations[0].get("lastValue", 80)
    except Exception:
        pass
    return 80  # default safe value


def check_and_fire_triggers(pincode: str, weather: dict, aqi_value: float):
    """Evaluate weather data against thresholds, create TriggerEvents in DB"""
    db: Session = SessionLocal()
    fired = []

    try:
        daily = weather.get("daily", {})
        max_temp   = daily.get("temperature_2m_max", [30])[0] or 30
        max_precip = daily.get("precipitation_probability_max", [0])[0] or 0
        max_wind   = daily.get("windspeed_10m_max", [0])[0] or 0

        checks = [
            ("flood",   max_precip, THRESHOLDS["flood"]["value"]),
            ("heat",    max_temp,   THRESHOLDS["heat"]["value"]),
            ("aqi",     aqi_value,  THRESHOLDS["aqi"]["value"]),
            ("cyclone", max_wind,   THRESHOLDS["cyclone"]["value"]),
        ]

        for trigger_type, actual, threshold in checks:
            if actual >= threshold:
                # Avoid duplicate active triggers for same pincode + type
                existing = db.query(TriggerEvent).filter(
                    TriggerEvent.pincode == pincode,
                    TriggerEvent.trigger_type == trigger_type,
                    TriggerEvent.status == "active"
                ).first()

                if not existing:
                    event = TriggerEvent(
                        pincode=pincode,
                        trigger_type=trigger_type,
                        severity=round(actual / threshold, 2),
                        threshold_value=threshold,
                        actual_value=actual,
                        status="active"
                    )
                    db.add(event)
                    db.flush()
                    fired.append({
                        "trigger_id": event.id,
                        "type": trigger_type,
                        "pincode": pincode,
                        "actual": actual,
                        "threshold": threshold
                    })
                    print(f"🔴 TRIGGER FIRED: {trigger_type.upper()} at {pincode} "
                          f"(actual={actual}, threshold={threshold})")

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"⚠️ Trigger check error for {pincode}: {e}")
    finally:
        db.close()

    return fired


async def poll_all_pincodes():
    """Main polling function — called by scheduler every 15 min"""
    print(f"\n🌦️ Weather poll started — {datetime.now().strftime('%H:%M:%S')}")
    all_fired = []

    # Only poll pincodes that have active riders
    db = SessionLocal()
    try:
        active_pincodes = db.query(Rider.pincode).distinct().all()
        active_pincodes = [p[0] for p in active_pincodes]
    finally:
        db.close()

    if not active_pincodes:
        active_pincodes = list(PINCODE_COORDS.keys())[:5]  # fallback for testing

    for pincode in active_pincodes:
        coords = PINCODE_COORDS.get(pincode)
        if not coords:
            continue
        lat, lon = coords
        try:
            weather = await fetch_weather(lat, lon)
            aqi     = await fetch_aqi(lat, lon)
            fired   = check_and_fire_triggers(pincode, weather, aqi)
            all_fired.extend(fired)
        except Exception as e:
            print(f"⚠️ Failed to poll {pincode}: {e}")

    print(f"✅ Poll complete — {len(all_fired)} trigger(s) fired")
    return all_fired
