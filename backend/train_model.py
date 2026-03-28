import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import pickle
import json

df = pd.read_csv("riders_training.csv")

# Encode categorical columns
delivery_model_enc = {"scheduled": 0, "same_day": 1, "hyperlocal": 2}
zone_type_enc      = {"residential": 0, "commercial": 1, "industrial": 2, "hospital_adjacent": 3}
platform_enc       = {"PharmEasy": 0, "Netmeds": 1, "Tata1mg": 2, "Apollo24x7": 3, "PhonePePincode": 4}

df["delivery_model_enc"] = df["delivery_model"].map(delivery_model_enc)
df["zone_type_enc"]      = df["zone_type"].map(zone_type_enc)
df["platform_enc"]       = df["platform"].map(platform_enc)

FEATURES = [
    "weekly_earnings", "deliveries_per_day", "is_part_time",
    "earnings_consistency", "experience_months", "multi_platform", "cold_chain",
    "flood_risk", "heat_risk", "aqi_risk", "cyclone_risk", "coastal_zone",
    "seasonal_index", "month", "no_claim_weeks", "no_claim_discount",
    "delivery_model_enc", "zone_type_enc", "platform_enc"
]

X = df[FEATURES]
y = df["weekly_premium"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestRegressor(
    n_estimators=200,
    max_depth=12,
    min_samples_leaf=3,
    random_state=42,
    n_jobs=-1
)
model.fit(X_train, y_train)

# Evaluation
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2  = r2_score(y_test, y_pred)
print(f"✅ Model trained successfully")
print(f"   MAE : ₹{mae:.2f}  (average prediction error)")
print(f"   R²  : {r2:.4f}  (accuracy)")

# Feature importance
print("\n📊 Top Feature Importances:")
fi = sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1])
for name, imp in fi[:8]:
    print(f"   {name:<28} {imp:.4f}")

# Save model
with open("model.pkl", "wb") as f:
    pickle.dump(model, f)

# Save metadata (used by main.py for encoding)
meta = {
    "features": FEATURES,
    "delivery_model_enc": delivery_model_enc,
    "zone_type_enc": zone_type_enc,
    "platform_enc": platform_enc,
    "mae": round(mae, 2),
    "r2": round(r2, 4)
}
with open("model_meta.json", "w") as f:
    json.dump(meta, f, indent=2)

print("\n💾 Saved: model.pkl + model_meta.json")
