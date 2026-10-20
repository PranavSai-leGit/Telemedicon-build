from fastapi import APIRouter, Depends, HTTPException, Response, status, Query
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
from app.models.audit import AuditEvent
from app.models.enums import UserRole, SharingStatus, DiscrepancyReviewStatus
from app.schemas.sharing import ClinicianPatientItem
from app.schemas.discrepancy import DiscrepancyResponse, DiscrepancyReviewRequest
from app.schemas.fact import FactResponse
from app.schemas.summary import SummaryResponse
from app.schemas.document import DocumentResponse
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
            ExtractedFact.fact_type.in_(["lab_result", "vital"]),
            ExtractedFact.document_id.in_(allowed_doc_ids)
        )
        .order_by(ExtractedFact.event_date.asc().nullslast(), ExtractedFact.created_at.asc())
        .all()
    )

    trends: Dict[str, Dict[str, Any]] = {}
    seen_points = set()

    for fact, doc_name in lab_facts:
        val_json = dict(fact.value_json or {})
        num_val = val_json.get("numeric_value")
        if num_val is None:
            num_val = val_json.get("value")
        if num_val is None:
            try:
                num_val = float(fact.normalized_value)
            except (ValueError, TypeError):
                continue
        else:
            try:
                num_val = float(num_val)
            except (ValueError, TypeError):
                continue

        canonical_id = val_json.get("canonical_id") or f"custom_{fact.normalized_value.lower().replace(' ', '_')}"
        canonical_name = val_json.get("canonical_name") or fact.normalized_value
        orig_test_name = val_json.get("original_test_name") or fact.original_extracted_value or fact.normalized_value
        unit = val_json.get("standard_unit") or fact.unit or val_json.get("unit", "")
        ref_range = val_json.get("reference_range", "N/A")
        abnormality = val_json.get("abnormality_status", "unknown")
        is_abnormal = bool(val_json.get("is_abnormal", abnormality in ("low", "high")))

        date_str = fact.event_date.strftime("%Y-%m-%d") if fact.event_date else fact.created_at.strftime("%Y-%m-%d")

        # Deduplication: prevent identical repeated report uploads from producing duplicate trend points
        point_key = (canonical_id, fact.document_id, date_str, round(num_val, 4))
        if point_key in seen_points:
            continue
        seen_points.add(point_key)

        if canonical_id not in trends:
            trends[canonical_id] = {
                "canonical_id": canonical_id,
                "test_name": canonical_name,
                "category": val_json.get("category", "Laboratory"),
                "unit": unit,
                "reference_range": ref_range,
                "data_points": []
            }

        trends[canonical_id]["data_points"].append({
            "date": date_str,
            "value": round(num_val, 2),
            "unit": unit,
            "abnormality_status": abnormality,
            "is_abnormal": is_abnormal,
            "reference_range": ref_range,
            "original_test_name": orig_test_name,
            "source_document_name": doc_name,
            "source_document_id": fact.document_id,
            "source_page": fact.source_page or 1,
            "source_excerpt": fact.source_excerpt,
            "fact_id": fact.id,
            "verification_status": fact.verification_status
        })

    # Sort points chronologically and calculate deltas
    results = []
    for can_id, trend in trends.items():
        trend["data_points"].sort(key=lambda p: p["date"])
        pts = trend["data_points"]
        obs_count = len(pts)
        latest_pt = pts[-1]
        prev_pt = pts[-2] if obs_count >= 2 else None

        trend["latest_value"] = latest_pt["value"]
        trend["latest_date"] = latest_pt["date"]
        trend["latest_status"] = latest_pt["abnormality_status"]
        trend["observation_count"] = obs_count

        if prev_pt is not None:
            trend["previous_value"] = prev_pt["value"]
            trend["delta"] = round(latest_pt["value"] - prev_pt["value"], 2)
        else:
            trend["previous_value"] = None
            trend["delta"] = None

        results.append(trend)

    results.sort(key=lambda t: (t.get("category", ""), t.get("test_name", "")))
    return results

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

@router.get("/documents")
def get_all_shared_documents(
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve all medical documents currently accessible by this clinician
    across all active patient sharing grants.
    """
    now = datetime.now(timezone.utc)
    grants = (
        db.query(SharingGrant)
        .filter(
            SharingGrant.clinician_id == current_user.id,
            SharingGrant.status == SharingStatus.ACTIVE.value,
            SharingGrant.revoked_at.is_(None),
            (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
        )
        .all()
    )
    grant_ids = [g.id for g in grants]
    if not grant_ids:
        return []

    doc_links = (
        db.query(SharingGrantDocument.document_id, SharingGrant.patient_id)
        .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
        .filter(SharingGrantDocument.sharing_grant_id.in_(grant_ids))
        .all()
    )

    doc_patient_map = {dl[0]: dl[1] for dl in doc_links}
    doc_ids = list(doc_patient_map.keys())
    if not doc_ids:
        return []

    docs = (
        db.query(Document, User.full_name, User.email)
        .join(User, Document.patient_id == User.id)
        .filter(Document.id.in_(doc_ids))
        .order_by(Document.uploaded_at.desc())
        .all()
    )

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
            "processing_status": doc.processing_status,
            "size_bytes": doc.size_bytes,
            "mime_type": doc.mime_type,
            "sha256_hash": doc.sha256_hash,
            "document_date": str(doc.document_date) if doc.document_date else None,
            "event_date": str(doc.event_date) if doc.event_date else None,
            "uploaded_at": doc.uploaded_at,
            "facts_count": facts_count
        })
    return results

@router.get("/all-discrepancies", response_model=List[DiscrepancyResponse])
def get_all_clinician_discrepancies(
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve all detected clinical reconciliation discrepancies across all authorized patients.
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
        .all()
    )
    patient_ids = [g.patient_id for g in active_grants]
    if not patient_ids:
        return []

    discs = (
        db.query(Discrepancy)
        .filter(Discrepancy.patient_id.in_(patient_ids))
        .order_by(Discrepancy.created_at.desc())
        .all()
    )

    results = []
    for d in discs:
        patient = db.query(User).filter(User.id == d.patient_id).first()
        allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, d.patient_id, db)
        f1 = db.query(ExtractedFact).filter(ExtractedFact.id == d.fact_id_1).first() if d.fact_id_1 else None
        f2 = db.query(ExtractedFact).filter(ExtractedFact.id == d.fact_id_2).first() if d.fact_id_2 else None

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

@router.get("/consents")
def get_clinician_consents(
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Retrieve all sharing grants issued to this clinician with patient information and document scope.
    """
    grants = (
        db.query(SharingGrant, User.full_name, User.email)
        .join(User, SharingGrant.patient_id == User.id)
        .filter(SharingGrant.clinician_id == current_user.id)
        .order_by(SharingGrant.created_at.desc())
        .all()
    )

    results = []
    now = datetime.now(timezone.utc)
    for g, pat_name, pat_email in grants:
        doc_count = db.query(SharingGrantDocument).filter(SharingGrantDocument.sharing_grant_id == g.id).count()
        is_active = (g.status == SharingStatus.ACTIVE.value and not g.revoked_at and (not g.expires_at or g.expires_at > now))
        results.append({
            "id": g.id,
            "patient_id": g.patient_id,
            "patient_name": pat_name,
            "patient_email": pat_email,
            "status": "active" if is_active else ("revoked" if g.revoked_at else "expired"),
            "document_count": doc_count,
            "created_at": g.created_at,
            "expires_at": g.expires_at,
            "revoked_at": g.revoked_at
        })
    return results

@router.get("/activity")
def get_clinician_activity(
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Audit log trail of actions performed by this clinician (records accessed, handovers generated, etc.).
    """
    logs = (
        db.query(AuditEvent)
        .filter(AuditEvent.actor_user_id == current_user.id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": log.id,
            "action": log.action,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "outcome": log.outcome,
            "details": log.details,
            "created_at": log.created_at
        }
        for log in logs
    ]

@router.get("/handovers")
def get_all_clinical_handovers(
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    List all clinical handover briefs generated by this clinician across authorized patients.
    """
    summaries = (
        db.query(Summary, User.full_name, User.email)
        .join(User, Summary.patient_id == User.id)
        .filter(Summary.generated_by == current_user.id)
        .order_by(Summary.created_at.desc())
        .all()
    )

    results = []
    for s, pat_name, pat_email in summaries:
        payload = s.summary_payload or {}
        results.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": pat_name,
            "patient_email": pat_email,
            "generation_mode": s.generation_mode,
            "model_identifier": s.model_identifier,
            "created_at": s.created_at,
            "included_document_ids": s.included_document_ids,
            "executive_summary": payload.get("executive_summary", ""),
            "relevant_history_count": len(payload.get("relevant_history", [])),
            "medications_count": len(payload.get("medications", [])),
            "discrepancies_count": len(payload.get("potential_discrepancies", []))
        })
    return results

@router.get("/verification-queue")
def get_verification_queue(
    patient_id: Optional[int] = Query(None),
    filter_type: Optional[str] = Query("all"),  # all, low_confidence, unsupported, conflicts, unverified, rejected
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Dedicated clinical verification queue for inspecting claims that require human review,
    unsupported claims, conflicting records, or low-confidence extractions.
    """
    now = datetime.now(timezone.utc)
    # Find all active sharing grants for this clinician
    grant_query = (
        db.query(SharingGrant.patient_id, SharingGrantDocument.document_id)
        .join(SharingGrantDocument, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
        .filter(
            SharingGrant.clinician_id == current_user.id,
            SharingGrant.status == SharingStatus.ACTIVE.value,
            SharingGrant.revoked_at.is_(None),
            (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
        )
    )
    if patient_id:
        grant_query = grant_query.filter(SharingGrant.patient_id == patient_id)

    grant_pairs = grant_query.all()
    if not grant_pairs:
        return []

    allowed_doc_ids = {gp[1] for gp in grant_pairs}

    # Query facts belonging to allowed documents
    query = (
        db.query(ExtractedFact, Document.uploaded_filename, User.full_name)
        .join(Document, ExtractedFact.document_id == Document.id)
        .join(User, ExtractedFact.patient_id == User.id)
        .filter(ExtractedFact.document_id.in_(allowed_doc_ids))
    )

    if filter_type == "low_confidence":
        query = query.filter((ExtractedFact.confidence_score < 60) | (ExtractedFact.confidence_label == "Low"))
    elif filter_type == "unsupported":
        query = query.filter(
            (ExtractedFact.source_excerpt.is_(None)) | 
            (ExtractedFact.source_excerpt == "") |
            (ExtractedFact.verification_status == "contradicted_by_source")
        )
    elif filter_type == "conflicts":
        query = query.filter(ExtractedFact.verification_status == "needs_review")
    elif filter_type == "unverified":
        query = query.filter(ExtractedFact.verification_status.in_(["unverified", "pending_verification", "needs_review"]))
    elif filter_type == "rejected":
        query = query.filter(ExtractedFact.verification_status == "rejected")
    else:
        # 'all' prioritizes items needing attention
        pass

    results = query.order_by(
        ExtractedFact.confidence_score.asc().nullsfirst(),
        ExtractedFact.created_at.desc()
    ).limit(limit).all()

    queue_items = []
    for fact, doc_name, pat_name in results:
        # Check if there is an active discrepancy involving this fact
        has_discrepancy = db.query(Discrepancy).filter(
            (Discrepancy.fact_id_1 == fact.id) | (Discrepancy.fact_id_2 == fact.id)
        ).first() is not None

        queue_items.append({
            "fact_id": fact.id,
            "patient_id": fact.patient_id,
            "patient_name": pat_name,
            "document_id": fact.document_id,
            "document_name": doc_name,
            "fact_type": fact.fact_type,
            "normalized_value": fact.normalized_value,
            "value_json": fact.value_json,
            "unit": fact.unit,
            "event_date": str(fact.event_date) if fact.event_date else None,
            "date_precision": fact.date_precision or "exact",
            "source_page": fact.source_page or 1,
            "source_excerpt": fact.source_excerpt,
            "char_offset_start": fact.char_offset_start,
            "char_offset_end": fact.char_offset_end,
            "verification_status": fact.verification_status,
            "confidence_score": fact.confidence_score,
            "confidence_label": fact.confidence_label or ("High" if (fact.confidence_score or 0) >= 85 else ("Medium" if (fact.confidence_score or 0) >= 60 else "Low")),
            "confidence_breakdown": fact.confidence_breakdown,
            "confidence_reasons": fact.confidence_reasons or [],
            "has_discrepancy": has_discrepancy,
            "reviewer_notes": fact.reviewer_notes,
            "original_extracted_value": fact.original_extracted_value,
            "reviewed_at": fact.reviewed_at.isoformat() if fact.reviewed_at else None
        })

    return queue_items

@router.post("/verification-queue/{fact_id}/resolve")
def resolve_queue_item(
    fact_id: int,
    action: str = Query(..., description="verify, needs_review, reject, correct"),
    reviewer_notes: Optional[str] = Query(None),
    corrected_value: Optional[str] = Query(None),
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    Clinician resolves a verification queue item:
    - verify: marks verified_against_source (or clinician_verified)
    - needs_review: marks needs_review with clinical note
    - reject: marks rejected with reason
    - correct: updates value, records original_extracted_value, marks corrected_by_reviewer
    """
    fact = db.query(ExtractedFact).filter(ExtractedFact.id == fact_id).first()
    if not fact:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fact not found.")

    allowed_doc_ids = get_authorized_document_ids_for_clinician(current_user.id, fact.patient_id, db)
    if fact.document_id not in allowed_doc_ids:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active sharing grant for this patient document.")

    if action == "verify":
        fact.verification_status = "verified_against_source"
    elif action == "reject":
        fact.verification_status = "rejected"
    elif action == "needs_review":
        fact.verification_status = "needs_review"
    elif action == "correct":
        if not corrected_value or not corrected_value.strip():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Corrected value cannot be empty.")
        if not fact.original_extracted_value:
            fact.original_extracted_value = fact.normalized_value
        fact.normalized_value = corrected_value.strip()
        fact.verification_status = "corrected_by_reviewer"
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported action '{action}'.")

    if reviewer_notes:
        fact.reviewer_notes = reviewer_notes

    fact.reviewed_by = current_user.id
    fact.reviewed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(fact)

    log_audit_event(
        db,
        action="CLINICAL_VERIFICATION_RESOLVE",
        resource_type="extracted_fact",
        resource_id=str(fact.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={
            "action": action,
            "status": fact.verification_status,
            "notes": reviewer_notes,
            "corrected_value": corrected_value
        }
    )

    return {
        "fact_id": fact.id,
        "verification_status": fact.verification_status,
        "normalized_value": fact.normalized_value,
        "reviewer_notes": fact.reviewer_notes,
        "reviewed_at": fact.reviewed_at
    }

@router.get("/verification-history")
def get_verification_history(
    limit: int = Query(50, le=200),
    current_user: User = Depends(require_clinician),
    db: Session = Depends(get_db)
):
    """
    View previous verification actions taken by this clinician with audit records.
    """
    facts = (
        db.query(ExtractedFact, Document.uploaded_filename, User.full_name)
        .join(Document, ExtractedFact.document_id == Document.id)
        .join(User, ExtractedFact.patient_id == User.id)
        .filter(ExtractedFact.reviewed_by == current_user.id)
        .order_by(ExtractedFact.reviewed_at.desc().nullslast())
        .limit(limit)
        .all()
    )

    history = []
    for fact, doc_name, pat_name in facts:
        history.append({
            "fact_id": fact.id,
            "patient_name": pat_name,
            "document_name": doc_name,
            "fact_type": fact.fact_type,
            "normalized_value": fact.normalized_value,
            "original_extracted_value": fact.original_extracted_value,
            "verification_status": fact.verification_status,
            "confidence_score": fact.confidence_score,
            "confidence_label": fact.confidence_label,
            "reviewer_notes": fact.reviewer_notes,
            "reviewed_at": fact.reviewed_at
        })
    return history


