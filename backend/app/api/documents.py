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
from app.schemas.document import DocumentResponse, DocumentDetailResponse, ManualStructuredEntry
from app.security.rbac import get_current_user, check_document_access, require_patient, require_clinician_or_patient
from app.services.document_parser import calculate_sha256, extract_document_content
from app.services.gemini_service import gemini_service
from app.services.reconciliation import detect_medication_discrepancies
from app.services.audit import log_audit_event
from app.core.config import settings

router = APIRouter(prefix="/documents", tags=["Documents"])

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}
ALLOWED_MIME_TYPES = {"application/pdf", "image/png", "image/jpeg", "image/jpg"}

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    document_type: Optional[str] = Form(None),
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    # Validate extension
    orig_filename = file.filename or "medical_record.pdf"
    _, ext = os.path.splitext(orig_filename.lower())
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, PNG, JPG, JPEG."
        )

    # Save to temporary internal private storage path
    storage_filename = f"{uuid.uuid4().hex}{ext}"
    storage_path = os.path.join(settings.STORAGE_DIR, storage_filename)

    file_size = 0
    try:
        with open(storage_path, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # 1MB chunks
                file_size += len(chunk)
                if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                    buffer.close()
                    if os.path.exists(storage_path):
                        os.remove(storage_path)
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"File exceeds maximum allowed size of {settings.MAX_FILE_SIZE_MB}MB."
                    )
                buffer.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        if os.path.exists(storage_path):
            os.remove(storage_path)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"File write error: {e}")

    # Compute exact SHA-256 hash
    sha256 = calculate_sha256(storage_path)

    # Check for exact duplicate uploaded by this patient
    existing_duplicate = (
        db.query(Document)
        .filter(Document.patient_id == current_user.id, Document.sha256_hash == sha256)
        .first()
    )

    mime_type = file.content_type or "application/octet-stream"
    doc_type = document_type or DocumentType.OTHER.value

    # Extract text from document
    extracted_text, pages = extract_document_content(storage_path, mime_type)

    # Send to Gemini structured extraction service (or synthetic fallback if key not set)
    extraction_data, gen_mode, model_id = gemini_service.extract_document_data(
        document_text=extracted_text,
        filename=orig_filename,
        pages=pages
    )

    # Use detected document_type if not manually specified
    if not document_type and extraction_data.get("document_type"):
        doc_type = extraction_data["document_type"]

    doc_date = None
    if extraction_data.get("document_date"):
        try:
            doc_date = datetime.strptime(extraction_data["document_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    event_date = None
    if extraction_data.get("event_date"):
        try:
            event_date = datetime.strptime(extraction_data["event_date"], "%Y-%m-%d").date()
        except Exception:
            pass

    proc_status = ProcessingStatus.DUPLICATE.value if existing_duplicate else ProcessingStatus.COMPLETED.value

    # Create Document record
    document_record = Document(
        patient_id=current_user.id,
        uploaded_filename=orig_filename,
        storage_filename=storage_filename,
        storage_path=storage_path,
        mime_type=mime_type,
        size_bytes=file_size,
        sha256_hash=sha256,
        document_type=doc_type,
        processing_status=proc_status,
        extracted_text=extracted_text,
        extracted_data=extraction_data,
        document_date=doc_date,
        event_date=event_date,
        uploaded_at=datetime.now(timezone.utc)
    )
    db.add(document_record)
    db.commit()
    db.refresh(document_record)

    # Normalize extracted facts into relational table
    created_facts = []

    # 1. Medications
    for med in extraction_data.get("medications", []):
        fact = ExtractedFact(
            patient_id=current_user.id,
            document_id=document_record.id,
            fact_type=FactType.MEDICATION.value,
            normalized_value=med.get("name", "Unknown Medication"),
            value_json=med,
            unit=None,
            event_date=event_date or doc_date,
            source_page=med.get("source_page", 1),
            source_excerpt=med.get("source_excerpt"),
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc)
        )
        db.add(fact)
        created_facts.append(fact)

    # 2. Conditions
    for cond in extraction_data.get("conditions", []):
        fact = ExtractedFact(
            patient_id=current_user.id,
            document_id=document_record.id,
            fact_type=FactType.CONDITION.value,
            normalized_value=cond.get("name", "Unknown Condition"),
            value_json=cond,
            unit=None,
            event_date=event_date or doc_date,
            source_page=cond.get("source_page", 1),
            source_excerpt=cond.get("source_excerpt"),
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc)
        )
        db.add(fact)
        created_facts.append(fact)

    # 3. Lab Tests
    for lab in extraction_data.get("lab_tests", []):
        fact = ExtractedFact(
            patient_id=current_user.id,
            document_id=document_record.id,
            fact_type=FactType.LAB_RESULT.value,
            normalized_value=lab.get("name", "Lab Test"),
            value_json=lab,
            unit=lab.get("unit"),
            event_date=event_date or doc_date,
            source_page=lab.get("source_page", 1),
            source_excerpt=lab.get("source_excerpt"),
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc)
        )
        db.add(fact)
        created_facts.append(fact)

    # 4. Allergies
    for allergy in extraction_data.get("allergies", []):
        fact = ExtractedFact(
            patient_id=current_user.id,
            document_id=document_record.id,
            fact_type=FactType.ALLERGY.value,
            normalized_value=allergy.get("allergen", "Allergy"),
            value_json=allergy,
            unit=None,
            event_date=event_date or doc_date,
            source_page=allergy.get("source_page", 1),
            source_excerpt=allergy.get("source_excerpt"),
            extraction_status=ExtractionStatus.EXTRACTED.value,
            verification_status=VerificationStatus.UNVERIFIED.value,
            created_at=datetime.now(timezone.utc)
        )
        db.add(fact)
        created_facts.append(fact)

    if created_facts:
        db.commit()

    # Automatically run medication discrepancy detection
    detect_medication_discrepancies(db, current_user.id)

    log_audit_event(
        db,
        action="DOCUMENT_UPLOAD",
        resource_type="document",
        resource_id=str(document_record.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={
            "filename": orig_filename,
            "type": doc_type,
            "facts_count": len(created_facts),
            "is_duplicate": bool(existing_duplicate)
        }
    )

    return DocumentResponse.model_validate(document_record)

@router.get("", response_model=List[DocumentResponse])
def get_documents(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.PATIENT.value:
        docs = db.query(Document).filter(Document.patient_id == current_user.id).order_by(Document.uploaded_at.desc()).all()
        return [DocumentResponse.model_validate(d) for d in docs]

    elif current_user.role == UserRole.CLINICIAN.value:
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clinician request must specify patient_id."
            )
        # Check active grant
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

        # Retrieve ONLY documents explicitly included in active grants
        docs = (
            db.query(Document)
            .join(SharingGrantDocument, Document.id == SharingGrantDocument.document_id)
            .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None)
            )
            .order_by(Document.uploaded_at.desc())
            .all()
        )
        return [DocumentResponse.model_validate(d) for d in docs]

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

@router.get("/{document_id}", response_model=DocumentDetailResponse)
def get_document_details(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    facts_count = db.query(ExtractedFact).filter(ExtractedFact.document_id == doc.id).count()
    resp = DocumentDetailResponse.model_validate(doc)
    resp.facts_count = facts_count
    return resp

@router.get("/{document_id}/file")
def get_document_file(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    doc = check_document_access(document_id, current_user, db)
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Physical document file missing on server.")

    log_audit_event(
        db,
        action="DOCUMENT_DOWNLOAD",
        resource_type="document",
        resource_id=str(doc.id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    return FileResponse(
        path=doc.storage_path,
        media_type=doc.mime_type,
        filename=doc.uploaded_filename
    )

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
