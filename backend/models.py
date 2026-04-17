from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, ForeignKey, Enum, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
import uuid

def gen_id():
    return str(uuid.uuid4())[:8].upper()

# ─────────────────────────────────────────────────────────────────────────────
# Existing tables (unchanged)
# ─────────────────────────────────────────────────────────────────────────────

class Rider(Base):
    __tablename__ = "riders"

    id                    = Column(String, primary_key=True, default=gen_id)
    name                  = Column(String, nullable=False)
    phone                 = Column(String, unique=True, nullable=False)
    upi_id                = Column(String, nullable=False)
    pincode               = Column(String, nullable=False)
    city                  = Column(String)
    platform              = Column(String, nullable=False)
    delivery_type         = Column(String, nullable=False)
    weekly_earnings       = Column(Float, nullable=False)
    experience_years      = Column(Float, default=1.0)
    cold_chain            = Column(Boolean, default=False)
    medicine_type         = Column(String, default="regular_cold")
    avg_deliveries_per_day = Column(Integer, default=10)
    created_at            = Column(DateTime, default=datetime.utcnow)

    policies  = relationship("Policy", back_populates="rider")
    claims    = relationship("Claim", back_populates="rider")
    consents  = relationship("ConsentRecord", back_populates="rider")
    deletions = relationship("DeletionRequest", back_populates="rider")


class Policy(Base):
    __tablename__ = "policies"

    id               = Column(String, primary_key=True, default=gen_id)
    rider_id         = Column(String, ForeignKey("riders.id"), nullable=False)
    weekly_premium   = Column(Float, nullable=False)
    coverage_amount  = Column(Float, nullable=False)
    status           = Column(String, default="active")
    no_claim_weeks   = Column(Integer, default=0)
    start_date       = Column(DateTime, default=datetime.utcnow)
    next_payment_due = Column(DateTime)
    created_at       = Column(DateTime, default=datetime.utcnow)

    rider  = relationship("Rider", back_populates="policies")
    claims = relationship("Claim", back_populates="policy")


class TriggerEvent(Base):
    __tablename__ = "trigger_events"

    id              = Column(String, primary_key=True, default=gen_id)
    pincode         = Column(String, nullable=False)
    trigger_type    = Column(String, nullable=False)
    severity        = Column(Float)
    threshold_value = Column(Float)
    actual_value    = Column(Float)
    status          = Column(String, default="active")
    fired_at        = Column(DateTime, default=datetime.utcnow)
    resolved_at     = Column(DateTime, nullable=True)

    claims = relationship("Claim", back_populates="trigger")


class Claim(Base):
    __tablename__ = "claims"

    id                   = Column(String, primary_key=True, default=gen_id)
    rider_id             = Column(String, ForeignKey("riders.id"), nullable=False)
    policy_id            = Column(String, ForeignKey("policies.id"), nullable=False)
    trigger_id           = Column(String, ForeignKey("trigger_events.id"), nullable=False)
    fraud_score          = Column(Float, default=0.0)
    tier                 = Column(String)
    status               = Column(String, default="pending")
    payout_amount        = Column(Float, default=0.0)
    held_amount          = Column(Float, default=0.0)
    servicenow_ticket_id = Column(String, nullable=True)
    created_at           = Column(DateTime, default=datetime.utcnow)
    resolved_at          = Column(DateTime, nullable=True)

    rider   = relationship("Rider", back_populates="claims")
    policy  = relationship("Policy", back_populates="claims")
    trigger = relationship("TriggerEvent", back_populates="claims")
    payout  = relationship("Payout", back_populates="claim", uselist=False)


class Payout(Base):
    __tablename__ = "payouts"

    id                 = Column(String, primary_key=True, default=gen_id)
    claim_id           = Column(String, ForeignKey("claims.id"), nullable=False)
    rider_id           = Column(String, nullable=False)
    upi_id             = Column(String, nullable=False)
    amount             = Column(Float, nullable=False)
    razorpay_payout_id = Column(String, nullable=True)
    status             = Column(String, default="pending")
    payout_type        = Column(String, default="full")
    created_at         = Column(DateTime, default=datetime.utcnow)

    claim = relationship("Claim", back_populates="payout")


# ─────────────────────────────────────────────────────────────────────────────
# Phase 3 — Compliance tables (NEW)
# ─────────────────────────────────────────────────────────────────────────────

class ConsentRecord(Base):
    """DPDP Act 2023, Section 6 — purpose-specific, timestamped consent."""
    __tablename__ = "consent_records"

    id           = Column(String, primary_key=True, default=gen_id)
    rider_id     = Column(String, ForeignKey("riders.id"), nullable=True)
    purpose      = Column(String, nullable=False)   # policy_issuance / location_use / fraud_scoring / notifications
    granted      = Column(Boolean, nullable=False, default=True)
    granted_at   = Column(DateTime, default=datetime.utcnow)
    withdrawn_at = Column(DateTime, nullable=True)
    ip_address   = Column(String, nullable=True)
    user_agent   = Column(String, nullable=True)

    rider = relationship("Rider", back_populates="consents")


class AuditLog(Base):
    """IRDAI Cyber Security Guidelines — immutable audit trail for all system actions."""
    __tablename__ = "audit_logs"

    id          = Column(String, primary_key=True, default=gen_id)
    actor       = Column(String, nullable=False)    # rider_id / admin / system
    action      = Column(String, nullable=False)    # consent_given / payout_released / deletion_requested etc.
    entity_type = Column(String, nullable=False)    # rider / policy / claim / payout / consent
    entity_id   = Column(String, nullable=False)
    detail      = Column(Text, nullable=True)       # JSON string of extra context
    created_at  = Column(DateTime, default=datetime.utcnow)


class DeletionRequest(Base):
    """DPDP Act 2023, Section 12 — right to erasure."""
    __tablename__ = "deletion_requests"

    id                = Column(String, primary_key=True, default=gen_id)
    rider_id          = Column(String, ForeignKey("riders.id"), nullable=False)
    requested_at      = Column(DateTime, default=datetime.utcnow)
    status            = Column(String, default="pending")   # pending / completed / rejected_legal_hold
    legal_hold_reason = Column(String, nullable=True)
    completed_at      = Column(DateTime, nullable=True)

    rider = relationship("Rider", back_populates="deletions")


class Grievance(Base):
    """IRDAI Master Circular 2024 — grievance redressal with 14-day TAT."""
    __tablename__ = "grievances"

    id          = Column(String, primary_key=True, default=gen_id)
    rider_id    = Column(String, nullable=False)
    policy_id   = Column(String, nullable=True)
    issue_type  = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    contact     = Column(String, nullable=False)
    status      = Column(String, default="submitted")  # submitted / in_review / resolved / escalated
    created_at  = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
