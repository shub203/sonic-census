import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session
from typing import List

from app.config import settings
from app.database.connection import get_db
from app.database.models import Report
from app.schemas.schemas import ReportGenerateRequest, ReportResponse
from app.services.report_service import ReportService
from app.services.audit_service import AuditService
from app.dependencies import require_officer

router = APIRouter(prefix="/reports", tags=["Reporting Engine"])

@router.post("/generate", response_model=ReportResponse)
def generate_report(
    req: ReportGenerateRequest,
    request: Request,
    db: Session = Depends(get_db),
    user = Depends(require_officer)
):
    user_id = user.id if user else None
    report = ReportService.generate_report(
        db=db,
        report_type=req.report_type,
        reporting_period=req.reporting_period,
        location=req.location,
        file_format=req.file_format,
        user_id=user_id
    )
    AuditService.log_event(
        db=db,
        action="report.generate",
        resource_type="report",
        resource_id=report.id,
        actor=user,
        request=request,
        details={"report_type": req.report_type, "file_format": req.file_format},
    )
    return report

@router.get("", response_model=List[ReportResponse])
def list_reports(db: Session = Depends(get_db)):
    reports = db.query(Report).order_by(Report.generated_at.desc()).all()
    return reports

@router.get("/{id}/download")
def download_report(id: str, db: Session = Depends(get_db)):
    report = db.query(Report).filter(Report.id == id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    filename = os.path.basename(report.file_path)
    media_type = "application/pdf" if report.file_format.upper() == "PDF" else "text/csv"

    # Prefer PostgreSQL/SQLite persistent blob when container disk is ephemeral
    local_path = os.path.join(settings.REPORTS_DIRECTORY, filename)
    if os.path.exists(local_path):
        return FileResponse(
            path=local_path,
            media_type=media_type,
            filename=filename
        )

    if report.file_blob:
        return Response(
            content=report.file_blob,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )

    raise HTTPException(status_code=404, detail="Report file not found")
