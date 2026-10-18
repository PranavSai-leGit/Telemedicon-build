from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from typing import Any
from app.models.session import SessionModel
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.auth import UserRegister, UserLogin, UserResponse, SessionResponse
from app.security.passwords import hash_password, verify_password
from app.security.sessions import create_user_session, revoke_session
from app.security.rbac import get_current_user_and_session, get_current_user, verify_csrf
from app.services.audit import log_audit_event
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
def register(
    req: UserRegister,
    response: Response,
    db: Session = Depends(get_db)
):
    # Rule: Public registration MUST create Patient accounts ONLY.
    # Users cannot register themselves as clinicians or administrators.
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    hashed_pw = hash_password(req.password)
    user = User(
        full_name=req.full_name.strip(),
        email=req.email.lower().strip(),
        password_hash=hashed_pw,
        role=UserRole.PATIENT.value,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automatically create session upon registration
    session_token, csrf_token, expires_at = create_user_session(db, user)

    # Set HTTP-only session cookie
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600
    )

    log_audit_event(
        db,
        action="USER_REGISTER",
        resource_type="user",
        resource_id=str(user.id),
        actor_user_id=user.id,
        outcome="success",
        details={"role": user.role}
    )

    return SessionResponse(
        user=UserResponse.model_validate(user),
        csrf_token=csrf_token,
        expires_at=expires_at,
        message="Patient registered successfully"
    )

@router.post("/login", response_model=SessionResponse)
def login(
    req: UserLogin,
    response: Response,
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if not user or not verify_password(req.password, user.password_hash):
        log_audit_event(
            db,
            action="USER_LOGIN_FAILED",
            resource_type="user",
            outcome="denied",
            details={"email": req.email.lower().strip()}
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if not user.is_active:
        log_audit_event(
            db,
            action="USER_LOGIN_INACTIVE",
            resource_type="user",
            resource_id=str(user.id),
            actor_user_id=user.id,
            outcome="denied"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated. Please contact an administrator."
        )

    session_token, csrf_token, expires_at = create_user_session(db, user)

    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite=settings.COOKIE_SAMESITE,
        max_age=settings.SESSION_EXPIRE_HOURS * 3600
    )

    log_audit_event(
        db,
        action="USER_LOGIN_SUCCESS",
        resource_type="user",
        resource_id=str(user.id),
        actor_user_id=user.id,
        outcome="success",
        details={"role": user.role}
    )

    return SessionResponse(
        user=UserResponse.model_validate(user),
        csrf_token=csrf_token,
        expires_at=expires_at,
        message="Logged in successfully"
    )

@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user_and_session: tuple[User, Any] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    user, _ = user_and_session
    session_token = request.cookies.get(settings.SESSION_COOKIE_NAME)
    if session_token:
        revoke_session(db, session_token)

    response.delete_cookie(key=settings.SESSION_COOKIE_NAME)

    log_audit_event(
        db,
        action="USER_LOGOUT",
        resource_type="user",
        resource_id=str(user.id),
        actor_user_id=user.id,
        outcome="success"
    )

    return {"message": "Logged out successfully"}

@router.get("/me", response_model=SessionResponse)
def get_current_user_profile(
    user_and_session: tuple[User, Any] = Depends(get_current_user_and_session)
):
    user, session_rec = user_and_session
    # Return placeholder csrf token for session verification
    return SessionResponse(
        user=UserResponse.model_validate(user),
        csrf_token="active_session_verified",
        expires_at=session_rec.expires_at,
        message="Session active"
    )
