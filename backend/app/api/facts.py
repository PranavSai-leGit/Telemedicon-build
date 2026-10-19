from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, date
from typing import List, Optional

from app.db.session import get_db
from app.models.user import User
from app.models.fact import ExtractedFact
from app.models.document import Document
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.enums import UserRole, ExtractionStatus, VerificationStatus, SharingStatus
from app.schemas.fact import FactResponse, FactUpdate, RelationshipGraphResponse
from app.security.rbac import get_current_user, require_clinician_or_patient
from app.services.reconciliation import detect_medication_discrepancies
from app.services.graph_service import generate_patient_relationship_graph
from app.services.audit import log_audit_event

router = APIRouter(prefix="/facts", tags=["Extracted Facts & Timeline"])

@router.get("/graph", response_model=RelationshipGraphResponse)
def get_relationship_graph(
    patient_id: Optional[int] = Query(None),
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    """
    Generate an interactive, source-grounded Medical Relationship Map connecting
    conditions, medications, laboratory results, and source documents.
    """
    target_patient_id = current_user.id
    allowed_doc_ids = None

    if current_user.role == UserRole.CLINICIAN.value:
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clinician must specify patient_id."
            )
        target_patient_id = patient_id
        now = datetime.now(timezone.utc)
        authorized_doc_ids = (
            db.query(SharingGrantDocument.document_id)
            .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
            )
            .all()
        )
        allowed_doc_ids = {d[0] for d in authorized_doc_ids}
        if not allowed_doc_ids:
            return RelationshipGraphResponse(
                patient_id=target_patient_id,
                patient_name="Unknown",
                nodes=[],
                edges=[]
            )

    return generate_patient_relationship_graph(
        patient_id=target_patient_id,
        db=db,
        allowed_document_ids=allowed_doc_ids
    )

@router.get("", response_model=List[FactResponse])
def get_timeline_facts(
    patient_id: Optional[int] = Query(None),
    fact_type: Optional[str] = Query(None),
    document_id: Optional[int] = Query(None),
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    target_patient_id = current_user.id
    if current_user.role == UserRole.CLINICIAN.value:
        if not patient_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Clinician must specify patient_id."
            )
        target_patient_id = patient_id
        # Clinician can only query facts belonging to shared documents
        now = datetime.now(timezone.utc)
        authorized_doc_ids = (
            db.query(SharingGrantDocument.document_id)
            .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
            )
            .all()
        )
        allowed_ids = {d[0] for d in authorized_doc_ids}
        if not allowed_ids:
            return []

        query = (
            db.query(ExtractedFact, Document.uploaded_filename, Document.document_type)
            .join(Document, ExtractedFact.document_id == Document.id)
            .filter(
                ExtractedFact.patient_id == target_patient_id,
                ExtractedFact.document_id.in_(allowed_ids)
            )
        )
    else:
        # Patient queries own facts
        query = (
            db.query(ExtractedFact, Document.uploaded_filename, Document.document_type)
            .join(Document, ExtractedFact.document_id == Document.id)
            .filter(ExtractedFact.patient_id == current_user.id)
        )

    if fact_type:
        query = query.filter(ExtractedFact.fact_type == fact_type)
    if document_id:
        query = query.filter(ExtractedFact.document_id == document_id)

    # Order chronologically: event_date descending, then created_at descending
    results = query.order_by(ExtractedFact.event_date.desc().nullslast(), ExtractedFact.created_at.desc()).all()

    facts_resp = []
    for fact, doc_name, doc_type in results:
        f_resp = FactResponse.model_validate(fact)
        f_resp.document_name = doc_name
        f_resp.document_type = doc_type
        facts_resp.append(f_resp)

    return facts_resp

@router.patch("/{fact_id}", response_model=FactResponse)
def update_fact(
    fact_id: int,
    update: FactUpdate,
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    fact = db.query(ExtractedFact).filter(ExtractedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found.")

    if current_user.role == UserRole.PATIENT.value:
        if fact.patient_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another patient's facts.")

        if update.normalized_value is not None:
            fact.normalized_value = update.normalized_value
        if update.value_json is not None:
            fact.value_json = update.value_json
        if update.unit is not None:
            fact.unit = update.unit
        if update.event_date is not None:
            fact.event_date = update.event_date
        
        fact.extraction_status = ExtractionStatus.PATIENT_CORRECTED.value
        fact.verification_status = VerificationStatus.PATIENT_CONFIRMED.value

    elif current_user.role == UserRole.CLINICIAN.value:
        # Verify clinician has active grant for this fact's document
        now = datetime.now(timezone.utc)
        grant = (
            db.query(SharingGrant)
            .join(SharingGrantDocument, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == fact.patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now)),
                SharingGrantDocument.document_id == fact.document_id
            )
            .first()
        )
        if not grant:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active grant for this document.")

        if update.verification_status:
            fact.verification_status = update.verification_status
        else:
            fact.verification_status = VerificationStatus.CLINICIAN_VERIFIED.value

        fact.extraction_status = ExtractionStatus.CLINICIAN_VERIFIED.value
        fact.reviewed_by = current_user.id
        fact.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(fact)

    if fact.fact_type == "medication":
        detect_medication_discrepancies(db, fact.patient_id)

    doc = db.query(Document).filter(Document.id == fact.document_id).first()
    resp = FactResponse.model_validate(fact)
    if doc:
        resp.document_name = doc.uploaded_filename
        resp.document_type = doc.document_type

    log_audit_event(
        db,
        action="FACT_UPDATE",
        resource_type="extracted_fact",
        resource_id=str(fact.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={"verification_status": fact.verification_status}
    )

    return resp

@router.get("/{fact_id}/evidence")
def get_fact_evidence(
    fact_id: int,
    current_user: User = Depends(require_clinician_or_patient),
    db: Session = Depends(get_db)
):
    fact = db.query(ExtractedFact).filter(ExtractedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found.")

    if current_user.role == UserRole.PATIENT.value and fact.patient_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    doc = db.query(Document).filter(Document.id == fact.document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source document not found.")

    if current_user.role == UserRole.CLINICIAN.value:
        now = datetime.now(timezone.utc)
        grant = (
            db.query(SharingGrant)
            .join(SharingGrantDocument, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == fact.patient_id,
                SharingGrant.clinician_id == current_user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now)),
                SharingGrantDocument.document_id == fact.document_id
            )
            .first()
        )
        if not grant:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active grant for source document.")

    return {
        "fact_id": fact.id,
        "normalized_value": fact.normalized_value,
        "fact_type": fact.fact_type,
        "source_document_id": doc.id,
        "source_document_name": doc.uploaded_filename,
        "source_page": fact.source_page or 1,
        "source_excerpt": fact.source_excerpt or "Source excerpt unavailable.",
        "sha256_hash": doc.sha256_hash,
        "uploaded_at": doc.uploaded_at,
        "extraction_status": fact.extraction_status,
        "verification_status": fact.verification_status
    }
