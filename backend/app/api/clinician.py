from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.discrepancy import Discrepancy
from app.models.summary import Summary
from app.models.enums import UserRole, SharingStatus, DiscrepancyReviewStatus
from app.schemas.sharing import ClinicianPatientItem
from app.schemas.discrepancy import DiscrepancyResponse, DiscrepancyReviewRequest
from app.schemas.fact import FactResponse
from app.schemas.summary import SummaryResponse
from app.security.rbac import require_clinician, get_authorized_document_ids_for_clinician
from app.services.gemini_service import gemini_service
from app.services.handover_pdf import generate_clinical_handover_pdf
from app.services.audit import log_audit_event

router = APIRouter(prefix="/clinician", tags=["Clinician Experience"])

@router.get("/patients", response_model=List[ClinicianPatientItem])
def get_shared_patients(
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve patients who have granted active sharing permissions to this clinician.
    """
    now = datetime.now(timezone.utc)
    active_grants = (
        db.query(SharingGrant)
        .filter(
            SharingGrant.clinician_id == current_user.id,
            SharingGrant.status == SharingStatus.ACTIVE.value,
            SharingGrant.revoked_at.is_(None),
            (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
        )
        .order_by(SharingGrant.created_at.desc())
        .all()
    )

    # Group by patient
    patient_map: Dict[int, Dict[str, Any]] = {}
    for g in active_grants:
        pid = g.patient_id
        doc_count = db.query(SharingGrantDocument).filter(SharingGrantDocument.sharing_grant_id == g.id).count()
        if pid not in patient_map:
            patient = db.query(User).filter(User.id == pid).first()
            if patient:
                patient_map[pid] = {
                    "patient_id": patient.id,
                    "patient_name": patient.full_name,
                    "patient_email": patient.email,
                    "shared_document_count": doc_count,
                    "latest_share_date": g.created_at,
                    "active_grants_count": 1
                }
        else:
            patient_map[pid]["shared_document_count"] += doc_count
            patient_map[pid]["active_grants_count"] += 1

    return list(patient_map.values())

@router.get("/patients/{patient_id}/labs")
def get_patient_lab_trends(
    patient_id: int,
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve structured laboratory measurements from authorized records for plotting trends.
    """
    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, patient_id, db)
    if not allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active sharing grant for this patient.")

    lab_facts = (
        db.query(ExtractedFact, Document.uploaded_filename)
        .join(Document, ExtractedFact.document_id == Document.id)
        .filter(
            ExtractedFact.patient_id == patient_id,
            ExtractedFact.fact_type == "lab_result",
            ExtractedFact.document_id.in_(allowed_doc_ids)
        )
        .order_by(ExtractedFact.event_date.asc().nullslast(), ExtractedFact.created_at.asc())
        .all()
    )

    # Organize by test name
    trends = {}
    for fact, doc_name in lab_facts:
        test_name = fact.normalized_value
        val_json = fact.value_json or {}
        num_val = val_json.get("value")
        if num_val is None:
            continue

        if test_name not in trends:
            trends[test_name] = {
                "test_name": test_name,
                "unit": fact.unit or val_json.get("unit", ""),
                "reference_range": val_json.get("reference_range", "N/A"),
                "data_points": []
            }

        date_str = fact.event_date.strftime("%Y-%m-%d") if fact.event_date else fact.created_at.strftime("%Y-%m-%d")
        trends[test_name]["data_points"].append({
            "date": date_str,
            "value": float(num_val),
            "source_document_name": doc_name,
            "fact_id": fact.id,
            "verification_status": fact.verification_status
        })

    return list(trends.values())

@router.get("/patients/{patient_id}/discrepancies", response_model=List[DiscrepancyResponse])
def get_patient_discrepancies(
    patient_id: int,
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve reconciliation discrepancies flagged within the authorized records.
    """
    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, patient_id, db)
    if not allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active sharing grant for this patient.")

    discs = (
        db.query(Discrepancy)
        .filter(Discrepancy.patient_id == patient_id)
        .order_by(Discrepancy.created_at.desc())
        .all()
    )

    results = []
    for d in discs:
        # Verify both facts (or at least one) belong to authorized documents
        f1 = db.query(ExtractedFact).filter(ExtractedFact.id == d.fact_id_1).first() if d.fact_id_1 else None
        f2 = db.query(ExtractedFact).filter(ExtractedFact.id == d.fact_id_2).first() if d.fact_id_2 else None

        # If neither fact is in allowed doc set, skip
        if f1 and f1.document_id not in allowed_doc_ids and f2 and f2.document_id not in allowed_doc_ids:
            continue

        reviewer = db.query(User).filter(User.id == d.reviewed_by).first() if d.reviewed_by else None

        d_resp = DiscrepancyResponse.model_validate(d)
        d_resp.reviewer_name = reviewer.full_name if reviewer else None
        if f1:
            doc1 = db.query(Document).filter(Document.id == f1.document_id).first()
            d_resp.fact_1 = FactResponse.model_validate(f1)
            if doc1:
                d_resp.fact_1.document_name = doc1.uploaded_filename
                d_resp.fact_1.document_type = doc1.document_type
        if f2:
            doc2 = db.query(Document).filter(Document.id == f2.document_id).first()
            d_resp.fact_2 = FactResponse.model_validate(f2)
            if doc2:
                d_resp.fact_2.document_name = doc2.uploaded_filename
                d_resp.fact_2.document_type = doc2.document_type

        results.append(d_resp)

    return results

@router.post("/discrepancies/{discrepancy_id}/review", response_model=DiscrepancyResponse)
def review_discrepancy(
    discrepancy_id: int,
    req: DiscrepancyReviewRequest,
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Clinician reviews a potential discrepancy and marks it as:
    confirmed, unresolved, or requires_additional_information, along with notes.
    """
    disc = db.query(Discrepancy).filter(Discrepancy.id == discrepancy_id).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discrepancy not found.")

    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, disc.patient_id, db)
    if not allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active sharing grant.")

    disc.review_status = req.review_status
    disc.review_note = req.review_note
    disc.reviewed_by = current_user.id
    disc.reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(disc)

    log_audit_event(
        db,
        action="DISCREPANCY_REVIEW",
        resource_type="discrepancy",
        resource_id=str(disc.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={"status": req.review_status}
    )

    resp = DiscrepancyResponse.model_validate(disc)
    resp.reviewer_name = current_user.full_name
    return resp

@router.post("/patients/{patient_id}/handover", response_model=SummaryResponse)
def generate_clinician_handover(
    patient_id: int,
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Generate or update structured evidence-linked handover from authorized documents ONLY.
    """
    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, patient_id, db)
    if not allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No authorized records for this patient.")

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    # Fetch facts strictly belonging to allowed documents
    facts = (
        db.query(ExtractedFact)
        .filter(
            ExtractedFact.patient_id == patient_id,
            ExtractedFact.document_id.in_(allowed_doc_ids)
        )
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

    docs = (
        db.query(Document)
        .filter(Document.id.in_(allowed_doc_ids))
        .all()
    )
    docs_data = [
        {
            "id": d.id,
            "uploaded_filename": d.uploaded_filename,
            "document_type": d.document_type
        }
        for d in docs
    ]

    discs = (
        db.query(Discrepancy)
        .filter(Discrepancy.patient_id == patient_id)
        .all()
    )
    discs_data = [
        {
            "id": d.id,
            "explanation": d.explanation,
            "review_status": d.review_status,
            "review_note": d.review_note
        }
        for d in discs
    ]

    summary_payload, gen_mode, model_id = gemini_service.generate_clinical_handover(
        patient_name=patient.full_name,
        facts=facts_data,
        documents=docs_data,
        discrepancies=discs_data
    )

    summary = Summary(
        patient_id=patient_id,
        generated_by=current_user.id,
        included_document_ids=list(allowed_doc_ids),
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
        action="HANDOVER_GENERATED",
        resource_type="summary",
        resource_id=str(summary.id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    resp = SummaryResponse.model_validate(summary)
    resp.total_claims = len(summary_payload.get("relevant_history", [])) + len(summary_payload.get("medications", []))
    resp.supported_claims = resp.total_claims
    return resp

@router.get("/patients/{patient_id}/handover/pdf")
def download_handover_pdf(
    patient_id: int,
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Download a formatted PDF clinical handover report.
    """
    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, patient_id, db)
    if not allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active sharing grant.")

    patient = db.query(User).filter(User.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")

    latest_summary = (
        db.query(Summary)
        .filter(Summary.patient_id == patient_id)
        .order_by(Summary.created_at.desc())
        .first()
    )

    if not latest_summary:
        # Generate on the fly
        generate_clinician_handover(patient_id, current_user, db)
        latest_summary = (
            db.query(Summary)
            .filter(Summary.patient_id == patient_id)
            .order_by(Summary.created_at.desc())
            .first()
        )

    discs = (
        db.query(Discrepancy)
        .filter(Discrepancy.patient_id == patient_id)
        .all()
    )
    discs_data = [
        {
            "explanation": d.explanation,
            "review_status": d.review_status,
            "review_note": d.review_note
        }
        for d in discs
    ]

    pdf_buffer = generate_clinical_handover_pdf(
        patient_name=patient.full_name,
        clinician_name=current_user.full_name,
        summary_payload=latest_summary.summary_payload,
        discrepancies=discs_data
    )

    filename = f"MediTale_Handover_{patient.full_name.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"

    log_audit_event(
        db,
        action="HANDOVER_PDF_DOWNLOAD",
        resource_type="summary",
        resource_id=str(latest_summary.id),
        actor_user_id=current_user.id,
        outcome="success"
    )

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
