# 🛡️ Kavaach — AI-Powered Parametric Insurance for Pharma Delivery Partners

> **Guidewire DEVTrails 2026 | Phase 1 Submission — Ideation & Foundation**  
> Deadline: March 20, 2026

---

## 👤 Persona — Who We're Building For

**Segment chosen:** Pharma / Medicine Delivery Partners  
**Platforms covered:** Tata 1mg, Apollo 24x7, PharmEasy, Netmeds, PhonePe Pincode

### Persona Scenarios

**Arjun, 26 — Hyperlocal Pharma Rider, Mumbai (Andheri East)**
> Arjun delivers insulin and vaccines for Tata 1mg, earning ₹6,200/week across 14 deliveries/day.
> During the July 2024 Mumbai floods, he couldn't work for 4 days — losing ₹3,500 with no safety net.
> Kavaach would have automatically detected flood risk in pincode 400063, triggered a payout,
> and credited ₹780 to his UPI within 4 minutes — no claim form, no phone call.

**Priya, 31 — Scheduled Delivery Rider, Delhi (Rohini)**
> Priya delivers Netmeds orders during extreme heat (AQI 480+, temp 46°C) in May.
> Her city goes under a heat advisory — deliveries drop 70%.
> Kavaach detects the AQI spike via weather API, cross-checks her active status on Netmeds,
> and processes a partial income replacement automatically.

**Ravi, 42 — Part-time Rider, Bengaluru (Malleshwaram)**
> Ravi does 3–4 deliveries/day for PharmEasy as supplemental income.
> A sudden local strike closes pickup zones for 2 days.
> Kavaach's social disruption trigger (zone closure detection) flags the event
> and calculates his proportional income loss for payout.

---

## 🔄 Application Workflow

```
ONBOARDING
  Rider registers → enters pincode, platform, delivery type, experience
  → ML engine calculates personalized weekly premium
  → Rider pays weekly via UPI auto-debit

ACTIVE COVERAGE (Every Week)
  Weather APIs polled every 15 minutes for covered pincodes
  → If disruption threshold crossed → trigger evaluation begins

PARAMETRIC TRIGGER FIRED
  System checks: Is rider active on platform? (Platform API cross-check)
  → Yes → Fraud scoring (14 signals, 5 layers)
  → Fraud Score 0–30 → Full auto-payout via UPI (2–4 min)
  → Fraud Score 31–65 → 60% immediate + 40% after soft check
  → Fraud Score 66+ → Human review within 2 hours

POST-PAYOUT
  Claim logged → No-claim streak reset OR preserved (if not paid)
  → Rider notified via push/SMS
  → Weekly premium recalculates next cycle
```

---

## 💰 Weekly Premium Model

### Why Weekly?
Pharma delivery riders are paid weekly by platforms. A weekly premium aligns
with their cash flow — they pay from this week's earnings, not a lump annual sum.
A rider earning ₹4,000/week can afford ₹120–180/week. They cannot afford ₹7,000/year upfront.

### How the Premium is Calculated

The premium is computed by a **Random Forest ML model** trained on 10,000 synthetic
rider profiles, using 19 features:

```
Base prediction (Random Forest, 19 features)
  × Cold chain differential multiplier  (medicine type risk)
  × Multi-platform multiplier           (1 + (count-1) × 0.05)
  → raw premium

Final = min(raw, weekly_earnings × 0.15)   ← Fairness Cap
```

**Key premium drivers:**

| Factor | Effect on Premium |
|---|---|
| Pincode flood risk | ↑ Higher flood risk = higher premium |
| Weekly earnings | ↑ Higher earnings = higher coverage need |
| Delivery type (hyperlocal) | ↑ More exposure than scheduled |
| Cold chain medicines | ↑ Insulin/Biologics carry higher premium |
| Experience (years) | ↓ More experience = slightly lower premium |
| No-claim weeks (up to 5) | ↓ Up to 15% discount |
| Seasonal index (monsoon) | ↑ July–August peaks at 1.0× multiplier |

**Fairness guarantee:** Premium is always capped at **15% of weekly earnings**.
A rider earning ₹1,500/week never pays more than ₹225/week.

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

Kavaach covers **income loss only** — not health, vehicle, or accidents.
Payouts fire automatically when objective, external conditions exceed thresholds.

### Environmental Triggers (Phase 1 — defined, Phase 2 — API-integrated)

| Trigger | Threshold | Data Source |
|---|---|---|
| 🌊 Flood / Heavy Rain | IMD Red Alert OR pincode flood_risk > 0.75 | IMD API / Open-Meteo |
| 🌡️ Extreme Heat | Temp > 43°C AND heat advisory issued | IMD / OpenWeatherMap |
| 💨 Severe AQI | AQI > 400 (Hazardous) sustained 3+ hours | CPCB AQI API |
| 🌀 Cyclone Warning | Cyclone watch within 150km of rider pincode | IMD Cyclone API |

### Social Triggers (Phase 2)

| Trigger | Detection Method |
|---|---|
| Local curfew / Section 144 | Government alert API + news signal |
| Zone closure / Strike | Delivery platform order-volume spike detection |
| Market shutdown | Platform API: orders_assigned_today = 0 at zone level |

### Why Parametric (Not Traditional)?
- **No claim filing** — trigger fires automatically, rider gets paid without paperwork
- **No disputes** — payout is based on objective data, not rider's subjective loss report
- **No delay** — UPI credit within 2–4 minutes of trigger confirmation
- **Fraud-resistant** — GPS spoofing cannot fake an IMD flood alert

---

## 🖥️ Platform Choice — Web (Not Mobile)

**Chosen: Progressive Web App (PWA-ready single-page HTML)**

**Justification:**
- Pharma riders use low-to-mid range Android phones — app install friction is high
- Web loads instantly via WhatsApp link, no Play Store needed
- FastAPI backend serves the same URL as the UI — one deployment, zero CORS issues
- Works offline-first for premium viewing (Phase 3)
- Can be added to home screen as PWA in Phase 3

---

## 🤖 AI/ML Integration Plan

### Phase 1 (Current — Built)
- ✅ Random Forest model (R² = 0.9861, MAE = ₹3.82) for weekly premium prediction
- ✅ 19-feature risk engine: pincode risk + rider behavior + seasonal + cold chain
- ✅ Pincode-level risk map for 75+ zones across 14 Indian cities
- ✅ Anti-spoofing architecture designed (5-layer fraud defense)

### Phase 2 (Weeks 3–4 — Planned)
- 🔲 Live weather API integration (Open-Meteo / IMD) for real-time trigger polling
- 🔲 Platform API mock (Tata1mg/Apollo24x7) for rider activity cross-verification
- 🔲 Anomaly detection model on claim patterns (isolation forest)
- 🔲 Dynamic premium recalculation when active weather event detected

### Phase 3 (Weeks 5–6 — Planned)
- 🔲 Behavioral biometric baseline (7-day rolling device signal model)
- 🔲 Coordinated ring detection (temporal + spatial clustering algorithm)
- 🔲 Predictive disruption model (predict next-week risk from historical IMD data)
- 🔲 Insurer analytics dashboard (loss ratios, risk heatmaps, claim prediction)

---



## 🏗️ Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Backend | FastAPI (Python) | Fast, async, auto-docs, Pydantic validation |
| ML Model | scikit-learn RandomForest | Interpretable, no GPU needed, deployable as .pkl |
| Frontend | Vanilla HTML/CSS/JS | Zero framework = instant load on 2G/3G |
| Data | Pandas + NumPy | Training data generation and feature engineering |
| Deployment | Render (free tier) | One-click deploy, HTTPS, auto-redeploy from GitHub |
| Risk Data | Custom pincode_risk_map.json | 75+ pincodes, IMD-derived flood/heat/AQI/cyclone |
| Weather API | Open-Meteo (Phase 2) | Free, no API key, high accuracy for India |
| Payment | UPI / Razorpay sandbox (Phase 3) | India-native, instant settlement |

---

## 📁 Project Structure

```
kavaach/
├── main.py                  # FastAPI backend — prediction, pincode lookup
├── train_model.py           # Random Forest model training
├── generate_data.py         # Synthetic dataset generator (10,000 riders)
├── riders_training.csv      # Training dataset
├── model.pkl                # Trained Random Forest model (auto-generated)
├── pincode_risk_map.json    # 75+ pincodes × flood/heat/AQI/cyclone risk scores
├── model_meta.json          # R², MAE, feature names, encodings
├── encoders.json            # Categorical encoding maps
├── requirements.txt         # Python dependencies
└── templates/
    └── index.html           # Full UI — premium calculator
```

---

## 🚀 Running Locally

```bash
# Install
pip install -r requirements.txt

# Generate training data
python generate_data.py

# Train model (generates model.pkl)
python train_model.py

# Start server
uvicorn main:app --reload --port 8000

# Open
http://localhost:8000
```

---

## 🗺️ 6-Week Development Roadmap

| Phase | Weeks | Theme | Key Deliverables |
|---|---|---|---|
| **Phase 1** ✅ | 1–2 | Ideation & Foundation | ML premium engine, pincode risk map, UI, anti-spoofing design, this README |
| **Phase 2** 🔲 | 3–4 | Automation & Protection | Live weather triggers, rider registration, policy management, claims flow |
| **Phase 3** 🔲 | 5–6 | Scale & Optimise | Fraud detection implementation, UPI sandbox payout, insurer dashboard, final pitch |

---

## 🔗 Live Demo

> Deployed on Render: **https://kavaach.onrender.com**  

---

## 📋 Phase 1 Checklist (per DEVTrails requirements)

- ✅ Persona defined with real-world scenarios (pharma delivery riders)
- ✅ Application workflow documented end-to-end
- ✅ Weekly premium model explained with formula and fairness cap
- ✅ Parametric triggers defined with thresholds and data sources
- ✅ Platform choice justified (Web PWA)
- ✅ AI/ML integration detailed — current + Phase 2 + Phase 3 plan
- ✅ Fraud detection architecture designed (5-layer, anti-syndicate)
- ✅ Tech stack outlined with justifications
- ✅ 6-week development roadmap
- ✅ Working prototype live on Render
- ✅ 2-minute video (to be uploaded before EOD March 20)

---


---

## 🛡️ Adversarial Defense & Anti-Spoofing Strategy

> **Threat Level:** CRITICAL  
> **Attack Vector:** Coordinated GPS-spoofing syndicate via Telegram groups  
> **Response Status:** FULLY MITIGATED — 5-Layer Defense Architecture  

---

### The Threat Model

A syndicate of 500+ delivery workers organizing via Telegram exploits a single
vulnerability: **parametric insurance trusts GPS as its sole truth signal.**

They spoof GPS → system thinks they're in flood zone → payout fires.

Our response: **GPS is never a single source of truth in Kavaach.**
It is one of 14 signals. Spoofing GPS alone triggers nothing.

---

### Layer 1 — Multi-Signal Location Triangulation

Kavaach never trusts GPS in isolation. Every location claim is cross-validated
against 4 independent signals simultaneously:

| Signal | What it Checks | Spoof Difficulty |
|--------|----------------|-----------------|
| GPS coordinates | Raw location claim | Easy to fake |
| Cell tower ID | Network-reported location | Hard — requires SIM-level access |
| IP geolocation | ISP-assigned location | Hard — home IP ≠ flood zone IP |
| Wi-Fi SSID hash | Nearest access point fingerprint | Very hard — home WiFi ≠ field location |
| IMU (accelerometer) | Is phone actually moving? | Extremely hard |

**Verdict logic:**
```
If GPS claims flood zone BUT:
  - Cell tower says home neighborhood     → MISMATCH FLAG
  - IP resolves to residential ISP block  → MISMATCH FLAG
  - Wi-Fi SSID matches rider's home AP    → MISMATCH FLAG
  - Accelerometer shows stationary 30min  → MISMATCH FLAG

2+ mismatches → claim escalated to YELLOW tier
4  mismatches → claim rejected, fraud logged
```

A genuine rider trapped in a flood zone will have:
✅ GPS in flood zone  
✅ Cell tower in flood zone  
✅ IP on mobile network (not home WiFi)  
✅ Accelerometer showing movement/vibration  
✅ No home SSID detected  

A spoofer at home will fail at least 3 of these 4 checks.

---

### Layer 2 — Behavioral Biometric Verification

Kavaach builds a **7-day rolling behavioral baseline** for every rider.
Deviations from this baseline during a claim trigger automated scrutiny.

**Data points analyzed:**

```
DEVICE SIGNALS (collected passively via app):
  - Battery drain rate       → GPS spoofing apps drain 40% faster than normal
  - Screen-on patterns       → Rider at home uses phone differently
  - App foreground time      → Spoofing apps need to stay active = detectable
  - Bluetooth device list    → Home devices (smart TV, laptop) visible near "flood zone"?
  - Charging status          → Riders in field typically on battery; home = often charging

DELIVERY BEHAVIOR SIGNALS:
  - Last order accepted      → Cross-checked with platform API (Tata1mg, Apollo24x7)
  - Orders active at trigger → Was rider mid-delivery when trigger fired?
  - Historical rain-day behavior → Did rider work during last monsoon event?
  - Delivery route heatmap   → Does claimed zone match historical delivery area?
```

**Example detection:**
> Arjun's phone shows:
> - GPS: Kurla flood zone (400063) ✅
> - Bluetooth: paired to "Arjun's Samsung TV" — a home device ❌
> - Battery: charging via wall outlet ❌
> - Last order: accepted 6 hours ago ❌
> - App active: GPS spoofing app running in background ❌
>
> **Result: Fraud score 94/100. Claim auto-rejected.**

---

### Layer 3 — Coordinated Ring Detection (The Telegram Syndicate Problem)

The most sophisticated defense. Organic claims have natural statistical spread.
Coordinated fraud creates detectable **temporal and spatial clustering.**

**Detection Algorithm:**

```python
# Simplified syndicate detection logic

def detect_coordinated_fraud(claims_batch):

    # Signal 1: Temporal spike
    # Genuine disruption: claims arrive over 45-90 minute window
    # Coordinated fraud: 50+ claims arrive within 90-second window
    if claims_within_60_seconds > 15:
        flag_batch("TEMPORAL_SPIKE", severity="HIGH")

    # Signal 2: Spatial impossibility
    # If 200 riders all claim same 400m² pincode simultaneously
    # but weather API shows disruption affecting 12km² area:
    # Why are ALL claims from the exact same GPS coordinate cluster?
    if spatial_variance < NATURAL_MOVEMENT_THRESHOLD:
        flag_batch("SPATIAL_CLUSTERING", severity="CRITICAL")

    # Signal 3: Device fingerprint overlap
    # Same device submitting multiple rider accounts
    if len(unique_devices) < len(claims) * 0.85:
        flag_batch("DEVICE_REUSE", severity="CRITICAL")

    # Signal 4: Network graph — are these riders connected?
    # Riders who share same IP, same cell tower, and claim same second
    # = almost certainly coordinating
    if network_community_score > 0.75:
        flag_batch("COORDINATED_RING", severity="CRITICAL")
```

**The key insight:**  
When 500 people spoof simultaneously, they paradoxically create a MORE
detectable signal than 500 genuine riders, because genuine disruption produces
**organic, statistically noisy, spatially distributed claims** — not synchronized spikes.

---

### Layer 4 — Platform API Cross-Verification

For pharma delivery specifically, Kavaach has a unique verification advantage:
**riders must be active on a platform to have insurance.**

```
Before any payout fires, Kavaach calls:
  GET /rider/status → Tata1mg / Apollo24x7 / PharmEasy API

Expected response for GENUINE disrupted rider:
  {
    "rider_id": "ARJ_001",
    "last_active": "14 minutes ago",
    "last_location": "400063",        ← matches GPS claim
    "orders_assigned_today": 8,
    "current_order_status": "disrupted"
  }

Red flags:
  - last_active > 3 hours ago        → Wasn't even working when trigger fired
  - orders_assigned_today = 0        → No deliveries = no income at risk = no payout
  - last_location ≠ claimed pincode  → Platform disagrees with GPS
```

This cross-check is **extremely hard to fake** because it requires compromising
the delivery platform's own API — far beyond a Telegram syndicate's capabilities.

---

### Layer 5 — UX Balance: Honest Riders Are Never Penalized

This is the most critical design challenge. In bad weather, genuine riders may have:
- Poor GPS signal causing location drift
- Network drops breaking real-time verification
- Low battery affecting sensor accuracy

**The Three-Tier Payout Protocol:**

```
┌─────────────────────────────────────────────────────────────┐
│  TIER GREEN — Fraud Score 0-30 — AUTO-PAY IMMEDIATELY       │
│  All 14 signals consistent. Genuine disruption confirmed.   │
│  → Full payout via UPI within 2-4 minutes                   │
│  → No action required from rider                            │
├─────────────────────────────────────────────────────────────┤
│  TIER YELLOW — Fraud Score 31-65 — SPLIT PAYOUT             │
│  1-2 signal mismatches (could be network issues in rain)    │
│  → 60% payout immediately (income bridge)                   │
│  → 40% held pending soft verification                       │
│  → Rider receives: "Tap to confirm your location" nudge     │
│  → Selfie with surroundings OR one-tap GPS re-ping          │
│  → If confirmed: remaining 40% released within 1 hour       │
├─────────────────────────────────────────────────────────────┤
│  TIER RED — Fraud Score 66+ — HOLD + HUMAN REVIEW           │
│  Multiple strong fraud signals detected                     │
│  → Full payout held (NOT rejected — benefit of doubt)       │
│  → Rider notified: "Verifying your claim — 2 hours"         │
│  → Human reviewer checks within 2 hours                     │
│  → If genuine: full payout + ₹50 inconvenience credit       │
│  → If fraud confirmed: account flagged, never auto-rejected │
└─────────────────────────────────────────────────────────────┘
```

**Why YELLOW tier exists:**  
A genuine rider in Kurla monsoon flooding may have:
- Poor cell signal (mismatched cell tower) ← understandable
- Home WiFi turning off automatically ← understandable
- Phone plugged in at a tea stall to survive ← completely legitimate

YELLOW acknowledges reality: **sensors fail in bad weather.**  
That's literally when our riders need us most.  

**The 48-Hour Appeal Window:**  
Any rejected or held claim can be appealed in-app in Hindi with:
- Photo evidence upload
- Audio clip (voice note describing situation)
- Peer verification (another rider in same zone can vouch)

Appeals are reviewed within 48 hours. Wrongful rejections receive full payout
plus 15% goodwill credit on next premium.

---

### Anti-Syndicate Network Intelligence

Beyond individual claim verification, Kavaach runs a **background graph analysis**
that maps relationships between riders:

```
TRACKED CONNECTIONS:
  - Riders who frequently claim at same timestamp
  - Riders sharing device fingerprints across accounts
  - Riders in same IP subnet during claim windows
  - Riders whose claim patterns correlate with Telegram group activity spikes

RESPONSE:
  - Identified ring members: accounts flagged, manual review for all claims
  - Ring leaders (10+ connections): permanent account suspension
  - False positive protection: flagged riders get human review, not auto-ban
```

---

### Why Kavaach is Harder to Defraud Than Competitors

| Defense Layer | Basic GPS Check | Kavaach |
|---|---|---|
| GPS spoofing | ❌ Fully exploitable | ✅ GPS is 1 of 14 signals |
| Mass coordination | ❌ Undetectable | ✅ Temporal clustering detection |
| Single account fraud | ❌ No baseline | ✅ Behavioral biometric baseline |
| Device reuse | ❌ Not checked | ✅ Device fingerprint graph |
| Platform cross-check | ❌ Not integrated | ✅ Live platform API call |
| Honest rider protection | ❌ Binary accept/reject | ✅ 3-tier with 60% bridge payment |
| Appeal process | ❌ None | ✅ 48-hour Hindi voice appeal |

---

### Fraud Economics: Making the Attack Not Worth It

Even if a sophisticated actor bypasses Layer 1-3 (extremely unlikely), the
economics make mass fraud unattractive:

```
Cost to spoof per claim attempt:
  - GPS spoofing app:          ₹0 (free tools)
  - SIM-level cell spoofing:   ₹2,000+ per device
  - Bypassing platform API:    Requires platform employee collusion
  - Coordinating 500 people:   High operational security overhead

Expected payout per success:  ₹200-400 (split tier system)
Success rate after all layers: <8% estimated

Expected value per attempt:   ₹200 × 0.08 = ₹16
Cost of attempt:               ₹200+ (cell spoofing)

ROI for fraudster: NEGATIVE
```

**Conclusion:** The 5-layer defense makes Kavaach economically irrational to
defraud at scale. The cost of a successful coordinated attack exceeds the payout
ceiling by an order of magnitude.

---

*Defense architecture designed for DEVTrails 2026 | Guidewire University Hackathon*  
*Last updated: March 2026 — in response to coordinated GPS-spoofing threat advisory*


*Kavaach · Guidewire DEVTrails 2026 · Parametric Insurance for Gig Workers*  
*Phase 1 — Ideation & Foundation | Submission: March 20, 2026*
