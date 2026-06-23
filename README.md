# 🛡️ Kavaach — AI-Powered Parametric Insurance for Pharma Delivery Partners

> **Guidewire DEVTrails 2026 | Phase 3 Submission — Scale & Optimise**

![Python](https://img.shields.io/badge/Python-3.10-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100-green)
![scikit--learn](https://img.shields.io/badge/ML-scikit--learn-orange)
![Render](https://img.shields.io/badge/Deployed-Render-purple)
![Razorpay](https://img.shields.io/badge/Payments-Razorpay%20Sandbox-blue)
![ServiceNow](https://img.shields.io/badge/ITSM-ServiceNow-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🔗 Links

| Resource | Link |
|---|---|
| 🌐 Live Demo | https://kavaach.onrender.com |
| 📊 Pitch Deck | _[Add public Google Slides / Drive link here]_ |
| 🎬 Demo Video | _[Add public YouTube / Drive video link here]_ |
| 💻 Repository | https://github.com/[Rudra426]/kavaach |

---

## 📋 Table of Contents

- [Overview](../../c:/Users/rudra/Downloads/README (3).md#overview)
- [Persona](../../c:/Users/rudra/Downloads/README (3).md#persona)
- [Application Workflow](../../c:/Users/rudra/Downloads/README (3).md#application-workflow)
- [Weekly Premium Model](../../c:/Users/rudra/Downloads/README (3).md#weekly-premium-model)
- [Parametric Triggers](../../c:/Users/rudra/Downloads/README (3).md#parametric-triggers)
- [Fraud Detection & Anti-Spoofing](../../c:/Users/rudra/Downloads/README (3).md#fraud-detection--anti-spoofing)
- [Tech Stack](../../c:/Users/rudra/Downloads/README (3).md#tech-stack)
- [Project Structure](../../c:/Users/rudra/Downloads/README (3).md#project-structure)
- [Running Locally](../../c:/Users/rudra/Downloads/README (3).md#running-locally)
- [API Reference](../../c:/Users/rudra/Downloads/README (3).md#api-reference)
- [Development Roadmap](../../c:/Users/rudra/Downloads/README (3).md#development-roadmap)
- [Phase 3 Checklist](../../c:/Users/rudra/Downloads/README (3).md#phase-3-checklist)
- [Pitch Deck](../../c:/Users/rudra/Downloads/README (3).md#pitch-deck)
- [Demo Video](../../c:/Users/rudra/Downloads/README (3).md#demo-video)

---

## Overview

Kavaach is a fully automated, AI-powered parametric income-loss insurance platform for pharma delivery partners in India.

It monitors real-time weather and disruption signals, automatically fires payouts when thresholds are crossed, and runs a 5-layer fraud detection engine — all without the rider filing a single claim form.

**Platforms covered:** Tata 1mg · Apollo 24x7 · PharmEasy · Netmeds · PhonePe Pincode

---

## 🖼️ Live Preview

<img width="981" height="1339" alt="Kavaach Premium Calculator" src="https://github.com/user-attachments/assets/54f4edab-8093-446f-8bf3-ea123b8bef97" />

<img width="1569" height="815" alt="Kavaach Dashboard" src="https://github.com/user-attachments/assets/bec6deb0-0118-4e02-972d-45ea91ff379d" />

---

## 👤 Persona

**Segment:** Pharma / Medicine Delivery Partners

### Arjun, 26 — Hyperlocal Pharma Rider, Mumbai (Andheri East)
Arjun delivers insulin and vaccines for Tata 1mg, earning ₹6,200/week across 14 deliveries/day. During the July 2024 Mumbai floods he could not work for 4 days — losing ₹3,500 with no safety net. Kavaach would have detected flood risk in pincode 400063, fired a trigger, and credited ₹780 to his UPI within 4 minutes — no claim form, no phone call.

### Priya, 31 — Scheduled Delivery Rider, Delhi (Rohini)
Priya delivers Netmeds orders during extreme heat (AQI 480+, temp 46°C). Kavaach detects the AQI spike, cross-checks her active status on Netmeds, and processes partial income replacement automatically.

### Ravi, 42 — Part-time Rider, Bengaluru (Malleshwaram)
Ravi does 3–4 deliveries/day for PharmEasy as supplemental income. A local strike closes pickup zones for 2 days. Kavaach flags the event and calculates his proportional income loss for payout.

---

## 🔄 Application Workflow

```
ONBOARDING
  Rider registers → pincode, platform, delivery type, experience
  → ML engine calculates personalized weekly premium
  → Rider pays weekly via UPI auto-debit

ACTIVE COVERAGE (every 15 minutes)
  Weather APIs polled for all covered pincodes
  → If disruption threshold crossed → trigger evaluation begins

PARAMETRIC TRIGGER FIRED
  System checks: Is rider active on platform? (Platform API cross-check)
  → Fraud scoring runs (14 signals, 5 layers)
  → Fraud Score 0–30  → Full auto-payout via UPI (2–4 min)
  → Fraud Score 31–65 → 60% immediate + 40% after soft verification
  → Fraud Score 66+   → Full hold + human review within 2 hours

POST-PAYOUT
  Claim logged → No-claim streak resets or preserved
  → Rider notified via push/SMS
  → Weekly premium recalculates next cycle
```

---

## 💰 Weekly Premium Model

### Why Weekly?
Pharma delivery riders are paid weekly by platforms. Weekly premiums align with actual cash flow. A rider earning ₹4,000/week can afford ₹120–180/week — not ₹7,000/year upfront.

### Formula

```
Base prediction (Random Forest, 19 features)
  × Cold chain differential multiplier    (medicine type risk)
  × Multi-platform multiplier             (1 + (count-1) × 0.05)
  → raw premium

Final = min(raw, weekly_earnings × 0.15)  ← Fairness Cap
```

### Model Performance
- **Algorithm:** Random Forest (scikit-learn)
- **Training data:** 10,000 synthetic rider profiles, 19 features
- **R²:** 0.9861
- **MAE:** ₹3.82

### Key Premium Drivers

| Factor | Effect |
|---|---|
| Pincode flood risk | ↑ Higher risk → higher premium |
| Weekly earnings | ↑ Higher earnings → higher coverage need |
| Delivery type (hyperlocal) | ↑ More exposure than scheduled |
| Cold chain medicines | ↑ Insulin/Biologics carry higher risk |
| Experience (years) | ↓ More experience = slightly lower premium |
| No-claim weeks (up to 5) | ↓ Up to 15% discount |
| Seasonal index (monsoon) | ↑ July–August peaks at 1.0× multiplier |

**Fairness guarantee:** Premium never exceeds 15% of weekly earnings.
**Coverage:** 10× annual premium as payout ceiling.

### No-Claim Discount

| Claim-free Weeks | Discount |
|---|---|
| 1 | 3% |
| 2 | 6% |
| 3 | 9% |
| 4 | 12% |
| 5+ | 15% (max) |

---

## ⚡ Parametric Triggers

Kavaach covers **income loss only** — not health, vehicle, or accident insurance. Payouts fire automatically when objective external thresholds are crossed.

### Environmental Triggers

| Trigger | Threshold | Data Source |
|---|---|---|
| 🌊 Flood / Heavy Rain | Precipitation probability > 75% | Open-Meteo API |
| 🌡️ Extreme Heat | Temperature > 43°C | Open-Meteo API |
| 💨 Severe AQI | AQI > 200 (Very Unhealthy) | Open-Meteo / CPCB |
| 🌀 Cyclone Warning | Wind speed > 60 km/h | Open-Meteo API |

### Social Triggers (Phase 2+)

| Trigger | Detection Method |
|---|---|
| Local curfew / Section 144 | Government alert API + news signal |
| Zone closure / Strike | Platform order-volume detection |
| Market shutdown | orders_assigned_today = 0 at zone level |

### Why Parametric?
- No claim filing — triggers fire automatically.
- No disputes — payout is based on objective data.
- No delay — UPI credit within 2–4 minutes.
- Fraud-resistant — GPS spoofing cannot fake an IMD flood alert.

---

## 🛡️ Fraud Detection & Anti-Spoofing

> **Threat:** Coordinated GPS-spoofing syndicates (Telegram groups of 500+ riders)
> **Response:** 5-Layer Defense Architecture

GPS is never the sole truth signal in Kavaach. It is one of 14 signals. Spoofing GPS alone triggers nothing.

### Layer 1 — Multi-Signal Location Triangulation

| Signal | Spoof Difficulty |
|---|---|
| GPS coordinates | Easy to fake |
| Cell tower ID | Hard — requires SIM-level access |
| IP geolocation | Hard — home IP ≠ flood zone |
| Wi-Fi SSID hash | Very hard — home WiFi ≠ field location |
| IMU (accelerometer) | Extremely hard |

2+ mismatches → YELLOW tier | 4 mismatches → RED tier

### Layer 2 — Behavioral Biometric Baseline
7-day rolling device baseline tracks battery drain rate, screen patterns, Bluetooth device list, charging status, and delivery route heatmap. GPS spoofing apps drain battery 40% faster than normal usage — detectable.

### Layer 3 — Coordinated Ring Detection

```python
# Temporal spike detection
if claims_within_60_seconds > 15:
    flag_batch("TEMPORAL_SPIKE")

# Spatial impossibility — all claims from same GPS cluster
if spatial_variance < NATURAL_MOVEMENT_THRESHOLD:
    flag_batch("SPATIAL_CLUSTERING")

# Device fingerprint reuse
if unique_devices < len(claims) * 0.85:
    flag_batch("DEVICE_REUSE")
```

### Layer 4 — Platform API Cross-Verification
Before any payout fires, Kavaach checks rider's last-active time, today's order count, and last known pincode from the platform API. A rider with 0 orders assigned today had no income at risk.

### Layer 5 — Three-Tier Payout Protocol

| Tier | Fraud Score | Action |
|---|---|---|
| 🟢 GREEN | 0–30 | Full auto-payout, UPI in 2–4 min |
| 🟡 YELLOW | 31–65 | 60% immediate + 40% held for soft check |
| 🔴 RED | 66+ | Full hold + human review within 2 hours |

YELLOW tier exists because sensors fail in bad weather — exactly when riders need Kavaach most. Every RED tier claim gets benefit of doubt, not auto-rejection.

**Appeal window:** 48-hour in-app appeal with photo/voice note evidence in Hindi.

---

## 🏗️ Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | FastAPI (Python) | Fast, async, auto-docs, Pydantic validation |
| ML Model | scikit-learn RandomForest | Interpretable, no GPU, deployable as .pkl |
| Frontend | Vanilla HTML/CSS/JS | Zero framework → instant load on 2G/3G |
| Database | SQLite + SQLAlchemy | Lightweight, zero-config for dev/demo |
| Scheduler | APScheduler | Weather polling every 15 min, weekly renewal |
| Payments | Razorpay Sandbox | India-native UPI payout simulation |
| ITSM | ServiceNow (mock + live) | Claim tickets, onboarding, escalations |
| Weather | Open-Meteo (free) | No API key, high accuracy for India |
| Risk Data | pincode_risk_map.json | 75+ pincodes × flood/heat/AQI/cyclone |
| Deployment | Render (free tier) | One-click deploy, HTTPS, auto-redeploy |

---

## 📁 Project Structure

```
kavaach/
├── main.py                    # FastAPI app — all endpoints
├── claims_engine.py           # Fraud scoring + claim processing
├── payout_service.py          # Razorpay UPI payout integration
├── scheduler.py               # APScheduler jobs (weather, renewal, alerts)
├── servicenow_client.py       # ServiceNow incident + ticket management
├── weather_service.py         # Open-Meteo API polling
├── schemas_compliance.py      # Pydantic consent schemas
├── compliance_routes.py       # Consent management endpoints
├── models.py                  # SQLAlchemy ORM models
├── database.py                # DB engine + session
├── train_model.py             # Random Forest training script
├── generate_data.py           # 10,000 synthetic rider dataset generator
├── riders_training.csv        # Training dataset
├── model.pkl                  # Trained Random Forest model
├── pincode_risk_map.json      # 75+ pincodes with risk scores
├── model_meta.json            # R², MAE, feature names
├── encoders.json              # Categorical encoding maps
├── requirements.txt           # Python dependencies
└── templates/
    └── index.html             # Full PWA-ready frontend UI
```

---

## 🚀 Running Locally

### Prerequisites
- Python 3.10+
- pip

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/[your-username]/kavaach.git
cd kavaach

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Fill in RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, SERVICENOW_INSTANCE (optional)

# 4. Generate training data
python generate_data.py

# 5. Train the ML model
python train_model.py
# Outputs: model.pkl, model_meta.json

# 6. Start the server
uvicorn main:app --reload --port 8000

# 7. Open in browser
http://localhost:8000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RAZORPAY_KEY_ID` | Yes | Razorpay test/sandbox key |
| `RAZORPAY_KEY_SECRET` | Yes | Razorpay secret key |
| `SERVICENOW_INSTANCE` | Optional | ServiceNow instance URL (mocks if empty) |
| `SERVICENOW_USER` | Optional | ServiceNow username |
| `SERVICENOW_PASS` | Optional | ServiceNow password |

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | System health + model status |
| POST | `/predict` | Calculate weekly premium |
| GET | `/pincode/{pincode}` | Get pincode risk data |
| POST | `/register` | Register rider + create policy |
| GET | `/policy/{rider_id}` | Get active policy |
| GET | `/dashboard/{rider_id}` | Rider dashboard + active triggers |
| POST | `/trigger/manual` | Manually fire a trigger (testing) |
| GET | `/triggers/active` | List all active triggers |
| GET | `/weather/{pincode}` | Live weather + alert status |
| POST | `/payout/{claim_id}` | Process payout for a claim |
| POST | `/payout/release/{claim_id}` | Release held payout |
| GET | `/payouts/{rider_id}` | Rider payout history |
| GET | `/admin/stats` | Platform-wide stats |
| GET | `/admin/claims` | All claims with fraud scores |
| GET | `/admin/riders` | All registered riders |
| GET | `/admin/heatmap` | Risk heatmap across pincodes |
| POST | `/admin/approve/{claim_id}` | Approve and release held payout |
| POST | `/admin/reject/{claim_id}` | Reject a claim |

Full interactive API docs: `http://localhost:8000/docs`

---

## 🗺️ Development Roadmap

| Phase | Period | Theme | Status |
|---|---|---|---|
| Phase 1 | Mar 4–20 | Ideation & Foundation | ✅ Complete |
| Phase 2 | Mar 21–Apr 4 | Automation & Protection | ✅ Complete |
| Phase 3 | Apr 5–17 | Scale & Optimise | ✅ Complete |

### Phase 1 — Delivered
- ML premium engine (R² = 0.9861, MAE = ₹3.82)
- Pincode risk map for 75+ zones across 14 cities
- Anti-spoofing architecture designed
- Working prototype deployed on Render

### Phase 2 — Delivered
- Live weather API integration (Open-Meteo)
- Rider registration, policy management, claims flow
- Automated trigger polling every 15 minutes
- Platform API cross-verification (mock)
- Razorpay sandbox payout integration
- ServiceNow ITSM integration (mock + live)

### Phase 3 — Delivered
- 5-layer fraud detection engine
- Three-tier claim processing (GREEN / YELLOW / RED)
- Insurer analytics dashboard
- No-claim discount accumulation
- Adverse selection lockout during active triggers
- Compliance consent management
- APScheduler for weather polling, stale trigger cleanup, weekly renewal

---

## ✅ Phase 3 Checklist

- [x] Advanced fraud detection (GPS + behavioral + ring + platform + tier logic)
- [x] Instant payout system (Razorpay sandbox UPI)
- [x] Insurer analytics dashboard (stats, claims, heatmap, admin)
- [x] No-claim discount system (up to 15% over 5 weeks)
- [x] Adverse selection lockout during active trigger events
- [x] Complete source code with dependencies and setup instructions
- [x] Deployed live on Render
- [ ] Pitch deck link added (see below)
- [ ] Demo video link added (see below)
- [ ] Repository set to public or access shared with reviewers

---

## 📊 Pitch Deck

> **Link:** _[Add your public Google Slides / Drive link here]_
>
> *(Open the link → File → Share → "Anyone with the link" → Viewer)*

---

## 🎬 Demo Video

> **Link:** _[Add your public YouTube / Drive video link here]_
>
> *(YouTube: set visibility to "Unlisted" or "Public" | Drive: share with "Anyone with the link")*

---

## 📋 Phase 1 Checklist

- [x] Persona defined with real-world scenarios
- [x] Application workflow documented end-to-end
- [x] Weekly premium model explained with formula and fairness cap
- [x] Parametric triggers defined with thresholds and data sources
- [x] Platform choice justified (Web PWA)
- [x] AI/ML integration detailed — current + Phase 2 + Phase 3 plan
- [x] Fraud detection architecture designed (5-layer, anti-syndicate)
- [x] Tech stack outlined with justifications
- [x] 6-week development roadmap
- [x] Working prototype live on Render

---

*Kavaach · Guidewire DEVTrails 2026 · Parametric Insurance for Gig Workers*
*Phase 3 — Scale & Optimise | Submission: April 17, 2026*
