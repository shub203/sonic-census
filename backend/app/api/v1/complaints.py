import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.database.models.models import AudioFile, CitizenComplaint
from app.security.rate_limit import rate_limit
from app.services.audit_service import AuditService
from app.dependencies import get_current_user, require_officer

router = APIRouter(prefix="/complaints", tags=["Citizen Grievances"])

ALLOWED_COMPLAINT_STATUSES = {
    "Submitted & Queued",
    "Under Review",
    "Notice Issued",
    "Resolved",
    "Dismissed",
}


class ComplaintCreate(BaseModel):
    category: str = Field(..., min_length=2, max_length=150)
    location: str = Field(..., min_length=2, max_length=255)
    city: str = Field("New Delhi", min_length=2, max_length=100)
    zone: str = Field("Residential", min_length=2, max_length=50)
    time: Optional[str] = Field(None, max_length=20)
    description: Optional[str] = Field("", max_length=2000)
    evidence_audio_id: Optional[str] = Field(None, max_length=36)
    evidence_hash: Optional[str] = Field(None, max_length=64)


class ComplaintStatusUpdate(BaseModel):
    status: str = Field(..., min_length=2, max_length=50)
    officer_notes: Optional[str] = Field(None, max_length=2000)


class ComplaintResponse(BaseModel):
    id: str
    ticket_number: str
    category: str
    location: str
    city: str
    zone_type: str
    incident_time: Optional[str] = None
    description: Optional[str] = ""
    status: str
    is_exceedance: bool
    evidence_audio_id: Optional[str] = None
    evidence_hash: Optional[str] = None
    officer_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ComplaintPublicStatusResponse(BaseModel):
    ticket_number: str
    category: str
    city: str
    zone_type: str
    incident_time: Optional[str] = None
    status: str
    is_exceedance: bool
    evidence_hash: Optional[str] = None
    officer_notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


def _generate_unique_ticket_number(db: Session) -> str:
    year = datetime.utcnow().year
    for _ in range(8):
        candidate = f"CPCB-NOISE-{year}-{secrets.token_hex(3).upper()}"
        exists = db.query(CitizenComplaint.id).filter(CitizenComplaint.ticket_number == candidate).first()
        if not exists:
            return candidate
    raise HTTPException(status_code=500, detail="Unable to allocate unique complaint ticket number")


@router.get("", response_model=List[ComplaintResponse])
def list_complaints(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Privacy-scoped grievance listing:
    - Officers/Analysts see all grievances.
    - Authenticated Citizens see only complaints they submitted.
    - Unauthenticated visitors receive [] (use /complaints/track/{ticket_number} for redacted ticket lookup).
    """
    if not user:
        return []
    if (user.role or "").lower() in {"officer", "admin", "analyst"}:
        return db.query(CitizenComplaint).order_by(CitizenComplaint.created_at.desc()).limit(200).all()
    return (
        db.query(CitizenComplaint)
        .filter(CitizenComplaint.submitted_by == user.id)
        .order_by(CitizenComplaint.created_at.desc())
        .limit(100)
        .all()
    )


@router.get("/track/{ticket_number}", response_model=ComplaintPublicStatusResponse)
def track_complaint_by_ticket(ticket_number: str, db: Session = Depends(get_db)):
    """Redacted public status lookup by exact ticket number without exposing street address/PII."""
    row = (
        db.query(CitizenComplaint)
        .filter(CitizenComplaint.ticket_number == ticket_number.strip().upper())
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Complaint ticket not found")
    return ComplaintPublicStatusResponse(
        ticket_number=row.ticket_number,
        category=row.category,
        city=row.city,
        zone_type=row.zone_type,
        incident_time=row.incident_time,
        status=row.status,
        is_exceedance=row.is_exceedance,
        evidence_hash=row.evidence_hash,
        officer_notes=row.officer_notes,
        created_at=row.created_at,
        updated_at=row.updated_at,
    )


@router.post(
    "",
    response_model=ComplaintResponse,
    dependencies=[Depends(rate_limit("complaints", max_requests=15, window_seconds=3600))],
)
def create_complaint(
    payload: ComplaintCreate,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    evidence_audio_id = payload.evidence_audio_id.strip() if payload.evidence_audio_id else None
    evidence_hash = payload.evidence_hash.strip() if payload.evidence_hash else None
    if evidence_audio_id:
        audio_rec = db.query(AudioFile).filter(AudioFile.id == evidence_audio_id).first()
        if not audio_rec:
            raise HTTPException(status_code=404, detail="Referenced evidence audio recording not found")
        evidence_hash = evidence_hash or audio_rec.file_hash

    ticket_num = _generate_unique_ticket_number(db)
    record = CitizenComplaint(
        ticket_number=ticket_num,
        category=payload.category.strip(),
        location=payload.location.strip(),
        city=payload.city.strip(),
        zone_type=payload.zone.strip(),
        incident_time=(payload.time or datetime.utcnow().strftime("%H:%M")).strip(),
        description=(payload.description or "").strip(),
        status="Submitted & Queued",
        is_exceedance=True,
        evidence_audio_id=evidence_audio_id,
        evidence_hash=evidence_hash,
        submitted_by=user.id if user else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    AuditService.log_event(
        db=db,
        action="complaint.create",
        resource_type="citizen_complaint",
        resource_id=record.id,
        actor=user,
        request=request,
        details={"ticket_number": record.ticket_number, "city": record.city, "zone_type": record.zone_type},
    )
    return record


@router.patch("/{id}/status", response_model=ComplaintResponse)
def update_complaint_status(
    id: str,
    payload: ComplaintStatusUpdate,
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_officer),
):
    next_status = payload.status.strip()
    if next_status not in ALLOWED_COMPLAINT_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Allowed: {sorted(ALLOWED_COMPLAINT_STATUSES)}",
        )

    record = db.query(CitizenComplaint).filter(CitizenComplaint.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Complaint not found")

    prev_status = record.status
    record.status = next_status
    if payload.officer_notes is not None:
        record.officer_notes = payload.officer_notes.strip()
    record.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(record)

    AuditService.log_event(
        db=db,
        action="complaint.status_update",
        resource_type="citizen_complaint",
        resource_id=record.id,
        actor=admin,
        request=request,
        details={"ticket_number": record.ticket_number, "from": prev_status, "to": next_status},
    )
    return record


@router.delete("/{id}")
def delete_complaint(
    id: str,
    request: Request,
    db: Session = Depends(get_db),
    admin=Depends(require_officer),
):
    record = db.query(CitizenComplaint).filter(CitizenComplaint.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Complaint not found")

    ticket_num = record.ticket_number
    db.delete(record)
    db.commit()

    AuditService.log_event(
        db=db,
        action="complaint.delete",
        resource_type="citizen_complaint",
        resource_id=id,
        actor=admin,
        request=request,
        details={"ticket_number": ticket_num},
    )
    return {"message": "Complaint deleted successfully", "ticket_number": ticket_num}
