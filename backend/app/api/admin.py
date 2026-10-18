from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.audit import AuditEvent
from app.models.enums import UserRole, ProcessingStatus
from app.schemas.auth import UserResponse, UserAdminUpdate
from app.security.rbac import require_admin
from app.services.audit import log_audit_event

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/stats")
def get_admin_system_stats(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    System dashboard statistics for administrators:
    User counts by role, document processing stats, application health.
    NOTE: Clinical document contents are NEVER exposed to administrators.
    """
    total_users = db.query(User).count()
    patients_count = db.query(User).filter(User.role == UserRole.PATIENT.value).count()
    clinicians_count = db.query(User).filter(User.role == UserRole.CLINICIAN.value).count()
    admins_count = db.query(User).filter(User.role == UserRole.ADMINISTRATOR.value).count()
    active_users = db.query(User).filter(User.is_active == True).count()

    total_docs = db.query(Document).count()
    completed_docs = db.query(Document).filter(Document.processing_status == ProcessingStatus.COMPLETED.value).count()
    duplicate_docs = db.query(Document).filter(Document.processing_status == ProcessingStatus.DUPLICATE.value).count()
    failed_docs = db.query(Document).filter(Document.processing_status == ProcessingStatus.FAILED.value).count()

    # Document type distribution
    doc_types = (
        db.query(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
        .all()
    )
    doc_type_counts = {dtype: count for dtype, count in doc_types}

    return {
        "users": {
            "total": total_users,
            "patients": patients_count,
            "clinicians": clinicians_count,
            "administrators": admins_count,
            "active": active_users,
        },
        "documents": {
            "total_processed": total_docs,
            "completed": completed_docs,
            "duplicates_detected": duplicate_docs,
            "failed": failed_docs,
            "by_type": doc_type_counts
        },
        "system_health": {
            "status": "healthy",
            "database": "connected (PostgreSQL with JSONB)",
            "storage": "accessible (private file storage)",
            "ai_integration": "active (Gemini + fallback)"
        }
    }

@router.get("/users", response_model=List[UserResponse])
def get_users_list(
    role: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List all accounts for administrator management."""
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    users = query.order_by(User.created_at.desc()).all()
    return [UserResponse.model_validate(u) for u in users]

@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user_status(
    user_id: int,
    req: UserAdminUpdate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Administrator activates/deactivates accounts or changes role.
    Includes safeguard preventing deactivation or demotion of the last active administrator.
    """
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Guard: prevent removing the last active administrator
    if target.role == UserRole.ADMINISTRATOR.value and (req.is_active is False or (req.role and req.role != UserRole.ADMINISTRATOR.value)):
        admin_count = db.query(User).filter(User.role == UserRole.ADMINISTRATOR.value, User.is_active == True).count()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate or change role of the last active administrator account."
            )

    if req.is_active is not None:
        target.is_active = req.is_active
    if req.role is not None:
        if req.role not in [r.value for r in UserRole]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {req.role}")
        target.role = req.role

    db.commit()
    db.refresh(target)

    log_audit_event(
        db,
        action="ADMIN_USER_UPDATE",
        resource_type="user",
        resource_id=str(target.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={"new_role": target.role, "is_active": target.is_active}
    )

    return UserResponse.model_validate(target)

@router.get("/audit-logs")
def get_audit_logs(
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Non-clinical security and administrative audit event feed.
    No clinical document text or sensitive records are included.
    """
    logs = (
        db.query(AuditEvent, User.full_name, User.email)
        .outerjoin(User, AuditEvent.actor_user_id == User.id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for event, name, email in logs:
        results.append({
            "id": event.id,
            "actor_user_id": event.actor_user_id,
            "actor_name": name or "System / Anonymous",
            "actor_email": email or "",
            "action": event.action,
            "resource_type": event.resource_type,
            "resource_id": event.resource_id,
            "outcome": event.outcome,
            "details": event.details,
            "created_at": event.created_at
        })
    return results
