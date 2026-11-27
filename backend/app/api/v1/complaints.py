import random
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.database.models.models import CitizenComplaint
from app.dependencies import get_current_user

router = APIRouter(prefix="/complaints", tags=["Citizen Grievances"])


class ComplaintCreate(BaseModel):
    category: str
    location: str
    city: str = "New Delhi"
    zone: str = "Residential"
    time: Optional[str] = None
    description: Optional[str] = ""


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
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("", response_model=List[ComplaintResponse])
def list_complaints(db: Session = Depends(get_db)):
    return db.query(CitizenComplaint).order_by(CitizenComplaint.created_at.desc()).limit(50).all()


@router.post("", response_model=ComplaintResponse)
def create_complaint(
    payload: ComplaintCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    ticket_num = f"CPCB-NOISE-{datetime.utcnow().year}-{random.randint(1000, 9999)}"
    record = CitizenComplaint(
        ticket_number=ticket_num,
        category=payload.category,
        location=payload.location,
        city=payload.city,
        zone_type=payload.zone,
        incident_time=payload.time or datetime.utcnow().strftime("%H:%M"),
        description=payload.description or "",
        status="Submitted & Queued",
        is_exceedance=True,
        submitted_by=user.id if user else None,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
