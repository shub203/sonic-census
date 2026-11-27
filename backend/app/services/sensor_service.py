import random
import uuid
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import Sensor, Measurement, SoundEvent, Alert
from app.compliance.rule_engine import ComplianceEngine

class SensorService:
    @staticmethod
    def register_sensor(
        db: Session,
        sensor_name: str,
        location_name: str,
        latitude: float,
        longitude: float,
        zone_type: str = "Residential",
        sensor_type: str = "IoT Acoustic Node"
    ) -> Sensor:
        sensor = Sensor(
            sensor_name=sensor_name,
            location_name=location_name,
            latitude=latitude,
            longitude=longitude,
            zone_type=zone_type,
            sensor_type=sensor_type,
            status="active",
            calibration_date=datetime.utcnow().date(),
            last_seen=datetime.utcnow()
        )
        db.add(sensor)
        db.commit()
        db.refresh(sensor)
        return sensor

    @staticmethod
    def ingest_reading(
        db: Session,
        sensor_id: str,
        laeq: float,
        lmax: float,
        category: str = "Traffic",
        confidence: float = 0.85,
        duration: float = 60.0,
        auto_commit: bool = True
    ) -> Dict[str, Any]:
        sensor = db.query(Sensor).filter(Sensor.id == sensor_id).first()
        if not sensor:
            raise ValueError("Sensor not found")

        sensor.last_seen = datetime.utcnow()
        sensor.status = "active"

        # Measurement
        meas = Measurement(
            sensor_id=sensor.id,
            timestamp=datetime.utcnow(),
            laeq=laeq,
            lmax=lmax,
            measurement_duration=duration,
            frequency_weighting="A",
            time_weighting="Fast",
            calibration_status="calibrated",
            measurement_uncertainty=0.5
        )
        db.add(meas)
        db.flush()

        # Sound Event
        event = SoundEvent(
            audio_file_id=None,
            sensor_id=sensor.id,
            category=category,
            confidence_score=confidence,
            start_time=0.0,
            end_time=duration,
            model_name="PANNs-CNN14-IoT"
        )
        db.add(event)

        # Compliance Assessment
        assessment = ComplianceEngine.evaluate_measurement(
            db=db,
            measurement=meas,
            zone_type=sensor.zone_type,
            auto_commit=False
        )

        # If exceedance, create an Alert
        alert_record = None
        if assessment["outcome"] == "potential_exceedance":
            alert = Alert(
                sensor_id=sensor.id,
                measurement_id=meas.id,
                alert_type="Noise Limit Exceedance",
                severity="critical" if assessment["exceedance_amount"] > 10 else "warning",
                description=f"Sensor '{sensor.sensor_name}' at {sensor.location_name} detected {laeq} dB(A), exceeding {sensor.zone_type} threshold by {assessment['exceedance_amount']} dB(A). Primary source: {category}.",
                status="active"
            )
            db.add(alert)
            alert_record = alert

        if auto_commit:
            db.commit()
            db.refresh(meas)
        else:
            db.flush()
        return {
            "measurement_id": meas.id,
            "sensor_id": sensor.id,
            "sensor_name": sensor.sensor_name,
            "laeq": laeq,
            "lmax": lmax,
            "category": category,
            "assessment": assessment,
            "alert_created": alert_record is not None
        }

    @staticmethod
    def simulate_telemetry_tick(db: Session) -> List[Dict[str, Any]]:
        """
        Simulates live IoT acoustic sensor readings across active sensors in a single atomic transaction.
        """
        sensors = db.query(Sensor).all()
        results = []
        categories = ["Traffic", "Construction", "Human activity", "Industrial", "Emergency", "Nature"]

        for s in sensors:
            # Baseline depending on zone
            baseline = {
                "Industrial": 68.0,
                "Commercial": 58.0,
                "Residential": 48.0,
                "Silence": 42.0
            }.get(s.zone_type, 50.0)

            # Add random jitter and occasional peak
            jitter = random.uniform(-4.0, 9.0)
            laeq = round(baseline + jitter, 1)
            lmax = round(laeq + random.uniform(3.0, 12.0), 1)
            cat = random.choice(categories) if laeq > 58 else "Nature"
            conf = round(random.uniform(0.72, 0.96), 2)

            res = SensorService.ingest_reading(
                db=db,
                sensor_id=s.id,
                laeq=laeq,
                lmax=lmax,
                category=cat,
                confidence=conf,
                duration=60.0,
                auto_commit=False
            )
            results.append(res)

        db.commit()
        return results
