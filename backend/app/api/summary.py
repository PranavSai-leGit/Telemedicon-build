from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional, List

from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.summary import Summary
from app.models.discrepancy import Discrepancy
from app.schemas.summary import SummaryResponse, GenerateSummaryRequest
from app.security.rbac import require_patient
from app.services.gemini_service import gemini_service
from app.services.audit import log_audit_event

router = APIRouter(prefix="/summary", tags=["Health Summary"])

@router.post("/generate", response_model=SummaryResponse)
def generate_patient_summary(
    req: GenerateSummaryRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Patient generates an AI-assisted health-history summary from their stored, structured facts.
    """
    # Verify documents
    if req.document_ids:
        docs = db.query(Document).filter(Document.id.in_(req.document_ids), Document.patient_id == current_user.id).all()
        doc_ids = [d.id for d in docs]
    else:
        docs = db.query(Document).filter(Document.patient_id == current_user.id).all()
        doc_ids = [d.id for d in docs]

    if not doc_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No medical documents available to generate summary. Please upload a record first."
        )

    facts = (
        db.query(ExtractedFact)
        .filter(ExtractedFact.patient_id == current_user.id, ExtractedFact.document_id.in_(doc_ids))
        .all()
    )

    facts_data = [
        {
            "id": f.id,
            "fact_type": f.fact_type,
            "normalized_value": f.normalized_value,
            "value_json": f.value_json,
            "unit": f.unit,
            "event_date": str(f.event_date) if f.event_date else None,
            "source_page": f.source_page,
            "source_excerpt": f.source_excerpt
        }
        for f in facts
    ]

    docs_data = [
        {
            "id": d.id,
            "uploaded_filename": d.uploaded_filename,
            "document_type": d.document_type
        }
        for d in docs
    ]

    discs = db.query(Discrepancy).filter(Discrepancy.patient_id == current_user.id).all()
    discs_data = [
        {
            "id": d.id,
            "explanation": d.explanation,
            "review_status": d.review_status
        }
        for d in discs
    ]

    summary_payload, gen_mode, model_id = gemini_service.generate_clinical_handover(
        patient_name=current_user.full_name,
        facts=facts_data,
        documents=docs_data,
        discrepancies=discs_data
    )

    summary = Summary(
        patient_id=current_user.id,
        generated_by=current_user.id,
        included_document_ids=doc_ids,
        summary_payload=summary_payload,
        generation_mode=gen_mode,
        model_identifier=model_id,
        created_at=datetime.now(timezone.utc)
    )
    db.add(summary)
    db.commit()
    db.refresh(summary)

    log_audit_event(
        db,
        action="PATIENT_SUMMARY_GENERATED",
        resource_type="summary",
        resource_id=str(summary.id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    resp = SummaryResponse.model_validate(summary)
    resp.total_claims = len(summary_payload.get("relevant_history", [])) + len(summary_payload.get("medications", []))
    resp.supported_claims = resp.total_claims
    return resp

@router.get("/latest", response_model=Optional[SummaryResponse])
def get_latest_patient_summary(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Retrieve patient's most recent generated summary."""
    summary = (
        db.query(Summary)
        .filter(Summary.patient_id == current_user.id)
        .order_by(Summary.created_at.desc())
        .first()
    )
    if not summary:
        return None

    resp = SummaryResponse.model_validate(summary)
    payload = summary.summary_payload or {}
    resp.total_claims = len(payload.get("relevant_history", [])) + len(payload.get("medications", []))
    resp.supported_claims = resp.total_claims
    return resp
