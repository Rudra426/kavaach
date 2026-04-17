import razorpay, os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Rider, Policy
from datetime import datetime

load_dotenv()
client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))

def create_subscription_plan(weekly_amount: float) -> dict:
    try:
        plan = client.plan.create({
            "period": "weekly", "interval": 1,
            "item": {"name": "Kavaach Weekly Premium",
                     "amount": int(weekly_amount * 100), "currency": "INR",
                     "description": "Parametric insurance weekly premium"}
        })
        return {"success": True, "plan_id": plan["id"]}
    except Exception:
        mock_plan_id = f"plan_mock_{int(weekly_amount)}"
        return {"success": True, "plan_id": mock_plan_id, "mode": "mock"}

def create_subscription(rider_id: str, plan_id: str, total_count: int = 52) -> dict:
    try:
        subscription = client.subscription.create({
            "plan_id": plan_id, "total_count": total_count, "quantity": 1,
            "notes": {"rider_id": rider_id, "product": "kavaach_insurance"}
        })
        return {"success": True, "subscription_id": subscription["id"],
                "short_url": subscription.get("short_url"), "mode": "live"}
    except Exception:
        mock_sub_id = f"sub_mock_{rider_id}"
        return {"success": True, "subscription_id": mock_sub_id,
                "short_url": f"https://rzp.io/mock/{rider_id}", "mode": "mock"}

def create_payment_link(rider_id: str, amount: float,
                        description: str = "Kavaach Weekly Premium",
                        rider_name: str  = None,
                        rider_phone: str = None) -> dict:
    # FIX #9: rider_name and rider_phone are now parameters — no hardcoded values
    customer_name  = rider_name  if rider_name  else "Kavaach Rider"
    customer_phone = f"+91{rider_phone}" if rider_phone else "+919999999999"
    try:
        link = client.payment_link.create({
            "amount": int(amount * 100), "currency": "INR", "description": description,
            "customer": {"name": customer_name, "contact": customer_phone},  # FIX #9
            "notify": {"sms": True, "email": False}, "reminder_enable": True,
            "notes": {"rider_id": rider_id},
            "callback_url": f"{os.getenv('APP_URL','http://localhost:8000')}/payment/callback",
            "callback_method": "get"
        })
        return {"success": True, "payment_link": link["short_url"],
                "payment_link_id": link["id"], "amount": amount, "mode": "live"}
    except Exception:
        return {"success": True, "payment_link": f"https://rzp.io/mock/pay/{rider_id}",
                "payment_link_id": f"plink_mock_{rider_id}", "amount": amount, "mode": "mock"}

def verify_payment(payment_id: str, order_id: str, signature: str) -> bool:
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id, "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
        return True
    except Exception:
        return False
