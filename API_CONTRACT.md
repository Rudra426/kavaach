# Kavaach API Contract
Base URL (local): http://localhost:8000
Base URL (prod):  https://kavaach.onrender.com

---

## 1. REGISTER RIDER
POST /register

Request:
{
  "name": "Arjun Sharma",
  "phone": "9876543210",
  "upi_id": "arjun@upi",
  "pincode": "400063",
  "platforms": ["tata1mg"],
  "delivery_type": "hyperlocal",
  "weekly_earnings": 6200,
  "experience_years": 2,
  "cold_chain": true,
  "medicine_type": "insulin",
  "avg_deliveries_per_day": 14
}

Response:
{
  "success": true,
  "rider_id": "85BDDE83",
  "policy_id": "D13C3000",
  "name": "Arjun Sharma",
  "city": "Mumbai",
  "weekly_premium": 315.28,
  "coverage_amount": 163945.60,
  "next_payment_due": "2026-03-31T05:29:14",
  "risk_score": 3.28,
  "risk_level": "Medium",
  "message": "Welcome to Kavaach, Arjun Sharma! Your policy is active."
}

---

## 2. GET POLICY
GET /policy/{rider_id}

Response:
{
  "policy_id": "D13C3000",
  "rider_id": "85BDDE83",
  "name": "Arjun Sharma",
  "phone": "9876543210",
  "pincode": "400063",
  "city": "Mumbai",
  "platform": "tata1mg",
  "delivery_type": "hyperlocal",
  "weekly_premium": 315.28,
  "coverage_amount": 163945.60,
  "status": "active",
  "no_claim_weeks": 0,
  "next_payment_due": "2026-03-31T05:29:14",
  "start_date": "2026-03-24T05:29:14"
}

---

## 3. GET DASHBOARD
GET /dashboard/{rider_id}

Response:
{
  "rider": {
    "id": "85BDDE83",
    "name": "Arjun Sharma",
    "pincode": "400063",
    "city": "Mumbai",
    "platform": "tata1mg"
  },
  "policy": {
    "id": "D13C3000",
    "status": "active",
    "weekly_premium": 315.28,
    "coverage_amount": 163945.60,
    "no_claim_weeks": 0,
    "next_payment_due": "2026-03-31T05:29:14"
  },
  "claims": [
    {
      "id": "5459697F",
      "trigger_id": "D347A4A6",
      "fraud_score": 0,
      "tier": "GREEN",
      "status": "paid",
      "payout_amount": 945.84,
      "created_at": "2026-03-24T05:41:18"
    }
  ],
  "active_triggers": [],
  "weather_alert": false
}

---

## 4. PINCODE LOOKUP
GET /pincode/{pincode}

Response:
{
  "found": true,
  "risk_score": 3.28,
  "risk_level": "Medium",
  "area": "Andheri East",
  "city": "Mumbai",
  "zone": "residential",
  "risks": {
    "flood": 0.75,
    "heat": 0.50,
    "aqi": 0.45,
    "cyclone": 0.20,
    "coastal": 0
  }
}

---

## 5. PREMIUM CALCULATOR (Phase 1 — keep working)
POST /predict

Request: (same fields as /register minus name/phone/upi_id)
Response:
{
  "weekly_premium": 315.28,
  "monthly_premium": 1365.16,
  "annual_premium": 16394.56,
  "coverage_amount": 163945.60,
  "risk_score": 3.28,
  "risk_level": "Medium",
  "cap_applied": false,
  "city": "Mumbai",
  "area": "Andheri East",
  "zone": "residential"
}

---

## 6. ACTIVE TRIGGERS
GET /triggers/active

Response:
[
  {
    "id": "D347A4A6",
    "pincode": "400063",
    "type": "flood",
    "severity": 1.13,
    "actual_value": 85,
    "fired_at": "2026-03-24T05:41:18"
  }
]

---

## 7. MANUAL TRIGGER (demo only)
POST /trigger/manual?pincode=400063&trigger_type=flood&actual_value=85

Response:
{
  "trigger_id": "D347A4A6",
  "trigger_type": "flood",
  "pincode": "400063",
  "claims_result": {
    "triggered": 1,
    "claims": [...]
  }
}

---

## 8. FIRE PAYOUT
POST /payout/{claim_id}

Response:
{
  "success": true,
  "claim_id": "5459697F",
  "rider_id": "85BDDE83",
  "upi_id": "arjun@upi",
  "amount_paid": 945.84,
  "razorpay_payout_id": "rzp_test_mock_5459697F",
  "status": "processed",
  "tier": "GREEN",
  "message": "₹945.84 credited to arjun@upi"
}

---

## 9. PAYOUT HISTORY
GET /payouts/{rider_id}

Response:
[
  {
    "id": "FDF3490C",
    "claim_id": "5459697F",
    "amount": 945.84,
    "upi_id": "arjun@upi",
    "razorpay_payout_id": "rzp_test_mock_5459697F",
    "status": "processed",
    "payout_type": "full",
    "created_at": "2026-03-24T05:49:37"
  }
]

---

## 10. ADMIN STATS
GET /admin/stats

Response:
{
  "total_riders": 1,
  "active_policies": 1,
  "total_claims": 2,
  "total_payouts": 2,
  "total_paid_amount": 945.84
}

---

## 11. ADMIN CLAIMS QUEUE
GET /admin/claims

Response:
[
  {
    "id": "5459697F",
    "rider_id": "85BDDE83",
    "policy_id": "D13C3000",
    "fraud_score": 0,
    "tier": "GREEN",
    "status": "paid",
    "payout_amount": 945.84,
    "held_amount": 0,
    "servicenow_ticket_id": null,
    "created_at": "2026-03-24T05:41:18"
  }
]

---

## 12. ADMIN RIDERS LIST
GET /admin/riders

---

## 13. ADMIN HEATMAP
GET /admin/heatmap

Response:
[
  {
    "pincode": "400063",
    "city": "Mumbai",
    "area": "Andheri East",
    "risk_score": 3.28,
    "active_riders": 1,
    "active_triggers": 0,
    "flood_risk": 0.75,
    "heat_risk": 0.50,
    "aqi_risk": 0.45
  }
]

---

## 14. ADMIN APPROVE CLAIM
POST /admin/approve/{claim_id}

---

## 15. ADMIN REJECT CLAIM
POST /admin/reject/{claim_id}

---

## 16. HEALTH CHECK
GET /health

Response:
{
  "status": "ready",
  "message": "Kavaach API v2 ✅",
  "model_loaded": true,
  "pincodes_loaded": 75,
  "model_r2": 0.9861,
  "model_mae": 3.82
}

---

## TIER LOGIC (for UI color coding)
GREEN  → fraud_score 0–30  → auto paid immediately
YELLOW → fraud_score 31–65 → 60% paid + 40% held
RED    → fraud_score 66+   → full hold, human review

## STATUS VALUES
Claim status:  pending / approved / partial_paid / paid / rejected / review
Policy status: active / expired / suspended
Payout status: pending / processed / failed
Trigger type:  flood / heat / aqi / cyclone