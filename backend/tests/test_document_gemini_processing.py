import pytest
import io
import os
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.db.session import SessionLocal
from app.models.document import Document
from app.models.enums import ProcessingStatus
from app.services.gemini_service import gemini_service
from app.api.documents import resolve_document_file_path
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def patient_auth():
    resp = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "Password123!"
    })
    assert resp.status_code == 200
    token = resp.cookies.get(settings.SESSION_COOKIE_NAME)
    csrf = resp.json()["csrf_token"]
    return token, csrf

def test_ai_status_endpoint(patient_auth):
    token, _ = patient_auth
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)
    response = client.get("/api/documents/ai/status")
    assert response.status_code == 200
    data = response.json()
    assert "ai_configured" in data
    assert "ai_model" in data

def test_image_upload_without_gemini_sets_pending_status(patient_auth):
    token, csrf = patient_auth
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)

    # Fake JPEG bytes with unique salt to avoid duplicate detection
    import uuid
    fake_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9" + uuid.uuid4().bytes
    file_payload = ("prescription_test.jpg", io.BytesIO(fake_jpeg), "image/jpeg")

    response = client.post(
        "/api/documents/upload",
        files={"file": file_payload},
        data={"document_type": "prescription"},
        headers={"X-CSRF-Token": csrf}
    )
    assert response.status_code == 201
    doc_data = response.json()
    doc_id = doc_data["id"]

    # Since Gemini API key is not configured and 0 facts were extracted,
    # the processing status MUST be 'pending' (NOT fake 'completed'!)
    assert doc_data["processing_status"] in ["pending", "completed"]
    if not gemini_service.is_available():
        assert doc_data["processing_status"] == ProcessingStatus.PENDING.value

    # Verify document physical file was saved and is resolvable
    db = SessionLocal()
    doc = db.query(Document).filter(Document.id == doc_id).first()
    assert doc is not None
    resolved_path = resolve_document_file_path(doc)
    assert resolved_path is not None
    assert os.path.exists(resolved_path)

    # Verify view endpoint serves the file with inline content-disposition
    view_resp = client.get(f"/api/documents/{doc_id}/view")
    assert view_resp.status_code == 200
    assert "inline" in view_resp.headers.get("Content-Disposition", "")
    assert view_resp.headers.get("Content-Type") == "image/jpeg"

    # Cleanup created test document
    db.delete(doc)
    db.commit()
    if os.path.exists(resolved_path):
        os.remove(resolved_path)

def test_patient_cannot_configure_ai(patient_auth):
    token, csrf = patient_auth
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)
    # Patient role attempting to configure Gemini API must be rejected with 403 Forbidden
    response = client.post(
        "/api/documents/ai/configure",
        json={"gemini_api_key": "AIzaSyFakeKeyTest", "gemini_model": "gemini-3.8-flash"},
        headers={"X-CSRF-Token": csrf}
    )
    assert response.status_code == 403
    assert "Access denied" in response.json().get("detail", "")

def test_admin_ai_configure_route_access():
    resp = client.post("/api/auth/login", json={
        "email": "admin@meditale.demo",
        "password": "Password123!"
    })
    assert resp.status_code == 200
    token = resp.cookies.get(settings.SESSION_COOKIE_NAME)
    csrf = resp.json()["csrf_token"]
    client.cookies.set(settings.SESSION_COOKIE_NAME, token)

    # Empty key test should reach validation (400) not RBAC denial (403)
    response = client.post(
        "/api/documents/ai/configure",
        json={"gemini_api_key": "", "gemini_model": "gemini-3.8-flash"},
        headers={"X-CSRF-Token": csrf}
    )
    assert response.status_code == 400
    assert "API key cannot be empty" in response.json().get("detail", "")

