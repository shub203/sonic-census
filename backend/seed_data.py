import os
import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database.connection import SessionLocal, init_db
from app.database.models import User, Sensor, Measurement, SoundEvent, ComplianceRule, Alert, CitizenComplaint
from app.dependencies import get_password_hash
from app.compliance.india_rules import INDIAN_NOISE_RULES_2000
from app.compliance.rule_engine import ComplianceEngine
from app.services.audio_service import AudioService

def seed_database():
    init_db()
    db = SessionLocal()
    try:
        # 0. Backfill any pre-existing disk audio uploads into hashed DB vault
        migrated = AudioService.backfill_audio_vault(db)
        if migrated:
            print(f"[Seeding] Synced {migrated} legacy audio hash/vault entries into SQLite DB.")
        # 1. Seed Compliance Rules if not present
        if db.query(ComplianceRule).count() == 0:
            print("[Seeding] Inserting CPCB Indian Noise Rules 2000...")
            for r in INDIAN_NOISE_RULES_2000:
                rule = ComplianceRule(**r)
                db.add(rule)
            db.commit()

        # 2. Seed Default Users
        default_users = [
            ("CPCB Environmental Officer", "officer@soniccensus.ai", "admin123", "officer"),
            ("Acoustic Data Analyst", "analyst@soniccensus.ai", "analyst123", "analyst"),
            ("Public Citizen Observer", "citizen@soniccensus.ai", "citizen123", "citizen"),
        ]
        created_any = False
        for name, email, pwd, role in default_users:
            if not db.query(User).filter(User.email == email).first():
                db.add(User(
                    name=name,
                    email=email,
                    password_hash=get_password_hash(pwd),
                    role=role
                ))
                created_any = True
        if created_any:
            print("[Seeding] Ensuring default Sonic Census users...")
            db.commit()

        # 3. Seed Sensors across Indian Urban Centers
        if db.query(Sensor).count() == 0:
            print("[Seeding] Registering metropolitan acoustic sensors...")
            sample_sensors = [
                {
                    "sensor_name": "DEL-CP-01",
                    "location_name": "Connaught Place Inner Circle, New Delhi",
                    "zone_type": "Commercial",
                    "latitude": 28.6328,
                    "longitude": 77.2197,
                    "sensor_type": "IoT Class 1 Sound Monitor"
                },
                {
                    "sensor_name": "DEL-AIIMS-02",
                    "location_name": "AIIMS Hospital Campus, Ansari Nagar, New Delhi",
                    "zone_type": "Silence",
                    "latitude": 28.5672,
                    "longitude": 77.2100,
                    "sensor_type": "Low-Noise Precision Array"
                },
                {
                    "sensor_name": "MUM-BKC-01",
                    "location_name": "Bandra Kurla Complex, Mumbai",
                    "zone_type": "Commercial",
                    "latitude": 19.0657,
                    "longitude": 72.8687,
                    "sensor_type": "IoT Class 1 Sound Monitor"
                },
                {
                    "sensor_name": "MUM-ANDH-02",
                    "location_name": "MIDC Industrial Estate, Andheri East, Mumbai",
                    "zone_type": "Industrial",
                    "latitude": 19.1197,
                    "longitude": 72.8764,
                    "sensor_type": "High-SPL Industrial Sensor"
                },
                {
                    "sensor_name": "BLR-INDIRA-01",
                    "location_name": "Indiranagar 100ft Road, Bengaluru",
                    "zone_type": "Commercial",
                    "latitude": 12.9784,
                    "longitude": 77.6408,
                    "sensor_type": "Smart City IoT Acoustic Node"
                },
                {
                    "sensor_name": "BLR-KORAM-02",
                    "location_name": "Koramangala 4th Block, Bengaluru",
                    "zone_type": "Residential",
                    "latitude": 12.9345,
                    "longitude": 77.6266,
                    "sensor_type": "Community Sound Node"
                },
                {
                    "sensor_name": "HYD-HITEC-01",
                    "location_name": "Cyber Towers, Hitec City, Hyderabad",
                    "zone_type": "Commercial",
                    "latitude": 17.4504,
                    "longitude": 78.3808,
                    "sensor_type": "Smart City IoT Acoustic Node"
                },
                {
                    "sensor_name": "CHN-T-NAGAR-01",
                    "location_name": "Ranganathan Street, T. Nagar, Chennai",
                    "zone_type": "Commercial",
                    "latitude": 13.0418,
                    "longitude": 80.2337,
                    "sensor_type": "Urban Micro-Acoustic Station"
                }
            ]

            sensors_objs = []
            for s in sample_sensors:
                sensor = Sensor(
                    sensor_name=s["sensor_name"],
                    location_name=s["location_name"],
                    zone_type=s["zone_type"],
                    latitude=s["latitude"],
                    longitude=s["longitude"],
                    sensor_type=s["sensor_type"],
                    status="active",
                    calibration_date=(datetime.utcnow() - timedelta(days=random.randint(5, 60))).date(),
                    last_seen=datetime.utcnow()
                )
                db.add(sensor)
                sensors_objs.append(sensor)
            db.commit()

            # Seed recent measurements and sound events for each sensor
            categories_pool = ["Traffic", "Construction", "Human activity", "Industrial", "Nature"]
            for s in sensors_objs:
                base_spl = {"Industrial": 69.0, "Commercial": 61.0, "Residential": 51.0, "Silence": 44.0}.get(s.zone_type, 50.0)
                for i in range(5):
                    t = datetime.utcnow() - timedelta(hours=i*2)
                    laeq = round(base_spl + random.uniform(-4.0, 8.5), 1)
                    lmax = round(laeq + random.uniform(4.0, 11.0), 1)
                    cat = random.choice(categories_pool)

                    meas = Measurement(
                        sensor_id=s.id,
                        timestamp=t,
                        laeq=laeq,
                        lmax=lmax,
                        measurement_duration=60.0,
                        frequency_weighting="A",
                        time_weighting="Fast",
                        calibration_status="calibrated",
                        measurement_uncertainty=0.5
                    )
                    db.add(meas)
                    db.flush()

                    evt = SoundEvent(
                        sensor_id=s.id,
                        category=cat,
                        confidence_score=round(random.uniform(0.75, 0.96), 2),
                        start_time=0.0,
                        end_time=60.0,
                        model_name="PANNs-CNN14-IoT",
                        created_at=t
                    )
                    db.add(evt)

                    # Assess
                    assessment = ComplianceEngine.evaluate_measurement(
                        db=db,
                        measurement=meas,
                        zone_type=s.zone_type,
                        custom_time=t
                    )

                    # Create alert if exceedance
                    if assessment["outcome"] == "potential_exceedance":
                        alert = Alert(
                            sensor_id=s.id,
                            measurement_id=meas.id,
                            alert_type="Noise Limit Exceedance",
                            severity="warning" if assessment["exceedance_amount"] < 8 else "critical",
                            description=f"Sensor '{s.sensor_name}' at {s.location_name} recorded {laeq} dB(A), exceeding {s.zone_type} threshold ({assessment['threshold_db']} dB). Primary sound: {cat}.",
                            status="active",
                            created_at=t
                        )
                        db.add(alert)

            db.commit()
            print("[Seeding] Completed database initialization with sensors, measurements, and alerts.")

        # 4. Seed initial Citizen Complaints if empty
        if db.query(CitizenComplaint).count() == 0:
            db.add_all([
                CitizenComplaint(
                    ticket_number="CPCB-NOISE-2026-8912",
                    category="Late-Night Loudspeaker (Past 10 PM)",
                    location="Block C, Vasant Kunj",
                    city="New Delhi",
                    zone_type="Residential",
                    incident_time="23:45",
                    description="Continuous amplified PA system exceeding nocturnal threshold.",
                    status="Under Review",
                    is_exceedance=True,
                ),
                CitizenComplaint(
                    ticket_number="CPCB-NOISE-2026-7645",
                    category="Illegal Night Construction",
                    location="Indiranagar 100ft Road",
                    city="Bengaluru",
                    zone_type="Commercial",
                    incident_time="02:15",
                    description="Concrete breaker operation past permitted construction hours.",
                    status="Notice Issued",
                    is_exceedance=False,
                ),
            ])
            db.commit()

    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
