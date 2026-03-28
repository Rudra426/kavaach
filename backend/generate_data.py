import pandas as pd
import numpy as np
import json

np.random.seed(42)
N = 10000

with open("pincode_risk_map.json") as f:
    PINCODE_RISK_MAP = json.load(f)

PINCODES = list(PINCODE_RISK_MAP.keys())
DELIVERY_MODELS = ["hyperlocal", "same_day", "scheduled"]
ZONE_TYPES = ["hospital_adjacent", "residential", "commercial", "industrial"]
PLATFORMS = {
    "hyperlocal": (["Apollo24x7","PhonePePincode","Tata1mg"], [0.45,0.25,0.30]),
    "same_day":   (["Tata1mg","PharmEasy","Apollo24x7"],     [0.45,0.35,0.20]),
    "scheduled":  (["Netmeds","PharmEasy","Tata1mg"],        [0.55,0.30,0.15]),
}

def get_delivery_model(city):
    tier1 = ["Mumbai","Delhi","Bengaluru","Hyderabad","Chennai","Kolkata"]
    tier2 = ["Pune","Ahmedabad","Jaipur","Lucknow","Nagpur","Bhopal"]
    if city in tier1:   return np.random.choice(DELIVERY_MODELS, p=[0.40,0.45,0.15])
    elif city in tier2: return np.random.choice(DELIVERY_MODELS, p=[0.10,0.55,0.35])
    else:               return np.random.choice(DELIVERY_MODELS, p=[0.02,0.28,0.70])

def generate_riders(n):
    data = []
    for _ in range(n):
        pincode = np.random.choice(PINCODES)
        risk    = PINCODE_RISK_MAP[pincode]
        city    = risk["city"]
        model   = get_delivery_model(city)
        plat_list, plat_probs = PLATFORMS[model]
        platform = np.random.choice(plat_list, p=plat_probs)

        if model == "hyperlocal":
            weekly_earnings    = int(np.clip(np.random.normal(5800,900), 1500,15000))
            deliveries_per_day = int(np.clip(np.random.normal(14,3),     1,30))
        elif model == "same_day":
            weekly_earnings    = int(np.clip(np.random.normal(4800,800), 1500,15000))
            deliveries_per_day = int(np.clip(np.random.normal(9,2),      1,30))
        else:
            weekly_earnings    = int(np.clip(np.random.normal(3800,700), 1500,15000))
            deliveries_per_day = int(np.clip(np.random.normal(20,4),     1,30))

        is_part_time          = 1 if deliveries_per_day < 5 else 0
        cold_chain            = int(np.random.choice([0,1], p=[0.65,0.35] if model=="hyperlocal" else [0.78,0.22]))
        experience_months     = int(np.clip(np.random.exponential(18), 1, 84))
        earnings_consistency  = round(np.random.beta(5,2), 3)
        multi_platform        = int(np.random.choice([0,1], p=[0.75,0.25]))
        zone_type             = np.random.choice(ZONE_TYPES, p=[0.55,0.25,0.15,0.05] if model=="hyperlocal" else [0.25,0.45,0.20,0.10])
        month                 = np.random.randint(1,13)
        if month in [6,7,8,9]:   seasonal_index = round(np.random.uniform(0.70,1.00),3)
        elif month in [4,5,10]:  seasonal_index = round(np.random.uniform(0.45,0.75),3)
        else:                    seasonal_index = round(np.random.uniform(0.15,0.45),3)
        no_claim_weeks   = int(np.random.choice([0,1,2,3,4], p=[0.40,0.25,0.18,0.10,0.07]))
        no_claim_discount= round(min(0.15, no_claim_weeks*0.03), 3)

        # Risk scores directly from pincode map (no city-level approximation)
        flood_risk   = round(np.clip(risk["flood_risk"]   + np.random.normal(0,0.03),0,1),3)
        heat_risk    = round(np.clip(risk["heat_risk"]    + np.random.normal(0,0.02),0,1),3)
        aqi_risk     = round(np.clip(risk["aqi_risk"]     + np.random.normal(0,0.02),0,1),3)
        cyclone_risk = round(np.clip(risk["cyclone_risk"] + np.random.normal(0,0.02),0,1),3)
        coastal_zone = risk["coastal_zone"]

        if weekly_earnings < 3000: base = 35
        elif weekly_earnings < 6000: base = 60
        else: base = 95

        premium = (base
            * {"hyperlocal":1.40,"same_day":1.00,"scheduled":0.70}[model]
            * (1.15 if cold_chain else 1.0)
            * (1.0 + seasonal_index*0.25)
            * (1.0 + flood_risk*0.20)
            * (1.0 + heat_risk*0.15)
            * (1.0 + aqi_risk*0.12)
            * (1.0 + cyclone_risk*0.10)
            * (1.05 if coastal_zone else 1.0)
            * (1.08 if zone_type=="hospital_adjacent" else 1.0)
            * (1.0 - earnings_consistency*0.05)
            * (1.0 - min(0.10, experience_months*0.001))
            * (1.0 - no_claim_discount))
        premium    = round(np.clip(premium * np.random.uniform(0.95,1.05), 25, 250), 2)
        max_payout = round(weekly_earnings * 0.15, 0)  

        data.append({
            "pincode":pincode, "city":city,
            "delivery_model":model, "platform":platform, "zone_type":zone_type,
            "weekly_earnings":weekly_earnings, "deliveries_per_day":deliveries_per_day,
            "is_part_time":is_part_time, "earnings_consistency":earnings_consistency,
            "experience_months":experience_months, "multi_platform":multi_platform,
            "cold_chain":cold_chain,
            "flood_risk":flood_risk, "heat_risk":heat_risk,
            "aqi_risk":aqi_risk, "cyclone_risk":cyclone_risk,
            "coastal_zone":coastal_zone, "seasonal_index":seasonal_index,
            "month":month, "no_claim_weeks":no_claim_weeks, "no_claim_discount":no_claim_discount,
            "weekly_premium":premium, "max_weekly_payout":max_payout,
        })
    return pd.DataFrame(data)

df = generate_riders(N)
df.to_csv("riders_training.csv", index=False)
print(f"✅ Dataset: {len(df)} rows, {len(df.columns)} columns")
print(f"   Premium  : ₹{df['weekly_premium'].min():.0f} – ₹{df['weekly_premium'].max():.0f}  (avg ₹{df['weekly_premium'].mean():.2f})")
print(f"   Pincodes : {df['pincode'].nunique()} unique pincodes")
print(f"   Cities   : {df['city'].nunique()} cities")
