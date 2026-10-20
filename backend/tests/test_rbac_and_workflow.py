import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.sharing import SharingGrant, SharingGrantDocument
from app.models.enums import UserRole, SharingStatus
from app.core.config import settings

client = TestClient(app)

def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert data["database"] == "connected"

def test_login_invalid_credentials():
    response = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "WrongPassword123"
    })
    assert response.status_code == 401

def test_patient_login():
    response = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "patient"
    assert settings.SESSION_COOKIE_NAME in response.cookies

def test_clinician_login():
    response = client.post("/api/auth/login", json={
        "email": "clinician@meditale.demo",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "clinician"

def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@meditale.demo",
        "password": "Password123!"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["role"] == "administrator"

def test_admin_forbidden_from_clinical_documents():
    # Login as admin
    admin_login = client.post("/api/auth/login", json={
        "email": "admin@meditale.demo",
        "password": "Password123!"
    })
    assert admin_login.status_code == 200
    admin_cookie = admin_login.cookies[settings.SESSION_COOKIE_NAME]

    # Attempt to retrieve a patient clinical document (e.g. document ID 1)
    doc_res = client.get("/api/documents/1", cookies={settings.SESSION_COOKIE_NAME: admin_cookie})
    # Must be denied with 403 Forbidden!
    assert doc_res.status_code == 403
    assert "Administrators are not authorized" in doc_res.json()["detail"]

def test_clinician_access_restricted_to_shared_docs_only():
    # Login as clinician
    clin_login = client.post("/api/auth/login", json={
        "email": "clinician@meditale.demo",
        "password": "Password123!"
    })
    assert clin_login.status_code == 200
    clin_cookie = clin_login.cookies[settings.SESSION_COOKIE_NAME]

    # Document 1 is shared -> Should succeed (200)
    doc1_res = client.get("/api/documents/1", cookies={settings.SESSION_COOKIE_NAME: clin_cookie})
    assert doc1_res.status_code == 200

    # Document 4 (Discharge summary) was NOT included in the sharing grant -> Must fail with 403 Forbidden!
    doc4_res = client.get("/api/documents/4", cookies={settings.SESSION_COOKIE_NAME: clin_cookie})
    assert doc4_res.status_code == 403
    assert "No active sharing grant authorized" in doc4_res.json()["detail"]

def test_revoked_grant_denies_subsequent_access():
    db = SessionLocal()
    try:
        # Create a temporary grant from patient to clinician for document 4
        patient = db.query(User).filter(User.email == "patient@meditale.demo").first()
        clinician = db.query(User).filter(User.email == "clinician@meditale.demo").first()
        
        temp_grant = SharingGrant(
            patient_id=patient.id,
            clinician_id=clinician.id,
            status=SharingStatus.ACTIVE.value
        )
        db.add(temp_grant)
        db.commit()
        db.refresh(temp_grant)

        link = SharingGrantDocument(sharing_grant_id=temp_grant.id, document_id=4)
        db.add(link)
        db.commit()

        # Login as clinician
        clin_login = client.post("/api/auth/login", json={
            "email": "clinician@meditale.demo",
            "password": "Password123!"
        })
        clin_cookie = clin_login.cookies[settings.SESSION_COOKIE_NAME]

        # While active, access succeeds
        res_active = client.get("/api/documents/4", cookies={settings.SESSION_COOKIE_NAME: clin_cookie})
        assert res_active.status_code == 200

        # Now revoke the grant
        patient_login = client.post("/api/auth/login", json={
            "email": "patient@meditale.demo",
            "password": "Password123!"
        })
        pat_cookie = patient_login.cookies[settings.SESSION_COOKIE_NAME]
        revoke_res = client.post(f"/api/sharing/grants/{temp_grant.id}/revoke", cookies={settings.SESSION_COOKIE_NAME: pat_cookie})
        assert revoke_res.status_code == 200

        # Subsequent clinician request MUST BE DENIED with 403!
        res_after_revoke = client.get("/api/documents/4", cookies={settings.SESSION_COOKIE_NAME: clin_cookie})
        assert res_after_revoke.status_code == 403

    finally:
        try:
            if 'temp_grant' in locals() and temp_grant:
                db.query(SharingGrantDocument).filter(SharingGrantDocument.sharing_grant_id == temp_grant.id).delete()
                db.query(SharingGrant).filter(SharingGrant.id == temp_grant.id).delete()
                db.commit()
        except Exception:
            pass
        db.close()
