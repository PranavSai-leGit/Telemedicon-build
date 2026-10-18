import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.models.session import SessionModel
from app.models.user import User
from app.core.config import settings

def hash_token(token: str) -> str:
    """Compute SHA-256 hash of a session or CSRF token."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()

def create_user_session(db: Session, user: User) -> tuple[str, str, datetime]:
    """Create a new server-side session in PostgreSQL. Returns (raw_session_token, raw_csrf_token, expires_at)."""
    raw_session_token = secrets.token_urlsafe(32)
    raw_csrf_token = secrets.token_hex(32)
    
    session_hash = hash_token(raw_session_token)
    csrf_hash = hash_token(raw_csrf_token)
    
    expires_at = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    
    session_record = SessionModel(
        user_id=user.id,
        session_token_hash=session_hash,
        csrf_token_hash=csrf_hash,
        expires_at=expires_at,
        created_at=datetime.now(timezone.utc),
        revoked_at=None,
    )
    db.add(session_record)
    db.commit()
    db.refresh(session_record)
    
    return raw_session_token, raw_csrf_token, expires_at

def get_session_and_user(db: Session, raw_session_token: str) -> tuple[SessionModel | None, User | None]:
    """Verify session token hash, check expiration and revocation, check active status."""
    if not raw_session_token:
        return None, None
        
    token_hash = hash_token(raw_session_token)
    session_rec = db.query(SessionModel).filter(SessionModel.session_token_hash == token_hash).first()
    
    if not session_rec:
        return None, None
        
    # Check revoked
    if session_rec.revoked_at is not None:
        return None, None
        
    # Check expired
    now = datetime.now(timezone.utc)
    if session_rec.expires_at < now:
        return None, None
        
    user = db.query(User).filter(User.id == session_rec.user_id).first()
    if not user or not user.is_active:
        return None, None
        
    return session_rec, user

def revoke_session(db: Session, raw_session_token: str) -> bool:
    """Revoke a session in PostgreSQL."""
    if not raw_session_token:
        return False
    token_hash = hash_token(raw_session_token)
    session_rec = db.query(SessionModel).filter(SessionModel.session_token_hash == token_hash).first()
    if session_rec:
        session_rec.revoked_at = datetime.now(timezone.utc)
        db.commit()
        return True
    return False
