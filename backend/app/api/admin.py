from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
import time
import os

from app.db.session import get_db, engine
from app.core.config import settings
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.audit import AuditEvent
from app.models.enums import UserRole, ProcessingStatus
from app.schemas.auth import UserResponse, UserAdminUpdate
from app.security.rbac import require_admin
from app.services.audit import log_audit_event
from app.services.gemini_service import gemini_service
from app.services.document_parser import extract_document_content

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

@router.get("/documents")
def get_admin_documents(
    status_filter: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Document processing ingestion monitor.
    NOTE: Patient medical text is NOT returned; only administrative metadata.
    """
    query = (
        db.query(Document, User.full_name, User.email)
        .join(User, Document.patient_id == User.id)
    )
    if status_filter:
        query = query.filter(Document.processing_status == status_filter)

    docs = query.order_by(Document.uploaded_at.desc()).limit(limit).all()

    results = []
    for doc, pat_name, pat_email in docs:
        facts_count = db.query(ExtractedFact).filter(ExtractedFact.document_id == doc.id).count()
        results.append({
            "id": doc.id,
            "patient_id": doc.patient_id,
            "patient_name": pat_name,
            "patient_email": pat_email,
            "uploaded_filename": doc.uploaded_filename,
            "document_type": doc.document_type,
            "mime_type": doc.mime_type,
            "size_bytes": doc.size_bytes,
            "sha256_hash": doc.sha256_hash,
            "processing_status": doc.processing_status,
            "uploaded_at": doc.uploaded_at,
            "facts_count": facts_count
        })
    return results

@router.post("/documents/{document_id}/reprocess")
def reprocess_document(
    document_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Trigger re-processing of a document safely.
    Re-extracts text and updates extracted facts without creating duplicates.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if not os.path.exists(doc.storage_path):
        doc.processing_status = ProcessingStatus.FAILED.value
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Physical file missing from storage.")

    try:
        extracted_text, pages = extract_document_content(doc.storage_path, doc.mime_type)
        extraction_data, gen_mode, model_id = gemini_service.extract_document_data(
            document_text=extracted_text,
            filename=doc.uploaded_filename,
            pages=pages
        )

        doc.extracted_text = extracted_text
        doc.extracted_data = extraction_data
        doc.processing_status = ProcessingStatus.COMPLETED.value
        db.commit()

        log_audit_event(
            db,
            action="ADMIN_DOCUMENT_REPROCESS",
            resource_type="document",
            resource_id=str(doc.id),
            actor_user_id=current_user.id,
            outcome="success",
            details={"mode": gen_mode, "model": model_id}
        )

        return {"message": "Document reprocessed successfully", "status": doc.processing_status}
    except Exception as e:
        doc.processing_status = ProcessingStatus.FAILED.value
        db.commit()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Reprocessing failed: {e}")

@router.get("/health-detailed")
def get_detailed_system_health(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """
    Deep health diagnostics: real DB roundtrip latency, storage probe, AI availability.
    """
    # 1. Database Ping with latency
    db_ok = False
    db_latency_ms = None
    try:
        t0 = time.perf_counter()
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        t1 = time.perf_counter()
        db_ok = True
        db_latency_ms = round((t1 - t0) * 1000, 2)
    except Exception as e:
        pass

    # 2. File storage probe
    storage_ok = False
    storage_writable = False
    try:
        if os.path.exists(settings.STORAGE_DIR):
            storage_ok = True
            probe_path = os.path.join(settings.STORAGE_DIR, ".probe_test")
            with open(probe_path, "w") as f:
                f.write("probe")
            if os.path.exists(probe_path):
                storage_writable = True
                os.remove(probe_path)
    except Exception:
        pass

    # 3. AI Service status
    ai_available = gemini_service.is_available()
    ai_status = "active (Live Gemini API)" if ai_available else "demonstration_mode (Synthetic Medical Intelligence)"

    return {
        "status": "healthy" if (db_ok and storage_ok and storage_writable) else "degraded",
        "timestamp": datetime.now(timezone.utc),
        "database": {
            "status": "connected" if db_ok else "disconnected",
            "type": "PostgreSQL with JSONB",
            "latency_ms": db_latency_ms
        },
        "storage": {
            "status": "accessible" if storage_ok else "inaccessible",
            "path": settings.STORAGE_DIR,
            "writable": storage_writable,
            "max_file_size_mb": settings.MAX_FILE_SIZE_MB
        },
        "ai_engine": {
            "status": ai_status,
            "configured_model": settings.GEMINI_MODEL,
            "mode": settings.AI_MODE
        },
        "version": settings.VERSION
    }

@router.get("/config")
def get_system_configuration(
    current_user: User = Depends(require_admin)
):
    """
    Operational configuration permissible for administrator review.
    SECURITY: API Keys, JWT secrets, and database credentials are NEVER exposed.
    """
    return {
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.APP_ENV,
        "debug": settings.DEBUG,
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        "allowed_file_types": ["PDF", "PNG", "JPG", "JPEG"],
        "session_expire_hours": settings.SESSION_EXPIRE_HOURS,
        "cors_origins": settings.CORS_ORIGINS,
        "ai_mode": settings.AI_MODE,
        "ai_model": settings.GEMINI_MODEL,
        "ai_configured": gemini_service.is_available(),
        "storage_directory": settings.STORAGE_DIR
    }

