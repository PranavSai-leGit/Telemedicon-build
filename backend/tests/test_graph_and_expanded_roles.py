import pytest
import sys
from pathlib import Path
from fastapi.testclient import TestClient

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from app.main import app

client = TestClient(app)

def test_relationship_graph_patient_access():
    # Login as patient
    login_res = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    cookies = login_res.cookies

    # Fetch relationship graph
    graph_res = client.get("/api/facts/graph", cookies=cookies)
    assert graph_res.status_code == 200
    data = graph_res.json()
    assert "nodes" in data
    assert "edges" in data
    assert len(data["nodes"]) > 0
    assert len(data["edges"]) > 0

    # Verify node types
    node_types = {n["type"] for n in data["nodes"]}
    assert "condition" in node_types or "medication" in node_types or "document" in node_types

    # Verify edge labels
    edge_labels = {e["label"] for e in data["edges"]}
    assert "Documented in" in edge_labels or "Prescribed for" in edge_labels

def test_clinician_expanded_endpoints():
    # Login as clinician
    login_res = client.post("/api/auth/login", json={
        "email": "clinician@meditale.demo",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    cookies = login_res.cookies

    # Test documents
    docs_res = client.get("/api/clinician/documents", cookies=cookies)
    assert docs_res.status_code == 200
    assert isinstance(docs_res.json(), list)

    # Test discrepancies
    disc_res = client.get("/api/clinician/all-discrepancies", cookies=cookies)
    assert disc_res.status_code == 200
    assert isinstance(disc_res.json(), list)

    # Test consents
    cons_res = client.get("/api/clinician/consents", cookies=cookies)
    assert cons_res.status_code == 200
    assert isinstance(cons_res.json(), list)

    # Test activity
    act_res = client.get("/api/clinician/activity", cookies=cookies)
    assert act_res.status_code == 200
    assert isinstance(act_res.json(), list)

    # Test handovers list
    hand_res = client.get("/api/clinician/handovers", cookies=cookies)
    assert hand_res.status_code == 200
    assert isinstance(hand_res.json(), list)

def test_admin_expanded_endpoints():
    # Login as admin
    login_res = client.post("/api/auth/login", json={
        "email": "admin@meditale.demo",
        "password": "Password123!"
    })
    assert login_res.status_code == 200
    cookies = login_res.cookies

    # Test document monitor
    docs_res = client.get("/api/admin/documents", cookies=cookies)
    assert docs_res.status_code == 200
    assert isinstance(docs_res.json(), list)

    # Test health detailed
    health_res = client.get("/api/admin/health-detailed", cookies=cookies)
    assert health_res.status_code == 200
    h_data = health_res.json()
    assert h_data["database"]["status"] == "connected"
    assert h_data["storage"]["writable"] is True

    # Test config (no sensitive secrets exposed)
    config_res = client.get("/api/admin/config", cookies=cookies)
    assert config_res.status_code == 200
    c_data = config_res.json()
    assert "app_name" in c_data
    assert "SECRET_KEY" not in str(c_data)
    assert "DATABASE_URL" not in str(c_data)

def test_rbac_security_boundaries():
    # Patient cannot access admin config
    pat_res = client.post("/api/auth/login", json={
        "email": "patient@meditale.demo",
        "password": "Password123!"
    })
    pat_cookies = pat_res.cookies
    forbidden_res = client.get("/api/admin/config", cookies=pat_cookies)
    assert forbidden_res.status_code == 403

    # Clinician cannot access admin documents
    clin_res = client.post("/api/auth/login", json={
        "email": "clinician@meditale.demo",
        "password": "Password123!"
    })
    clin_cookies = clin_res.cookies
    forbidden_admin = client.get("/api/admin/documents", cookies=clin_cookies)
    assert forbidden_admin.status_code == 403
