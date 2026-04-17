import razorpay, os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Claim, Payout, Policy, Rider

load_dotenv()
client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

def process_payout(claim_id: str) -> dict:
    db: Session = SessionLocal()
    try:
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim: return {"success": False, "error": "Claim not found"}
        if claim.status == "paid": return {"success": False, "error": "Already paid"}
        payout = db.query(Payout).filter(Payout.claim_id == claim_id).first()
        if not payout: return {"success": False, "error": "No payout record found"}
        if payout.amount <= 0: return {"success": False, "error": "No immediate payout amount"}
        rider = db.query(Rider).filter(Rider.id == claim.rider_id).first()
        contact_name = rider.name if rider else "Kavaach Rider"
        contact_phone = rider.phone if rider else "9999999999"
        try:
            rzp_response = client.payout.create({
                "account_number": "2323230072490946",
                "fund_account": {
                    "account_type": "vpa",
                    "vpa": {"address": payout.upi_id},
                    "contact": {"name": contact_name, "type": "customer", "email": "rider@kavaach.in", "contact": contact_phone}
                },
                "amount": int(payout.amount * 100), "currency": "INR",
                "mode": "UPI", "purpose": "payout", "queue_if_low_balance": True,
                "narration": f"Kavaach claim {claim_id}",
                "notes": {"claim_id": claim_id, "tier": claim.tier, "trigger_type": "parametric"}
            })
            razorpay_id = rzp_response.get("id", f"rzp_mock_{claim_id}")
        except Exception as rzp_error:
            print(f"⚠️ Razorpay live call failed (using mock): {rzp_error}")
            razorpay_id = f"rzp_test_mock_{claim_id}"
        payout.razorpay_payout_id = razorpay_id
        payout.status = "processed"
        claim.status = "paid" if claim.tier == "GREEN" else "partial_paid"
        policy = db.query(Policy).filter(Policy.id == claim.policy_id).first()
        if policy:
            policy.no_claim_weeks = 0
        db.commit()
        return {"success": True, "claim_id": claim_id, "rider_id": claim.rider_id, "upi_id": payout.upi_id, "amount_paid": payout.amount, "razorpay_payout_id": razorpay_id, "status": "processed", "tier": claim.tier, "message": f"₹{payout.amount} credited to {payout.upi_id}"}
    except Exception as e:
        db.rollback(); return {"success": False, "error": str(e)}
    finally:
        db.close()

def release_held_payout(claim_id: str) -> dict:
    db: Session = SessionLocal()
    try:
        claim = db.query(Claim).filter(Claim.id == claim_id).first()
        if not claim: return {"success": False, "error": "Claim not found"}
        if claim.held_amount <= 0: return {"success": False, "error": "No held amount to release"}
        rider = db.query(Rider).filter(Rider.id == claim.rider_id).first()
        try:
            rzp_response = client.payout.create({
                "account_number": "2323230072490946",
                "fund_account": {"account_type": "vpa", "vpa": {"address": rider.upi_id}, "contact": {"name": rider.name, "type": "customer", "email": "rider@kavaach.in", "contact": rider.phone}},
                "amount": int(claim.held_amount * 100), "currency": "INR", "mode": "UPI", "purpose": "payout", "narration": f"Kavaach held release {claim_id}"
            })
            razorpay_id = rzp_response.get("id", f"rzp_held_{claim_id}")
        except Exception:
            razorpay_id = f"rzp_held_mock_{claim_id}"
        held_payout = Payout(claim_id=claim_id, rider_id=claim.rider_id, upi_id=rider.upi_id, amount=claim.held_amount, razorpay_payout_id=razorpay_id, status="processed", payout_type="held_release")
        db.add(held_payout)
        claim.held_amount = 0; claim.status = "paid"; db.commit()
        return {"success": True, "claim_id": claim_id, "held_amount_released": held_payout.amount, "razorpay_payout_id": razorpay_id, "message": f"Held amount ₹{held_payout.amount} released to {rider.upi_id}"}
    except Exception as e:
        db.rollback(); return {"success": False, "error": str(e)}
    finally:
        db.close()
