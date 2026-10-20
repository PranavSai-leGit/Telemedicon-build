import os
import uuid
import shutil
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.enums import UserRole, DocumentType, ProcessingStatus, FactType, ExtractionStatus, VerificationStatus, SharingStatus
from app.schemas.document import (
    DocumentResponse,
    DocumentDetailResponse,
    ManualStructuredEntry,
    AIConfigRequest,
    AIStatusResponse
)
from app.security.rbac import get_current_user, check_document_access, require_patient, require_clinician_or_patient, require_admin
from app.services.document_parser import calculate_sha256, extract_document_content
from app.services.gemini_service import gemini_service
from app.services.reconciliation import detect_medication_discrepancies
from app.services.audit import log_audit_event
from app.core.config import settings, BASE_DIR
from pathlib import Path

from app.services.pipeline_service import DocumentProcessingPipeline
from app.security.rate_limiter import check_upload_rate_limit

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}

def resolve_document_file_path(doc: Document) -> Optional[str]:
    """
    Safely and reliably resolve the physical file location on disk.
    Handles absolute paths, relative paths, and fallback upload directories.
    """
    candidates = []
    if doc.storage_path:
        candidates.append(doc.storage_path)
        if not os.path.isabs(doc.storage_path):
            candidates.append(os.path.join(settings.STORAGE_DIR, os.path.basename(doc.storage_path)))
            candidates.append(os.path.join(str(BASE_DIR), doc.storage_path))

    if doc.storage_filename:
        candidates.append(os.path.join(settings.STORAGE_DIR, doc.storage_filename))
        candidates.append(os.path.join(str(BASE_DIR), "private_uploads", doc.storage_filename))
        candidates.append(os.path.join(str(BASE_DIR), "backend", "private_uploads", doc.storage_filename))

    for cand in candidates:
        if cand and os.path.exists(cand):
            return os.path.abspath(cand)
    return None

def update_env_variable(key: str, value: str):
    root_dir = Path(__file__).resolve().parent.parent.parent.parent
    backend_dir = Path(__file__).resolve().parent.parent.parent
    candidate_paths = [root_dir / ".env", backend_dir / ".env", Path(BASE_DIR) / ".env"]
    for env_path in candidate_paths:
        try:
            if env_path.exists():
                lines = []
                found = False
                with open(env_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                for i, line in enumerate(lines):
                    if line.strip().startswith(f"{key}="):
                        lines[i] = f"{key}={value}\n"
                        found = True
                        break
                if not found:
                    lines.append(f"{key}={value}\n")
                with open(env_path, "w", encoding="utf-8") as f:
                    f.writelines(lines)
        except Exception:
            pass

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    orig_filename = file.filename or "medical_record.pdf"
    _, ext = os.path.splitext(orig_filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG."
        )

    # Read uploaded bytes with size enforcement
    file_bytes = b""
    try:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            file_bytes += chunk
            if len(file_bytes) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                    detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File read error: {e}")

    # Security & Magic-Byte Validation
    is_valid, validation_msg = DocumentProcessingPipeline.validate_file_security(
        filename=orig_filename,
        content_bytes=file_bytes,
        mime_type=file.content_type or "application/octet-stream"
    )
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation_msg)

    # Save to storage path
    storage_filename = f"{uuid.uuid4().hex}{ext}"
    storage_path = os.path.abspath(os.path.join(settings.STORAGE_DIR, storage_filename))
    try:
        with open(storage_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        if os.path.exists(storage_path):
            os.remove(storage_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File storage error: {e}")

    # Execute Structured Pipeline
    document_record, created_facts = DocumentProcessingPipeline.process_uploaded_document(
        db=db,
        patient_id=current_user.id,
        orig_filename=orig_filename,
        storage_path=storage_path,
        mime_type=file.content_type or "application/octet-stream",
        file_size=len(file_bytes),
        requested_doc_type=document_type
    )

    resp = DocumentResponse.model_validate(document_record)
    resp.facts_count = len(created_facts)
    return resp

@router.get("")
def get_documents(
    patient_id: Optional[int] = Query(None),
    page: Optional[int] = Query(None, ge=1),
    page_size: Optional[int] = Query(None, ge=1, le=100),
    search: Optional[str] = Query(None),
    document_type: Optional[str] = Query(None),
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.PATIENT.value:
        query = db.query(Document).filter(Document.patient_id == current_user.id)
    elif current_user.role == UserRole.CLINICIAN.value:
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clinician request must specify patient_id."
            )
        now = datetime.now(timezone.utc)
        active_grant = (
            db.query(SharingGrant)
            .filter(
                SharingGrant.patient_id == patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
            )
            .first()
        )
        if not active_grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No active sharing grant authorized for this patient."
            )

        query = (
            db.query(Document)
            .join(SharingGrantDocument, Document.id == SharingGrantDocument.document_id)
            .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None)
            )
        )
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    # Search filter
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(Document.uploaded_filename.ilike(term))

    # Type filter
    if document_type and document_type.strip() and document_type != "all":
        query = query.filter(Document.document_type == document_type.strip())

    total_records = query.count()
    query = query.order_by(Document.uploaded_at.desc())

    if page is not None:
        p_size = page_size or 20
        offset = (page - 1) * p_size
        docs = query.offset(offset).limit(p_size).all()
        total_pages = max(1, (total_records + p_size - 1) // p_size) if total_records > 0 else 0

        items = []
        for d in docs:
            r = DocumentResponse.model_validate(d)
            r.facts_count = len(d.facts)
            items.append(r)

        return {
            "items": items,
            "pagination": {
                "page": page,
                "page_size": p_size,
                "total_records": total_records,
                "total_pages": total_pages,
                "has_previous": page > 1,
                "has_next": page < total_pages
            }
        }

    # Backward compatible full list when page is not specified
    docs = query.all()
    result = []
    for d in docs:
        r = DocumentResponse.model_validate(d)
        r.facts_count = len(d.facts)
        result.append(r)
    return result

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    resp = DocumentDetailResponse.model_validate(doc)
    resp.facts_count = len(doc.facts)
    return resp

@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    inline: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    file_path = resolve_document_file_path(doc)
    if not file_path:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical document file missing on server.")

    log_audit_event(
        db,
        action="DOCUMENT_VIEW" if inline else "DOCUMENT_DOWNLOAD",
        resource_type="document",
        resource_id=str(doc.id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    if inline:
        return FileResponse(
            path=file_path,
            media_type=doc.mime_type,
            headers={"Content-Disposition": f'inline; filename="{doc.uploaded_filename}"'}
        )

    return FileResponse(
        path=file_path,
        media_type=doc.mime_type,
        filename=doc.uploaded_filename
    )

@router.get("/{document_id}/view")
def view_document_file(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Serve the document with inline Content-Disposition so browsers/modals render images and PDFs directly."""
    return get_document_file(document_id=document_id, inline=True, current_user=current_user, db=db)

@router.post("/{document_id}/manual-entry", response_model=DocumentResponse)
def save_manual_entry(
    document_id: int,
    entry: ManualStructuredEntry,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)

    # Update document record
    doc.document_type = entry.document_type
    if entry.document_date:
        doc.document_date = entry.document_date
    if entry.event_date:
        doc.event_date = entry.event_date
    doc.processing_status = ProcessingStatus.COMPLETED.value

    # Update JSONB extraction data
    new_extracted = {
        "document_type": entry.document_type,
        "document_date": str(entry.document_date) if entry.document_date else None,
        "event_date": str(entry.event_date) if entry.event_date else None,
        "medications": entry.medications,
        "conditions": entry.conditions,
        "lab_tests": entry.lab_tests,
        "allergies": entry.allergies,
        "missing_fields": [],
        "uncertain_fields": [],
        "clinical_notes": entry.notes or "Manual clinical entry."
    }
    doc.extracted_data = new_extracted
    db.commit()

    # Clear existing facts for this doc and rewrite with user-confirmed facts
    db.query(ExtractedFact).filter(ExtractedFact.document_id == doc.id).delete()

    for med in entry.medications:
        db.add(ExtractedFact(
            patient_id=current_user.id,
            document_id=doc.id,
            fact_type=FactType.MEDICATION.value,
            normalized_value=med.get("name", "Medication"),
            value_json=med,
            event_date=entry.event_date or entry.document_date,
            source_page=1,
            source_excerpt="User manual structured entry",
            extraction_status=ExtractionStatus.PATIENT_CORRECTED.value,
            verification_status=VerificationStatus.PATIENT_CONFIRMED.value,
            created_at=datetime.now(timezone.utc)
        ))

    for cond in entry.conditions:
        db.add(ExtractedFact(
            patient_id=current_user.id,
            document_id=doc.id,
            fact_type=FactType.CONDITION.value,
            normalized_value=cond.get("name", "Condition"),
            value_json=cond,
            event_date=entry.event_date or entry.document_date,
            source_page=1,
            source_excerpt="User manual structured entry",
            extraction_status=ExtractionStatus.PATIENT_CORRECTED.value,
            verification_status=VerificationStatus.PATIENT_CONFIRMED.value,
            created_at=datetime.now(timezone.utc)
        ))

    for lab in entry.lab_tests:
        db.add(ExtractedFact(
            patient_id=current_user.id,
            document_id=doc.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value=lab.get("name", "Lab Test"),
            value_json=lab,
            unit=lab.get("unit"),
            event_date=entry.event_date or entry.document_date,
            source_page=1,
            source_excerpt="User manual structured entry",
            extraction_status=ExtractionStatus.PATIENT_CORRECTED.value,
            verification_status=VerificationStatus.PATIENT_CONFIRMED.value,
            created_at=datetime.now(timezone.utc)
        ))

    db.commit()
    detect_medication_discrepancies(db, current_user.id)

    return DocumentResponse.model_validate(doc)

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    file_path = doc.storage_path
    
    db.delete(doc)
    db.commit()

    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception as e:
            pass

    log_audit_event(
        db,
        action="DOCUMENT_DELETE",
        resource_type="document",
        resource_id=str(document_id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    return {"message": "Document deleted successfully"}

@router.post("/{document_id}/reprocess", response_model=DocumentDetailResponse)
def reprocess_document(
    document_id: int,
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    file_path = resolve_document_file_path(doc)
    if not file_path:
        doc.processing_status = ProcessingStatus.FAILED.value
        db.commit()
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical document file missing on server.")

    if not gemini_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gemini AI is not configured. Please configure your GEMINI_API_KEY to reprocess this document with multimodal AI."
        )

    extracted_text, pages = extract_document_content(file_path, doc.mime_type)
    extraction_data, gen_mode, model_id = gemini_service.extract_document_data(
        document_text=extracted_text,
        filename=doc.uploaded_filename,
        pages=pages,
        file_path=file_path,
        mime_type=doc.mime_type
    )

    doc.extracted_text = extracted_text
    doc.extracted_data = extraction_data
    if extraction_data.get("document_type") and (doc.document_type == "other" or not doc.document_type):
        doc.document_type = extraction_data["document_type"]

    if extraction_data.get("document_date"):
        try:
            doc.document_date = datetime.strptime(extraction_data["document_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    if extraction_data.get("event_date"):
        try:
            doc.event_date = datetime.strptime(extraction_data["event_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    # Clear existing facts and re-create from newly extracted data
    db.query(ExtractedFact).filter(ExtractedFact.document_id == doc.id).delete()

    from app.services.confidence_service import ConfidenceScoringService

    created_facts = []
    is_ocr = not bool(extracted_text and len(extracted_text.strip()) > 30)

    for item_type, items in [
        (FactType.MEDICATION.value, extraction_data.get("medications", [])),
        (FactType.CONDITION.value, extraction_data.get("conditions", [])),
        (FactType.LAB_RESULT.value, extraction_data.get("lab_tests", [])),
        (FactType.ALLERGY.value, extraction_data.get("allergies", []))
    ]:
        for item in items:
            val_name = item.get("name") or item.get("allergen") or "Extracted Item"
            exc = item.get("source_excerpt")
            sp = item.get("source_page", 1)

            # Find offsets if possible
            start_off, end_off = None, None
            if exc and extracted_text:
                idx = extracted_text.lower().find(exc.lower().strip())
                if idx != -1:
                    start_off, end_off = idx, idx + len(exc.strip())

            # Evaluate confidence
            conf = ConfidenceScoringService.evaluate_claim_confidence(
                fact_type=item_type,
                normalized_value=val_name,
                value_json=item,
                source_excerpt=exc,
                source_text=extracted_text,
                source_page=sp,
                document_date=str(doc.document_date) if doc.document_date else None,
                event_date=str(doc.event_date) if doc.event_date else None,
                is_ocr=is_ocr
            )

            fact = ExtractedFact(
                patient_id=doc.patient_id,
                document_id=doc.id,
                fact_type=item_type,
                normalized_value=val_name,
                value_json=item,
                unit=item.get("unit"),
                event_date=doc.event_date or doc.document_date,
                source_page=sp,
                source_excerpt=exc,
                char_offset_start=start_off,
                char_offset_end=end_off,
                extraction_status=ExtractionStatus.EXTRACTED.value,
                verification_status=conf["recommended_status"],
                confidence_score=conf["score"],
                confidence_label=conf["label"],
                confidence_breakdown=conf["breakdown"],
                confidence_reasons=conf["reasons"],
                confidence_version=conf["algorithm_version"],
                created_at=datetime.now(timezone.utc)
            )
            db.add(fact)
            created_facts.append(fact)

    doc.processing_status = ProcessingStatus.COMPLETED.value
    db.commit()
    db.refresh(doc)

    detect_medication_discrepancies(db, doc.patient_id)

    log_audit_event(
        db,
        action="DOCUMENT_REPROCESS",
        resource_type="document",
        resource_id=str(doc.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={"facts_count": len(created_facts), "model": model_id, "mode": gen_mode}
    )

    resp = DocumentDetailResponse.model_validate(doc)
    resp.facts_count = len(doc.facts)
    return resp

@router.get("/ai/status", response_model=AIStatusResponse)
def get_ai_status(current_user: User = Depends(get_current_user)):
    is_avail = gemini_service.is_available()
    return AIStatusResponse(
        ai_configured=is_avail,
        ai_mode=settings.AI_MODE,
        ai_model=gemini_service.model_name or settings.GEMINI_MODEL,
        message="Gemini Multimodal AI active" if is_avail else "Gemini API key is not configured (Demonstration mode)"
    )

@router.post("/ai/configure", response_model=AIStatusResponse)
def configure_gemini_ai(
    req: AIConfigRequest,
    current_user: User = Depends(require_admin)
):
    success, msg = gemini_service.configure_key(req.gemini_api_key, req.gemini_model)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to validate Gemini API key: {msg}"
        )

    # Persist in .env
    try:
        update_env_variable("GEMINI_API_KEY", req.gemini_api_key.strip())
        if gemini_service.model_name:
            update_env_variable("GEMINI_MODEL", gemini_service.model_name.strip())
    except Exception as e:
        pass

    return AIStatusResponse(
        ai_configured=True,
        ai_mode="gemini",
        ai_model=gemini_service.model_name,
        message=msg
    )
