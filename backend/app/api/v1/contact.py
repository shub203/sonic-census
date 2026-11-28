from typing import List
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.database.connection import get_db
from app.database.models import ContactInquiry
from app.schemas.schemas import ContactInquiryCreate, ContactInquiryResponse
from app.security.rate_limit import rate_limit
from app.services.audit_service import AuditService
from app.dependencies import require_officer

router = APIRouter(prefix="/contact", tags=["Field Engineering Contact"])


@router.post(
    "",
    response_model=ContactInquiryResponse,
    dependencies=[Depends(rate_limit("contact_inquiry", max_requests=10, window_seconds=3600))],
)
def submit_contact_inquiry(
    payload: ContactInquiryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    inquiry = ContactInquiry(
        name=payload.name.strip(),
        organization=payload.organization.strip(),
        email=payload.email.lower(),
        inquiry_type=payload.inquiry_type.strip(),
        message=payload.message.strip(),
        status="received",
    )
    db.add(inquiry)
    db.commit()
    db.refresh(inquiry)

    AuditService.log_event(
        db=db,
        action="contact.submit",
        resource_type="contact_inquiry",
        resource_id=inquiry.id,
        request=request,
        details={"organization": inquiry.organization, "inquiry_type": inquiry.inquiry_type},
    )
    return inquiry


@router.get("", response_model=List[ContactInquiryResponse])
def list_contact_inquiries(
    db: Session = Depends(get_db),
    admin=Depends(require_officer),
):
    return db.query(ContactInquiry).order_by(ContactInquiry.created_at.desc()).limit(100).all()
