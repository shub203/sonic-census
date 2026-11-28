import json
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from fastapi import Request

from app.database.models import AuditLog, User
from app.security.rate_limit import get_client_ip


class AuditService:
    """Persist structured security and operational audit trails into the database."""

    @staticmethod
    def log_event(
        db: Session,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        actor: Optional[User] = None,
        request: Optional[Request] = None,
        status_code: int = 200,
        details: Optional[Dict[str, Any]] = None,
        auto_commit: bool = True,
    ) -> None:
        try:
            entry = AuditLog(
                actor_user_id=actor.id if actor else None,
                actor_email=actor.email if actor else None,
                actor_role=actor.role if actor else "anonymous",
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                ip_address=get_client_ip(request) if request else None,
                status_code=status_code,
                details=json.dumps(details, default=str) if details else None,
            )
            db.add(entry)
            if auto_commit:
                db.commit()
            else:
                db.flush()
        except Exception:
            # Never break core application flow if audit table write fails mid-rollback
            try:
                db.rollback()
            except Exception:
                pass
