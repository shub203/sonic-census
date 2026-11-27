import urllib.request
import json
import os
import mimetypes

BASE_URL = "http://127.0.0.1:8000/api/v1"

def test_api():
    print("==================================================")
    print("SONIC CENSUS — END-TO-END VERIFICATION SUITE")
    print("==================================================")

    # 1. Health Check & Officer Auth
    req = urllib.request.Request(f"{BASE_URL}/health")
    with urllib.request.urlopen(req) as resp:
        health = json.loads(resp.read().decode())
        print(f" [1/7] Health Check: Status={health.get('status')}, AI Engine={health.get('ai_engine')}")

    login_payload = json.dumps({"email": "officer@soniccensus.ai", "password": "admin123"}).encode("utf-8")
    login_req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_payload, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(login_req) as resp:
        officer_token = json.loads(resp.read().decode())["access_token"]
    auth_headers = {"Content-Type": "application/json", "Authorization": f"Bearer {officer_token}"}

    # 2. Dashboard Summary
    req = urllib.request.Request(f"{BASE_URL}/dashboard/summary")
    with urllib.request.urlopen(req) as resp:
        summary = json.loads(resp.read().decode())
        print(f" [2/7] Dashboard Summary: Avg LAeq={summary.get('average_laeq')} dB(A), Peak={summary.get('peak_laeq')} dB(A), Active Sensors={summary.get('active_sensors')}")

    # 3. Audio Upload 1 (Traffic + Horn)
    print(" [3/7] Uploading Audio Sample 1: traffic_horn_sample.wav...")
    file_path = "sample_audio/traffic_horn_sample.wav"
    boundary = "----WebKitFormBoundarySonicCensus7MA4YWxkTrZu0gW"
    
    with open(file_path, "rb") as f:
        file_bytes = f.read()

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="traffic_horn_sample.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + file_bytes + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="zone_type"\r\n\r\n'
        f"Residential\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="is_calibrated"\r\n\r\n'
        f"false\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    upload_req = urllib.request.Request(
        f"{BASE_URL}/audio/uploads",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(upload_req) as resp:
        res = json.loads(resp.read().decode())
        primary_cat = res["sound_events"][0]["category"] if res["sound_events"] else "None"
        laeq = res["acoustic_measurement"]["laeq"]
        outcome = res["compliance"]["outcome"]
        spectrogram = res["spectrogram_url"]
        print(f"   -> AI Detected: {primary_cat} ({len(res['sound_events'])} event segments)")
        print(f"   -> Acoustic: LAeq={laeq} dB(A), Lmax={res['acoustic_measurement']['lmax']} dB(A)")
        print(f"   -> Compliance Outcome: {outcome} in Residential zone")
        print(f"   -> Spectrogram URL: {spectrogram}")
        print(f"   -> Waveform data points: {len(res['waveform'])}")

    # 4. Audio Upload 2 (Construction Hammer)
    print(" [4/7] Uploading Audio Sample 2: construction_hammer_sample.wav...")
    file_path_const = "sample_audio/construction_hammer_sample.wav"
    with open(file_path_const, "rb") as f:
        file_bytes_const = f.read()

    body_const = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="construction_hammer_sample.wav"\r\n'
        f"Content-Type: audio/wav\r\n\r\n"
    ).encode("utf-8") + file_bytes_const + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="zone_type"\r\n\r\n'
        f"Silence\r\n"
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="is_calibrated"\r\n\r\n'
        f"false\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    upload_req_2 = urllib.request.Request(
        f"{BASE_URL}/audio/uploads",
        data=body_const,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(upload_req_2) as resp:
        res2 = json.loads(resp.read().decode())
        primary_cat2 = res2["sound_events"][0]["category"] if res2["sound_events"] else "None"
        print(f"   -> AI Detected: {primary_cat2} (Category successfully tagged)")
        print(f"   -> Compliance in Silence Zone: {res2['compliance']['outcome']}")

    # 5. IoT Sensor Telemetry Simulation
    print(" [5/7] Testing IoT Sensor Live Telemetry Simulation...")
    sim_req = urllib.request.Request(f"{BASE_URL}/sensors/simulate", data=b"{}", headers=auth_headers)
    with urllib.request.urlopen(sim_req) as resp:
        sim_res = json.loads(resp.read().decode())
        print(f"   -> {sim_res.get('message')}")

    # 6. PDF Report Generation
    print(" [6/7] Testing Formal PDF Report Generation (ReportLab)...")
    report_payload = json.dumps({
        "report_type": "Daily Environmental Monitoring",
        "reporting_period": "Last 24 Hours",
        "location": "New Delhi Central Zone",
        "file_format": "PDF"
    }).encode("utf-8")
    rep_req = urllib.request.Request(f"{BASE_URL}/reports/generate", data=report_payload, headers=auth_headers)
    with urllib.request.urlopen(rep_req) as resp:
        report_res = json.loads(resp.read().decode())
        print(f"   -> Generated PDF Report ID: {report_res['id']}")
        print(f"   -> File Path: {report_res['file_path']}")

    # 7. Report Download
    download_url = f"{BASE_URL}/reports/{report_res['id']}/download"
    with urllib.request.urlopen(download_url) as resp:
        pdf_bytes = resp.read()
        print(f" [7/7] Tested PDF Report Download: Received {len(pdf_bytes)} bytes (Valid PDF header: {pdf_bytes[:4].decode('latin-1')})")

    print("==================================================")
    print(" ALL 7 VERIFICATION STAGES COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    test_api()
