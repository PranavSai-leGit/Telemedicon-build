from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, Dict, Any
from app.models.audit import AuditEvent
from app.models.enums import AuditOutcome
import logging

logger = logging.getLogger(__name__)

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    resource_id: Optional[str] = None,
    actor_user_id: Optional[int] = None,
    outcome: str = AuditOutcome.SUCCESS.value,
    details: Optional[Dict[str, Any]] = None
) -> AuditEvent:
    """
    Log security, administrative, and consent events.
    Never stores clinical document contents or plaintext credentials in audit logs.
    """
    try:
        # Sanitize details to avoid clinical data leakage
        safe_details = {}
        if details:
            for k, v in details.items():
                if k.lower() not in ["extracted_text", "password", "token", "raw_text", "content"]:
                    safe_details[k] = v

        event = AuditEvent(
            actor_user_id=actor_user_id,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id is not None else None,
            outcome=outcome,
            details=safe_details,
            created_at=datetime.now(timezone.utc)
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event
    except Exception as e:
        logger.error(f"Failed to record audit event: {e}")
        db.rollback()
        return None
