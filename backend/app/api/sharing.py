from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta
from typing import List

from app.db.session import get_db
from app.models.user import User
from app.models.document import Document
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.enums import UserRole, SharingStatus
from app.schemas.sharing import CreateSharingGrantRequest, SharingGrantResponse
from app.schemas.auth import UserResponse
from app.schemas.document import DocumentResponse
from app.security.rbac import require_patient, get_current_user
from app.services.audit import log_audit_event

router = APIRouter(prefix="/sharing", tags=["Consent & Sharing"])

@router.get("/clinicians", response_model=List[UserResponse])
def get_available_clinicians(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """Retrieve list of active clinicians registered on the platform that a patient can choose to share records with."""
    clinicians = (
        db.query(User)
        .filter(User.role == UserRole.CLINICIAN.value, User.is_active == True)
        .order_by(User.full_name.asc())
        .all()
    )
    return [UserResponse.model_validate(c) for c in clinicians]

@router.post("/grants", response_model=SharingGrantResponse, status_code=status.HTTP_201_CREATED)
def create_sharing_grant(
    req: CreateSharingGrantRequest,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Patient explicitly shares selected medical records with a designated clinician.
    """
    # Verify clinician exists and is active
    clinician = db.query(User).filter(User.id == req.clinician_id, User.role == UserRole.CLINICIAN.value).first()
    if not clinician or not clinician.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Designated clinician not found or inactive."
        )

    # Verify all document IDs belong to the current patient
    if not req.document_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must select at least one document to share."
        )

    owned_docs = (
        db.query(Document)
        .filter(Document.id.in_(req.document_ids), Document.patient_id == current_user.id)
        .all()
    )
    if len(owned_docs) != len(req.document_ids):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="One or more specified documents do not belong to you or do not exist."
        )

    expires_at = None
    if req.expires_in_days:
        expires_at = datetime.now(timezone.utc) + timedelta(days=req.expires_in_days)

    grant = SharingGrant(
        patient_id=current_user.id,
        clinician_id=clinician.id,
        created_at=datetime.now(timezone.utc),
        expires_at=expires_at,
        revoked_at=None,
        status=SharingStatus.ACTIVE.value
    )
    db.add(grant)
    db.commit()
    db.refresh(grant)

    # Add join records
    for doc in owned_docs:
        link = SharingGrantDocument(
            sharing_grant_id=grant.id,
            document_id=doc.id
        )
        db.add(link)
    db.commit()

    log_audit_event(
        db,
        action="SHARING_GRANT_CREATED",
        resource_type="sharing_grant",
        resource_id=str(grant.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={
            "clinician_id": clinician.id,
            "document_count": len(owned_docs)
        }
    )

    return SharingGrantResponse(
        id=grant.id,
        patient_id=grant.patient_id,
        patient_name=current_user.full_name,
        clinician_id=clinician.id,
        clinician_name=clinician.full_name,
        created_at=grant.created_at,
        expires_at=grant.expires_at,
        revoked_at=grant.revoked_at,
        status=grant.status,
        documents=[DocumentResponse.model_validate(d) for d in owned_docs]
    )

@router.get("/grants", response_model=List[SharingGrantResponse])
def list_sharing_grants(
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """List all sharing grants granted by this patient."""
    grants = (
        db.query(SharingGrant)
        .filter(SharingGrant.patient_id == current_user.id)
        .order_by(SharingGrant.created_at.desc())
        .all()
    )

    results = []
    for g in grants:
        clinician = db.query(User).filter(User.id == g.clinician_id).first()
        docs = (
            db.query(Document)
            .join(SharingGrantDocument, Document.id == SharingGrantDocument.document_id)
            .filter(SharingGrantDocument.sharing_grant_id == g.id)
            .all()
        )
        results.append(SharingGrantResponse(
            id=g.id,
            patient_id=g.patient_id,
            patient_name=current_user.full_name,
            clinician_id=g.clinician_id,
            clinician_name=clinician.full_name if clinician else "Unknown Clinician",
            created_at=g.created_at,
            expires_at=g.expires_at,
            revoked_at=g.revoked_at,
            status=g.status,
            documents=[DocumentResponse.model_validate(d) for d in docs]
        ))
    return results

@router.post("/grants/{grant_id}/revoke")
def revoke_sharing_grant(
    grant_id: int,
    current_user: User = Depends(require_patient),
    db: Session = Depends(get_db)
):
    """
    Patient immediately revokes a previously granted sharing authorization.
    All subsequent clinician requests for these records are blocked.
    """
    grant = (
        db.query(SharingGrant)
        .filter(SharingGrant.id == grant_id, SharingGrant.patient_id == current_user.id)
        .first()
    )
    if not grant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sharing grant not found."
        )

    grant.status = SharingStatus.REVOKED.value
    grant.revoked_at = datetime.now(timezone.utc)
    db.commit()

    log_audit_event(
        db,
        action="SHARING_GRANT_REVOKED",
        resource_type="sharing_grant",
        resource_id=str(grant.id),
        actor_user_id=current_user.id,
        outcome="success",
        details={"clinician_id": grant.clinician_id}
    )

    return {"message": "Sharing grant revoked immediately.", "status": "revoked"}
