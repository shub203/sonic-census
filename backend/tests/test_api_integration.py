import asyncio
import base64
import hashlib
import io
import json
import math
import os
import uuid
import wave
import zipfile
from seed_data import seed_database
from app.main import app
from app.security.rate_limit import rate_limiter


def _asgi_call(method: str, path: str, body: bytes = b"", headers: dict | None = None):
    raw_headers = [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in (headers or {}).items()]
    if body and not any(k == b"content-length" for k, _ in raw_headers):
        raw_headers.append((b"content-length", str(len(body)).encode("latin-1")))

    clean_path, _, qs = path.partition("?")
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": clean_path,
        "raw_path": clean_path.encode("latin-1"),
        "query_string": qs.encode("latin-1"),
        "headers": raw_headers,
        "client": ("127.0.0.1", 12345),
        "server": ("testserver", 80),
    }

    sent_body = False
    status_code = 500
    resp_chunks = []

    async def receive():
        nonlocal sent_body
        if not sent_body:
            sent_body = True
            return {"type": "http.request", "body": body, "more_body": False}
        return {"type": "http.disconnect"}

    async def send(message):
        nonlocal status_code
        if message["type"] == "http.response.start":
            status_code = message["status"]
        elif message["type"] == "http.response.body":
            resp_chunks.append(message.get("body", b""))

    asyncio.run(app(scope, receive, send))
    raw_resp = b"".join(resp_chunks)
    try:
        parsed = json.loads(raw_resp.decode("utf-8"))
    except Exception:
        parsed = raw_resp
    return status_code, parsed


def _json_call(method: str, path: str, payload=None, headers: dict | None = None):
    hdrs = dict(headers or {})
    body = b""
    if payload is not None:
        hdrs["Content-Type"] = "application/json"
        body = json.dumps(payload).encode("utf-8")
    return _asgi_call(method, path, body=body, headers=hdrs)


def _make_wav_bytes(freq=1850, duration_sec=1.5, sr=16000):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        samples = bytearray()
        for i in range(int(duration_sec * sr)):
            t = i / sr
            val = 0.4 * math.sin(2 * math.pi * freq * t) + 0.2 * math.sin(2 * math.pi * (freq * 2) * t)
            s = int(max(-1.0, min(1.0, val)) * 32767)
            samples.extend(s.to_bytes(2, "little", signed=True))
        wf.writeframes(bytes(samples))
    return buf.getvalue()


def setup_module(module):
    rate_limiter.reset()
    seed_database()


def test_root_and_health():
    st, data = _json_call("GET", "/")
    assert st == 200
    assert data["project"] == "Sonic Census"

    st_h, h = _json_call("GET", "/api/v1/health")
    assert st_h == 200
    assert h["status"] == "healthy"


def test_rbac_auth_enforcement():
    # Unauthenticated admin mutation -> 401
    st1, _ = _json_call("POST", "/api/v1/sensors/simulate", {})
    assert st1 == 401
    st2, _ = _json_call("POST", "/api/v1/reports/generate", {"report_type": "Daily"})
    assert st2 == 401

    # Citizen token -> 403 Forbidden on admin routes
    st_cl, cl_body = _json_call("POST", "/api/v1/auth/login", {"email": "citizen@soniccensus.ai", "password": "citizen123"})
    assert st_cl == 200
    cit_tok = cl_body["access_token"]
    st3, _ = _json_call("POST", "/api/v1/sensors/simulate", {}, headers={"Authorization": f"Bearer {cit_tok}"})
    assert st3 == 403

    # Officer token -> 200 OK
    st_ol, ol_body = _json_call("POST", "/api/v1/auth/login", {"email": "officer@soniccensus.ai", "password": "admin123"})
    assert st_ol == 200
    off_tok = ol_body["access_token"]
    st4, _ = _json_call("POST", "/api/v1/sensors/simulate", {}, headers={"Authorization": f"Bearer {off_tok}"})
    assert st4 == 200


def test_compliance_map_and_complaints():
    st_m, m = _json_call("GET", "/api/v1/map/noise")
    assert st_m == 200
    assert len(m) >= 8

    st_c, c = _json_call("POST", "/api/v1/compliance/evaluate", {"measured_db": 68.0, "zone_type": "Residential", "is_calibrated": True})
    assert st_c == 200
    assert c["outcome"] == "potential_exceedance"

    st_g, g = _json_call("POST", "/api/v1/complaints", {"category": "Traffic", "location": "Sector 9", "city": "New Delhi", "zone": "Residential"})
    assert st_g == 200
    assert g["ticket_number"].startswith("CPCB-NOISE-")

    # Privacy check: unauthenticated GET /complaints returns [] (no PII leaked)
    st_anon, anon_list = _json_call("GET", "/api/v1/complaints")
    assert st_anon == 200 and anon_list == []

    # Public ticket status lookup returns redacted view without street location
    st_trk, trk = _json_call("GET", f"/api/v1/complaints/track/{g['ticket_number']}")
    assert st_trk == 200 and trk["ticket_number"] == g["ticket_number"]
    assert "location" not in trk

    # Officer can view, update status, and delete test complaint
    _, ol_body = _json_call("POST", "/api/v1/auth/login", {"email": "officer@soniccensus.ai", "password": "admin123"})
    off_tok = ol_body["access_token"]
    st_all, all_list = _json_call("GET", "/api/v1/complaints", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_all == 200 and any(row["id"] == g["id"] for row in all_list)

    st_upd, upd = _json_call(
        "PATCH",
        f"/api/v1/complaints/{g['id']}/status",
        {"status": "Under Review", "officer_notes": "Assigned field inspector"},
        headers={"Authorization": f"Bearer {off_tok}"},
    )
    assert st_upd == 200 and upd["status"] == "Under Review" and upd["officer_notes"] == "Assigned field inspector"

    st_del, _ = _json_call("DELETE", f"/api/v1/complaints/{g['id']}", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_del == 200


def test_audio_upload_and_cleanup():
    _, cl_body = _json_call("POST", "/api/v1/auth/login", {"email": "citizen@soniccensus.ai", "password": "citizen123"})
    cit_tok = cl_body["access_token"]
    _, ol_body = _json_call("POST", "/api/v1/auth/login", {"email": "officer@soniccensus.ai", "password": "admin123"})
    off_tok = ol_body["access_token"]

    wav = _make_wav_bytes(freq=1850, duration_sec=1.5)
    expected_sha256 = hashlib.sha256(wav).hexdigest()
    boundary = "----TestAsgiAudioBoundary12345"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="drill_integration.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + wav + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="zone_type"\r\n\r\nResidential\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="is_calibrated"\r\n\r\nfalse\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="use_gemini"\r\n\r\nfalse\r\n'
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    st_u, up = _asgi_call("POST", "/api/v1/audio/uploads", body=body, headers={"Content-Type": f"multipart/form-data; boundary={boundary}"})
    assert st_u == 200
    assert up["id"]
    assert up["spectrogram_url"]
    assert len(up["sound_events"]) >= 1
    assert up["stored_in_db"] is True
    assert up["file_hash"] == expected_sha256
    assert up["entry_hash"] and len(up["entry_hash"]) == 64

    # Download clip directly from DB by recording ID and by SHA-256 content hash
    st_dl1, dl_bytes1 = _asgi_call("GET", f"/api/v1/audio/{up['id']}/download")
    assert st_dl1 == 200
    assert dl_bytes1 == wav

    st_dl2, dl_bytes2 = _asgi_call("GET", f"/api/v1/audio/by-hash/{expected_sha256}/download")
    assert st_dl2 == 200
    assert dl_bytes2 == wav

    # Officer RBAC enforcement on vault listing & export
    st_unauth, _ = _json_call("GET", "/api/v1/audio/vault")
    assert st_unauth == 401
    st_cit, _ = _json_call("GET", "/api/v1/audio/vault", headers={"Authorization": f"Bearer {cit_tok}"})
    assert st_cit == 403

    st_v, vault = _json_call("GET", "/api/v1/audio/vault", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_v == 200
    assert vault["total_entries"] >= 1
    assert any(e["id"] == up["id"] and e["file_hash"] == expected_sha256 for e in vault["entries"])

    # Export full ZIP database archive
    st_zip, zip_bytes = _asgi_call("GET", "/api/v1/audio/vault/export?format=zip", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_zip == 200
    with zipfile.ZipFile(io.BytesIO(zip_bytes), "r") as zf:
        names = set(zf.namelist())
        assert "hash_ledger.json" in names
        assert "hash_ledger.csv" in names
        assert f"audio/{expected_sha256}.wav" in names
        assert zf.read(f"audio/{expected_sha256}.wav") == wav

    # Export JSON with Base64 audio payloads & CSV hash ledger
    st_json, json_bytes = _asgi_call("GET", "/api/v1/audio/vault/export?format=json&include_base64=true", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_json == 200
    matched = [e for e in json_bytes["entries"] if e["id"] == up["id"]]
    assert matched and base64.b64decode(matched[0]["audio_base64"]) == wav

    st_csv, csv_bytes = _asgi_call("GET", "/api/v1/audio/vault/export?format=csv", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_csv == 200
    assert expected_sha256.encode("utf-8") in csv_bytes

    st_del, _ = _json_call("DELETE", f"/api/v1/audio/{up['id']}", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_del == 200


def test_commercial_security_and_blob_persistence():
    rate_limiter.reset()

    # 1. Public signup MUST ignore client-supplied role='officer' and create a citizen
    unique_email = f"audit_cit_{uuid.uuid4().hex[:8]}@example.com"
    st_reg, reg_body = _json_call(
        "POST",
        "/api/v1/auth/register",
        {"name": "Audit Test User", "email": unique_email, "password": "StrongPassword123", "role": "officer"},
    )
    assert st_reg == 200
    assert reg_body["user"]["role"] == "citizen"

    # Weak password rejected
    st_weak, _ = _json_call(
        "POST",
        "/api/v1/auth/register",
        {"name": "Weak", "email": f"weak_{uuid.uuid4().hex[:6]}@example.com", "password": "123"},
    )
    assert st_weak == 422

    # 2. Sensor telemetry requires X-API-Key or Officer auth
    _, ol_body = _json_call("POST", "/api/v1/auth/login", {"email": "officer@soniccensus.ai", "password": "admin123"})
    off_tok = ol_body["access_token"]
    st_sensors, sensors = _json_call("GET", "/api/v1/sensors")
    assert st_sensors == 200 and len(sensors) >= 1
    sensor_id = sensors[0]["id"]

    st_noauth, _ = _json_call("POST", f"/api/v1/sensors/{sensor_id}/readings", {"laeq": 61.5, "lmax": 70.2})
    assert st_noauth == 401

    st_key, key_data = _json_call(
        "POST",
        f"/api/v1/sensors/{sensor_id}/api-keys",
        {"label": "CI Test Node"},
        headers={"Authorization": f"Bearer {off_tok}"},
    )
    assert st_key == 200 and key_data["api_key"].startswith("sc_iot_")

    st_ingest, ingest_res = _json_call(
        "POST",
        f"/api/v1/sensors/{sensor_id}/readings",
        {"laeq": 62.4, "lmax": 71.0, "category": "Traffic"},
        headers={"X-API-Key": key_data["api_key"]},
    )
    assert st_ingest == 200 and ingest_res["sensor_id"] == sensor_id

    # Revoke key and verify rejection
    st_rev, _ = _json_call(
        "DELETE",
        f"/api/v1/sensors/{sensor_id}/api-keys/{key_data['id']}",
        headers={"Authorization": f"Bearer {off_tok}"},
    )
    assert st_rev == 200
    st_after_rev, _ = _json_call(
        "POST",
        f"/api/v1/sensors/{sensor_id}/readings",
        {"laeq": 62.4, "lmax": 71.0},
        headers={"X-API-Key": key_data["api_key"]},
    )
    assert st_after_rev == 401

    # 3. Generated report persists inside DB even if disk file is deleted
    st_rep, rep = _json_call(
        "POST",
        "/api/v1/reports/generate",
        {"report_type": "Daily", "reporting_period": "Last 24 Hours", "location": "Delhi", "file_format": "CSV"},
        headers={"Authorization": f"Bearer {off_tok}"},
    )
    assert st_rep == 200
    disk_file = os.path.join("generated_reports", os.path.basename(rep["file_path"]))
    if os.path.exists(disk_file):
        os.remove(disk_file)
    st_rdl, rdl_bytes = _asgi_call("GET", f"/api/v1/reports/{rep['id']}/download")
    assert st_rdl == 200 and b"Sonic Census" in rdl_bytes

    # 4. Audit logs & storage stats accessible to officer
    st_aud, audit_rows = _json_call("GET", "/api/v1/admin/audit-logs?limit=20", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_aud == 200 and len(audit_rows) >= 1
    st_stats, stats = _json_call("GET", "/api/v1/admin/storage-stats", headers={"Authorization": f"Bearer {off_tok}"})
    assert st_stats == 200 and "vault_quota_mb" in stats
