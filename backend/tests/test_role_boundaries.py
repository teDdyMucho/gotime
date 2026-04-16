"""
Role Boundary Tests — Phase 6 HIPAA requirement.

Tests that each role can only access endpoints they are permitted to.
Uses the FastAPI test client — no real Supabase connection needed for
the auth layer tests (403/401 responses are enforced by our middleware
before any DB call).

Run with:  cd backend && python -m pytest tests/test_role_boundaries.py -v

To run the full suite including live DB checks, set env vars in .env first.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# We patch supabase before importing main so get_supabase() returns a mock
_mock_supabase = MagicMock()
_mock_supabase.table.return_value.select.return_value.execute.return_value.data = []
_mock_supabase.table.return_value.select.return_value.ilike.return_value.order.return_value.execute.return_value.data = []
_mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
_mock_supabase.table.return_value.select.return_value.order.return_value.execute.return_value.data = []
_mock_supabase.table.return_value.select.return_value.order.return_value.range.return_value.execute.return_value.data = []


def _make_token(role: str) -> str:
    """
    Build a minimal JWT-like Bearer token string that our security middleware
    will decode to the given role.  We patch the JWKS verifier so the
    signature is never checked — we only care about the middleware routing.
    """
    import base64, json
    header = base64.urlsafe_b64encode(b'{"alg":"RS256","typ":"JWT"}').decode().rstrip("=")
    payload_data = {
        "sub": f"test-user-{role}",
        "email": f"{role}@test.com",
        "role": "authenticated",
        "user_metadata": {"role": role},
        "app_metadata": {"role": role},
        "exp": 9999999999,
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")
    sig = base64.urlsafe_b64encode(b"fakesig").decode().rstrip("=")
    return f"Bearer {header}.{payload}.{sig}"


INTAKE_TOKEN     = _make_token("intake_staff")
DISPATCHER_TOKEN = _make_token("senior_dispatcher")
ADMIN_TOKEN      = _make_token("admin")
NO_TOKEN         = ""


@pytest.fixture(scope="module")
def client():
    """FastAPI test client with Supabase and JWT verification mocked."""
    with patch("app.db.supabase.get_supabase", return_value=_mock_supabase), \
         patch("app.core.security.get_jwks", return_value={"keys": []}), \
         patch("app.core.security.jwt.decode") as mock_decode:

        def side_effect(token, *args, **kwargs):
            # Return the payload we embedded in the fake token
            import base64, json
            parts = token.split(".")
            padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
            return json.loads(base64.urlsafe_b64decode(padded))

        mock_decode.side_effect = side_effect

        from app.main import app
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c


# ─── Unauthenticated ──────────────────────────────────────────────────────────

class TestUnauthenticated:
    def test_trips_requires_auth(self, client):
        r = client.get("/api/trips")
        assert r.status_code == 401, f"Expected 401, got {r.status_code}"

    def test_clients_requires_auth(self, client):
        r = client.get("/api/clients")
        assert r.status_code == 401

    def test_facilities_requires_auth(self, client):
        r = client.get("/api/facilities")
        assert r.status_code == 401

    def test_audit_requires_auth(self, client):
        r = client.get("/api/audit")
        assert r.status_code == 401

    def test_dashboard_requires_auth(self, client):
        r = client.get("/api/metrics/summary")
        assert r.status_code == 401


# ─── Intake Staff role ────────────────────────────────────────────────────────

class TestIntakeStaff:
    def _h(self):
        return {"Authorization": INTAKE_TOKEN}

    def test_can_list_trips(self, client):
        r = client.get("/api/trips", headers=self._h())
        assert r.status_code == 200

    def test_can_list_clients(self, client):
        r = client.get("/api/clients", headers=self._h())
        assert r.status_code == 200

    def test_can_create_trip(self, client):
        # 422 is fine — it means auth passed, body validation failed
        r = client.post("/api/trips", json={}, headers=self._h())
        assert r.status_code in (201, 422, 500)

    def test_cannot_access_audit(self, client):
        r = client.get("/api/audit", headers=self._h())
        assert r.status_code == 403, f"Intake staff should not read audit log, got {r.status_code}"

    def test_cannot_access_metrics(self, client):
        r = client.get("/api/metrics/summary", headers=self._h())
        assert r.status_code == 403, f"Intake staff should not read dashboard, got {r.status_code}"

    def test_cannot_review_trip(self, client):
        r = client.patch(
            "/api/trips/00000000-0000-0000-0000-000000000001/review",
            json={"action": "accept"},
            headers=self._h(),
        )
        assert r.status_code == 403, f"Intake staff should not review trips, got {r.status_code}"

    def test_cannot_cancel_trip(self, client):
        r = client.patch(
            "/api/trips/00000000-0000-0000-0000-000000000001/cancel",
            json={"cancellation_reason": "other"},
            headers=self._h(),
        )
        assert r.status_code == 403


# ─── Senior Dispatcher role ───────────────────────────────────────────────────

class TestSeniorDispatcher:
    def _h(self):
        return {"Authorization": DISPATCHER_TOKEN}

    def test_can_list_trips(self, client):
        r = client.get("/api/trips", headers=self._h())
        assert r.status_code == 200

    def test_can_access_metrics(self, client):
        r = client.get("/api/metrics/summary", headers=self._h())
        assert r.status_code == 200

    def test_cannot_access_audit(self, client):
        r = client.get("/api/audit", headers=self._h())
        assert r.status_code == 403, f"Dispatcher should not read audit log, got {r.status_code}"

    def test_cannot_create_facility(self, client):
        r = client.post("/api/facilities", json={}, headers=self._h())
        assert r.status_code == 403, f"Dispatcher should not create facilities, got {r.status_code}"

    def test_cannot_create_pay_source(self, client):
        r = client.post("/api/pay-sources", json={}, headers=self._h())
        assert r.status_code == 403


# ─── Admin role ───────────────────────────────────────────────────────────────

class TestAdmin:
    def _h(self):
        return {"Authorization": ADMIN_TOKEN}

    def test_can_list_trips(self, client):
        r = client.get("/api/trips", headers=self._h())
        assert r.status_code == 200

    def test_can_access_audit(self, client):
        r = client.get("/api/audit", headers=self._h())
        assert r.status_code == 200

    def test_can_access_metrics(self, client):
        r = client.get("/api/metrics/summary", headers=self._h())
        assert r.status_code == 200

    def test_can_create_facility(self, client):
        r = client.post("/api/facilities", json={}, headers=self._h())
        assert r.status_code in (201, 422, 500)

    def test_can_create_pay_source(self, client):
        r = client.post("/api/pay-sources", json={}, headers=self._h())
        assert r.status_code in (201, 422, 500)
