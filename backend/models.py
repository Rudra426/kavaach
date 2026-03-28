from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

def gen_id():
    return str(uuid.uuid4())[:8].upper()

class Rider(Base):
    __tablename__ = "riders"

    id            = Column(String, primary_key=True, default=gen_id)
    name          = Column(String, nullable=False)
    phone         = Column(String, unique=True, nullable=False)
    upi_id        = Column(String, nullable=False)
    pincode       = Column(String, nullable=False)
    city          = Column(String)
    platform      = Column(String, nullable=False)
    delivery_type = Column(String, nullable=False)
    weekly_earnings = Column(Float, nullable=False)
    experience_years = Column(Float, default=1.0)
    cold_chain    = Column(Boolean, default=False)
    medicine_type = Column(String, default="regular_cold")
    avg_deliveries_per_day = Column(Integer, default=10)
    created_at    = Column(DateTime, default=datetime.utcnow)

    policies = relationship("Policy", back_populates="rider")
    claims   = relationship("Claim", back_populates="rider")


class Policy(Base):
    __tablename__ = "policies"

    id               = Column(String, primary_key=True, default=gen_id)
    rider_id         = Column(String, ForeignKey("riders.id"), nullable=False)
    weekly_premium   = Column(Float, nullable=False)
    coverage_amount  = Column(Float, nullable=False)
    status           = Column(String, default="active")   # active / expired / suspended
    no_claim_weeks   = Column(Integer, default=0)
    start_date       = Column(DateTime, default=datetime.utcnow)
    next_payment_due = Column(DateTime)
    created_at       = Column(DateTime, default=datetime.utcnow)

    rider  = relationship("Rider", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")


class TriggerEvent(Base):
    __tablename__ = "trigger_events"

    id             = Column(String, primary_key=True, default=gen_id)
    pincode        = Column(String, nullable=False)
    trigger_type   = Column(String, nullable=False)  # flood / heat / aqi / cyclone
    severity       = Column(Float)
    threshold_value = Column(Float)
    actual_value   = Column(Float)
    status         = Column(String, default="active")  # active / resolved
    fired_at       = Column(DateTime, default=datetime.utcnow)
    resolved_at    = Column(DateTime, nullable=True)

    claims = relationship("Claim", back_populates="trigger")


class Claim(Base):
    __tablename__ = "claims"

    id             = Column(String, primary_key=True, default=gen_id)
    rider_id       = Column(String, ForeignKey("riders.id"), nullable=False)
    policy_id      = Column(String, ForeignKey("policies.id"), nullable=False)
    trigger_id     = Column(String, ForeignKey("trigger_events.id"), nullable=False)
    fraud_score    = Column(Float, default=0.0)
    tier           = Column(String)          # GREEN / YELLOW / RED
    status         = Column(String, default="pending")  # pending / approved / rejected / paid
    payout_amount  = Column(Float, default=0.0)
    held_amount    = Column(Float, default=0.0)
    servicenow_ticket_id = Column(String, nullable=True)
    created_at     = Column(DateTime, default=datetime.utcnow)
    resolved_at    = Column(DateTime, nullable=True)

    rider   = relationship("Rider", back_populates="claims")
    policy  = relationship("Policy", back_populates="claims")
    trigger = relationship("TriggerEvent", back_populates="claims")
    payout  = relationship("Payout", back_populates="claim", uselist=False)


class Payout(Base):
    __tablename__ = "payouts"

    id               = Column(String, primary_key=True, default=gen_id)
    claim_id         = Column(String, ForeignKey("claims.id"), nullable=False)
    rider_id         = Column(String, nullable=False)
    upi_id           = Column(String, nullable=False)
    amount           = Column(Float, nullable=False)
    razorpay_payout_id = Column(String, nullable=True)
    status           = Column(String, default="pending")  # pending / processed / failed
    payout_type      = Column(String, default="full")     # full / partial / held_release
    created_at       = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="payout")
