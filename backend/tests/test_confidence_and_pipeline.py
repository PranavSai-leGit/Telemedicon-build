import pytest
import io
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app
from app.db.session import SessionLocal
from app.models.user import User
from app.models.document import Document
from app.models.fact import ExtractedFact
from app.models.enums import UserRole, VerificationStatus, ConfidenceBand
from app.services.confidence_service import ConfidenceScoringService
from app.core.config import settings

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    resp_pat = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "Password123!"
    })
    assert resp_pat.status_code == 200
    pat_token = resp_pat.cookies.get(settings.SESSION_COOKIE_NAME)
    pat_csrf = resp_pat.json()["csrf_token"]

    resp_clin = client.post("/api/auth/login", json={
        "email": "clinician@meditale.demo",
        "password": "Password123!"
    })
    assert resp_clin.status_code == 200
    clin_token = resp_clin.cookies.get(settings.SESSION_COOKIE_NAME)
    clin_csrf = resp_clin.json()["csrf_token"]

    resp_admin = client.post("/api/auth/login", json={
        "email": "admin@meditale.demo",
        "password": "Password123!"
    })
    assert resp_admin.status_code == 200
    admin_token = resp_admin.cookies.get(settings.SESSION_COOKIE_NAME)
    admin_csrf = resp_admin.json()["csrf_token"]

    return {
        "patient": (pat_token, pat_csrf),
        "clinician": (clin_token, clin_csrf),
        "admin": (admin_token, admin_csrf)
    }

def test_confidence_fully_supported():
    """Verify that a claim with exact matching excerpt, valid attributes, and digital source achieves High confidence."""
    res = ConfidenceScoringService.evaluate_claim_confidence(
        fact_type="medication",
        normalized_value="Metformin",
        value_json={"dosage": "500mg", "frequency": "twice daily"},
        source_excerpt="Prescribed Metformin 500mg twice daily with meals.",
        source_text="Clinical Encounter Notes: Prescribed Metformin 500mg twice daily with meals. Follow up in 3 months.",
        source_page=1,
        document_date="2025-01-15",
        event_date="2025-01-15",
        is_ocr=False
    )
    assert res["score"] >= 85
    assert res["label"] == ConfidenceBand.HIGH.value
    assert res["breakdown"]["evidence_grounding"] >= 35
    assert res["breakdown"]["evidence_support"] >= 20
    assert res["breakdown"]["schema_validity"] >= 12
    assert res["breakdown"]["consistency"] == 15
    assert res["calibrated"] is False
    assert len(res["reasons"]) > 0

def test_confidence_unsupported_claim():
    """Verify that a claim lacking supporting source excerpt is capped at max 35 (Low confidence)."""
    res = ConfidenceScoringService.evaluate_claim_confidence(
        fact_type="medication",
        normalized_value="Atorvastatin",
        value_json={"dosage": "20mg"},
        source_excerpt="",  # No excerpt!
        source_text="Patient reports mild headache.",
        source_page=None,
        document_date="2025-01-15",
        event_date=None,
        is_ocr=False
    )
    assert res["score"] <= 35
    assert res["label"] == ConfidenceBand.LOW.value
    assert res["has_evidence"] is False
    assert res["recommended_status"] == VerificationStatus.NEEDS_REVIEW.value
    assert any("Missing source excerpt" in r for r in res["reasons"])

def test_confidence_contradicted_claim():
    """Verify that a negation/contradiction in source text caps score at max 15 and flags contradiction."""
    res = ConfidenceScoringService.evaluate_claim_confidence(
        fact_type="condition",
        normalized_value="Diabetes",
        value_json={},
        source_excerpt="Patient denies diabetes or family history of endocrine disorder.",
        source_text="Patient denies diabetes or family history of endocrine disorder.",
        source_page=1,
        document_date="2025-01-15",
        event_date="2025-01-15",
        is_ocr=False
    )
    assert res["score"] <= 15
    assert res["label"] == ConfidenceBand.LOW.value
    assert res["is_contradicted"] is True
    assert res["recommended_status"] == VerificationStatus.CONTRADICTED_BY_SOURCE.value
    assert any("Potential contradiction" in r for r in res["reasons"])

def test_confidence_missing_date_does_not_destroy_claim():
    """Verify that a missing date reduces validity points slightly but does not destroy an otherwise well-supported claim."""
    res = ConfidenceScoringService.evaluate_claim_confidence(
        fact_type="medication",
        normalized_value="Lisinopril",
        value_json={"dosage": "10mg"},
        source_excerpt="Rx: Lisinopril 10mg PO daily.",
        source_text="Rx: Lisinopril 10mg PO daily. Refills: 3.",
        source_page=1,
        document_date=None,
        event_date=None,  # Missing date
        is_ocr=False
    )
    assert res["score"] >= 65  # Still solid Medium/High
    assert res["breakdown"]["schema_validity"] >= 10
    assert any("Event date is unspecified" in r for r in res["reasons"])

def test_fact_confidence_endpoint(auth_tokens):
    """Test GET /api/facts/{id}/confidence returns structured transparent breakdown."""
    pat_token, _ = auth_tokens["patient"]
    client.cookies.set(settings.SESSION_COOKIE_NAME, pat_token)

    # Fact 1 is seeded for patient
    resp = client.get("/api/facts/1/confidence")
    assert resp.status_code == 200
    data = resp.json()
    assert "claim_id" in data
    assert "extracted_value" in data
    assert "system_confidence" in data
    conf = data["system_confidence"]
    assert "score" in conf
    assert "label" in conf
    assert "breakdown" in conf
    assert "reasons" in conf
    assert conf["calibrated"] is False
    assert 0 <= conf["score"] <= 100

def test_admin_ai_monitoring_endpoint(auth_tokens):
    """Test GET /api/admin/ai-monitoring returns operational metrics."""
    admin_token, _ = auth_tokens["admin"]
    client.cookies.set(settings.SESSION_COOKIE_NAME, admin_token)

    resp = client.get("/api/admin/ai-monitoring")
    assert resp.status_code == 200
    data = resp.json()
    assert "summary" in data
    assert "provider_distribution" in data
    assert "confidence_distribution" in data
    summary = data["summary"]
    assert "total_requests" in summary
    assert "success_rate_percent" in summary
    assert "active_model" in summary

def test_clinician_verification_queue_and_resolve(auth_tokens):
    """Test clinician can inspect verification queue and resolve items."""
    clin_token, clin_csrf = auth_tokens["clinician"]
    client.cookies.set(settings.SESSION_COOKIE_NAME, clin_token)

    # 1. Fetch verification queue
    q_resp = client.get("/api/clinician/verification-queue?filter_type=all")
    assert q_resp.status_code == 200
    items = q_resp.json()
    assert isinstance(items, list)

    if items:
        target_item = items[0]
        target_id = target_item["fact_id"]

        # 2. Resolve queue item as verified against source
        res = client.post(
            f"/api/clinician/verification-queue/{target_id}/resolve?action=verify&reviewer_notes=Clinically+confirmed+against+prescription",
            headers={"X-CSRF-Token": clin_csrf}
        )
        assert res.status_code == 200
        resolved_data = res.json()
        assert resolved_data["verification_status"] == "verified_against_source"
        assert resolved_data["reviewer_notes"] == "Clinically confirmed against prescription"

        # 3. Check verification history
        hist_resp = client.get("/api/clinician/verification-history")
        assert hist_resp.status_code == 200
        hist = hist_resp.json()
        assert any(h["fact_id"] == target_id for h in hist)
