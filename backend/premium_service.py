import razorpay
import os
from dotenv import load_dotenv
from sqlalchemy.orm import Session
from database import SessionLocal
from models import Rider, Policy
from datetime import datetime

load_dotenv()

client = razorpay.Client(
    auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET"))
)


def create_subscription_plan(weekly_amount: float) -> dict:
    """Create a Razorpay plan for weekly premium collection"""
    try:
        plan = client.plan.create({
            "period": "weekly",
            "interval": 1,
            "item": {
                "name": "Kavaach Weekly Premium",
                "amount": int(weekly_amount * 100),  # paise
                "currency": "INR",
                "description": "Parametric insurance weekly premium"
            }
        })
        return {"success": True, "plan_id": plan["id"]}
    except Exception as e:
        # Mock for test mode
        mock_plan_id = f"plan_mock_{int(weekly_amount)}"
        print(f"⚠️ Plan creation mock: {mock_plan_id}")
        return {"success": True, "plan_id": mock_plan_id, "mode": "mock"}


def create_subscription(rider_id: str, plan_id: str,
                         total_count: int = 52) -> dict:
    """Create weekly auto-debit subscription for rider"""
    try:
        subscription = client.subscription.create({
            "plan_id": plan_id,
            "total_count": total_count,     # 52 weeks = 1 year
            "quantity": 1,
            "notes": {
                "rider_id": rider_id,
                "product": "kavaach_insurance"
            }
        })
        return {
            "success": True,
            "subscription_id": subscription["id"],
            "short_url": subscription.get("short_url"),  # payment link for rider
            "mode": "live"
        }
    except Exception as e:
        mock_sub_id = f"sub_mock_{rider_id}"
        print(f"⚠️ Subscription mock: {mock_sub_id}")
        return {
            "success": True,
            "subscription_id": mock_sub_id,
            "short_url": f"https://rzp.io/mock/{rider_id}",
            "mode": "mock"
        }


def create_payment_link(rider_id: str, amount: float,
                         description: str = "Kavaach Weekly Premium") -> dict:
    """One-time payment link for first premium"""
    try:
        link = client.payment_link.create({
            "amount": int(amount * 100),
            "currency": "INR",
            "description": description,
            "customer": {
                "name": "Kavaach Rider",
                "contact": "+919999999999"
            },
            "notify": {"sms": True, "email": False},
            "reminder_enable": True,
            "notes": {"rider_id": rider_id},
            "callback_url": f"{os.getenv('APP_URL', 'http://localhost:8000')}/payment/callback",
            "callback_method": "get"
        })
        return {
            "success": True,
            "payment_link": link["short_url"],
            "payment_link_id": link["id"],
            "amount": amount,
            "mode": "live"
        }
    except Exception as e:
        return {
            "success": True,
            "payment_link": f"https://rzp.io/mock/pay/{rider_id}",
            "payment_link_id": f"plink_mock_{rider_id}",
            "amount": amount,
            "mode": "mock"
        }


def verify_payment(payment_id: str, order_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature after rider pays"""
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature
        })
        return True
    except Exception:
        return False