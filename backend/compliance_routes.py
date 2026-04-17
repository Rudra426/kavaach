from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
import json

from database import get_db
from models import ConsentRecord, AuditLog, DeletionRequest, Grievance, Rider
from schemas_compliance import ConsentPayloadIn, WithdrawConsentIn, GrievanceIn

router = APIRouter(prefix="/compliance", tags=["Compliance (Phase 3)"])


# ── POST /compliance/consent/{rider_id} ───────────────────────────────────────
# Called after registration to save consent tied to a rider ID
@router.post("/consent/{rider_id}")
def save_consent(rider_id: str, payload: ConsentPayloadIn, request: Request, db: Session = Depends(get_db)):
    items = payload.model_dump(exclude={"timestamp"})
    for purpose, granted in items.items():
        record = ConsentRecord(
            rider_id=rider_id,
            purpose=purpose,
            granted=bool(granted),
            granted_at=datetime.utcnow(),
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        db.add(record)

    db.add(AuditLog(
        actor=rider_id,
        action="consent_given_at_registration",
        entity_type="consent",
        entity_id=rider_id,
        detail=json.dumps(items),
    ))
    db.commit()
    return {"message": "Consent saved", "rider_id": rider_id}


# ── PATCH /compliance/consent/{rider_id}/withdraw ─────────────────────────────
# Called from Privacy Dashboard to withdraw a specific consent
@router.patch("/consent/{rider_id}/withdraw")
def withdraw_consent(rider_id: str, payload: WithdrawConsentIn, db: Session = Depends(get_db)):
    consent = (
        db.query(ConsentRecord)
        .filter(
            ConsentRecord.rider_id == rider_id,
            ConsentRecord.purpose == payload.purpose,
            ConsentRecord.granted == True,
            ConsentRecord.withdrawn_at.is_(None),
        )
        .order_by(ConsentRecord.granted_at.desc())
        .first()
    )
    if not consent:
        raise HTTPException(status_code=404, detail="Active consent not found for this purpose")

    consent.withdrawn_at = datetime.utcnow()

    db.add(AuditLog(
        actor=rider_id,
        action="consent_withdrawn",
        entity_type="consent",
        entity_id=consent.id,
        detail=payload.purpose,
    ))
    db.commit()
    return {"message": "Consent withdrawn", "purpose": payload.purpose}


# ── POST /compliance/grievance ────────────────────────────────────────────────
# Submit a grievance — connected to GrievancePage.tsx
@router.post("/grievance")
def create_grievance(payload: GrievanceIn, db: Session = Depends(get_db)):
    grievance = Grievance(
        rider_id=payload.rider_id,
        policy_id=payload.policy_id,
        issue_type=payload.issue_type,
        description=payload.description,
        contact=payload.contact,
    )
    db.add(grievance)
    db.flush()

    db.add(AuditLog(
        actor=payload.rider_id,
        action="grievance_created",
        entity_type="grievance",
        entity_id=grievance.id,
        detail=payload.model_dump_json(),
    ))
    db.commit()
    db.refresh(grievance)

    return {
        "message": "Grievance submitted. You will hear back within 14 days.",
        "reference_id": grievance.id,
        "status": grievance.status,
    }


# ── GET /compliance/privacy/{rider_id} ────────────────────────────────────────
# Returns all data we hold — connected to PrivacyDashboard download button
@router.get("/privacy/{rider_id}")
def get_privacy_data(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    consents = db.query(ConsentRecord).filter(ConsentRecord.rider_id == rider_id).all()

    db.add(AuditLog(
        actor=rider_id,
        action="privacy_data_exported",
        entity_type="rider",
        entity_id=rider_id,
        detail="DPDP Section 11 — data export",
    ))
    db.commit()

    return {
        "rider_id": rider_id,
        "exported_at": datetime.utcnow().isoformat(),
        "note": "Data export per DPDP Act 2023, Section 11",
        "data": {
            "name": rider.name,
            "phone": rider.phone,
            "upi_id": rider.upi_id,
            "pincode": rider.pincode,
            "city": rider.city,
            "platform": rider.platform,
            "weekly_earnings": rider.weekly_earnings,
            "created_at": rider.created_at.isoformat() if rider.created_at else None,
            "consents": [
                {
                    "purpose": c.purpose,
                    "granted": c.granted,
                    "granted_at": c.granted_at.isoformat() if c.granted_at else None,
                    "withdrawn_at": c.withdrawn_at.isoformat() if c.withdrawn_at else None,
                }
                for c in consents
            ],
        },
    }


# ── POST /compliance/deletion/{rider_id} ──────────────────────────────────────
# Request erasure — connected to PrivacyDashboard delete button
@router.post("/deletion/{rider_id}")
def request_deletion(rider_id: str, db: Session = Depends(get_db)):
    rider = db.query(Rider).filter(Rider.id == rider_id).first()
    if not rider:
        raise HTTPException(status_code=404, detail="Rider not found")

    existing = (
        db.query(DeletionRequest)
        .filter(DeletionRequest.rider_id == rider_id, DeletionRequest.status == "pending")
        .first()
    )
    if existing:
        return {
            "message": "A deletion request is already pending",
            "request_id": existing.id,
            "status": existing.status,
        }

    deletion = DeletionRequest(rider_id=rider_id, status="pending")
    db.add(deletion)
    db.flush()

    db.add(AuditLog(
        actor=rider_id,
        action="deletion_requested",
        entity_type="rider",
        entity_id=rider_id,
        detail="DPDP Act 2023 Section 12 — erasure request",
    ))
    db.commit()
    db.refresh(deletion)

    return {
        "message": "Deletion request submitted. Data will be anonymised within 30 days.",
        "request_id": deletion.id,
        "status": deletion.status,
    }


# ── GET /compliance/audit-logs ────────────────────────────────────────────────
# Admin only — view audit trail (IRDAI Cyber Security requirement)
@router.get("/audit-logs")
def get_audit_logs(limit: int = 50, db: Session = Depends(get_db)):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "actor": log.actor,
            "action": log.action,
            "entity_type": log.entity_type,
            "entity_id": log.entity_id,
            "detail": log.detail,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
