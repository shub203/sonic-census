from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import AuditLog, AudioVaultEntry, Report
from app.dependencies import require_officer

router = APIRouter(prefix="/admin", tags=["Administration & Audit"])


@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": row.id,
            "actor_email": row.actor_email,
            "actor_role": row.actor_role,
            "action": row.action,
            "resource_type": row.resource_type,
            "resource_id": row.resource_id,
            "ip_address": row.ip_address,
            "status_code": row.status_code,
            "details": row.details,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in logs
    ]


@router.get("/storage-stats")
def get_storage_stats(
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    vault_bytes = db.query(func.coalesce(func.sum(AudioVaultEntry.file_size), 0)).scalar() or 0
    vault_count = db.query(func.count(AudioVaultEntry.sha256_hash)).scalar() or 0
    report_count = db.query(func.count(Report.id)).scalar() or 0
    quota_bytes = max(1, settings.MAX_VAULT_STORAGE_MB) * 1024 * 1024
    return {
        "vault_entries": vault_count,
        "vault_used_bytes": int(vault_bytes),
        "vault_quota_mb": settings.MAX_VAULT_STORAGE_MB,
        "vault_utilization_pct": round((vault_bytes / quota_bytes) * 100, 2),
        "persisted_reports": report_count,
        "environment": settings.ENVIRONMENT,
    }
