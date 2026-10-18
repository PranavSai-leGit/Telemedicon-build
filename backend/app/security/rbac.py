from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.db.session import get_db
from app.models.user import User
from app.models.session import SessionModel
from app.models.document import Document
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.enums import UserRole, SharingStatus
from app.security.sessions import get_session_and_user, hash_token
from app.core.config import settings

def get_current_user_and_session(
    request: Request,
    db: Session = Depends(get_db)
) -> tuple[User, SessionModel]:
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if not session_token:
        # Also check Authorization header Bearer token if cookie is not present (e.g. for testing)
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ", 1)[1]

    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    session_rec, user = get_session_and_user(db, session_token)
    if not session_rec or not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired, revoked, or account is inactive."
        )

    return user, session_rec

def get_current_user(
    user_and_session: tuple[User, SessionModel] = Depends(get_current_user_and_session)
) -> User:
    user, _ = user_and_session
    return user

def verify_csrf(
    request: Request,
    user_and_session: tuple[User, SessionModel] = Depends(get_current_user_and_session)
):
    """Verify CSRF token for state-changing HTTP methods."""
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        csrf_header = request.headers.get("X-CSRF-Token")
        if not csrf_header:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Missing CSRF token."
            )
        _, session_rec = user_and_session
        if hash_token(csrf_header) != session_rec.csrf_token_hash:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid CSRF token."
            )

def require_role(*allowed_roles: UserRole):
    def role_checker(user: User = Depends(get_current_user)) -> User:
        allowed_str = [r.value if isinstance(r, UserRole) else r for r in allowed_roles]
        if user.role not in allowed_str:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {', '.join(allowed_str)}, your role: {user.role}"
            )
        return user
    return role_checker

require_patient = require_role(UserRole.PATIENT)
require_clinician = require_role(UserRole.CLINICIAN)
require_admin = require_role(UserRole.ADMINISTRATOR)
require_clinician_or_patient = require_role(UserRole.CLINICIAN, UserRole.PATIENT)

def check_document_access(document_id: int, user: User, db: Session) -> Document:
    """
    Enforce resource-level authorization:
    - Patients can only access their own documents.
    - Clinicians can only access documents explicitly granted via active sharing grants.
    - Administrators NEVER have access to clinical documents.
    """
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    if user.role == UserRole.PATIENT.value:
        if doc.patient_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You can only access your own medical records."
            )
        return doc

    elif user.role == UserRole.CLINICIAN.value:
        # Check active grant that includes this document
        now = datetime.now(timezone.utc)
        grant = (
            db.query(SharingGrant)
            .join(SharingGrantDocument, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
            .filter(
                SharingGrant.patient_id == doc.patient_id,
                SharingGrant.clinician_id == user.id,
                SharingGrant.status == SharingStatus.ACTIVE.value,
                SharingGrant.revoked_at.is_(None),
                (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now)),
                SharingGrantDocument.document_id == document_id
            )
            .first()
        )
        if not grant:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: No active sharing grant authorized for this document."
            )
        return doc

    elif user.role == UserRole.ADMINISTRATOR.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Administrators are not authorized to view patient medical documents."
        )

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized access.")

def get_authorized_document_ids_for_clinician(clinician_id: int, patient_id: int, db: Session) -> set[int]:
    """Retrieve set of document IDs that the clinician currently has active access to for a given patient."""
    now = datetime.now(timezone.utc)
    docs = (
        db.query(SharingGrantDocument.document_id)
        .join(SharingGrant, SharingGrant.id == SharingGrantDocument.sharing_grant_id)
        .filter(
            SharingGrant.patient_id == patient_id,
            SharingGrant.clinician_id == clinician_id,
            SharingGrant.status == SharingStatus.ACTIVE.value,
            SharingGrant.revoked_at.is_(None),
            (SharingGrant.expires_at.is_(None) | (SharingGrant.expires_at > now))
        )
        .all()
    )
    return {d[0] for d in docs}
