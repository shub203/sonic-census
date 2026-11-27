from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.database.models import Sensor, Measurement, SoundEvent
from app.schemas.schemas import SensorCreate, SensorResponse, ReadingIngest
from app.services.sensor_service import SensorService
from app.dependencies import require_officer

router = APIRouter(prefix="/sensors", tags=["Sensors & IoT"])

@router.get("", response_model=List[SensorResponse])
def list_sensors(db: Session = Depends(get_db)):
    sensors = db.query(Sensor).all()
    sensor_ids = [s.id for s in sensors]
    latest_meas_map = {}
    if sensor_ids:
        m_subq = (
            db.query(Measurement.sensor_id, func.max(Measurement.timestamp).label("max_ts"))
            .filter(Measurement.sensor_id.in_(sensor_ids))
            .group_by(Measurement.sensor_id)
            .subquery()
        )
        latest_rows = (
            db.query(Measurement)
            .join(m_subq, (Measurement.sensor_id == m_subq.c.sensor_id) & (Measurement.timestamp == m_subq.c.max_ts))
            .all()
        )
        for m in latest_rows:
            latest_meas_map[m.sensor_id] = m

    results = []
    for s in sensors:
        latest_meas = latest_meas_map.get(s.id)

        results.append(SensorResponse(
            id=s.id,
            sensor_name=s.sensor_name,
            location_name=s.location_name,
            zone_type=s.zone_type,
            latitude=s.latitude,
            longitude=s.longitude,
            sensor_type=s.sensor_type,
            status=s.status,
            calibration_date=s.calibration_date,
            last_seen=s.last_seen,
            latest_laeq=latest_meas.laeq if latest_meas else None
        ))
    return results

@router.post("", response_model=SensorResponse)
def create_sensor(sensor_data: SensorCreate, db: Session = Depends(get_db), user=Depends(require_officer)):
    sensor = SensorService.register_sensor(
        db=db,
        sensor_name=sensor_data.sensor_name,
        location_name=sensor_data.location_name,
        latitude=sensor_data.latitude,
        longitude=sensor_data.longitude,
        zone_type=sensor_data.zone_type or "Residential",
        sensor_type=sensor_data.sensor_type or "IoT Acoustic Node"
    )
    return SensorResponse(
        id=sensor.id,
        sensor_name=sensor.sensor_name,
        location_name=sensor.location_name,
        zone_type=sensor.zone_type,
        latitude=sensor.latitude,
        longitude=sensor.longitude,
        sensor_type=sensor.sensor_type,
        status=sensor.status,
        calibration_date=sensor.calibration_date,
        last_seen=sensor.last_seen,
        latest_laeq=None
    )

@router.get("/{id}")
def get_sensor(id: str, db: Session = Depends(get_db)):
    sensor = db.query(Sensor).filter(Sensor.id == id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")
    
    recent_readings = db.query(Measurement).filter(
        Measurement.sensor_id == sensor.id
    ).order_by(Measurement.timestamp.desc()).limit(15).all()

    return {
        "sensor": {
            "id": sensor.id,
            "sensor_name": sensor.sensor_name,
            "location_name": sensor.location_name,
            "zone_type": sensor.zone_type,
            "latitude": sensor.latitude,
            "longitude": sensor.longitude,
            "sensor_type": sensor.sensor_type,
            "status": sensor.status,
            "calibration_date": sensor.calibration_date.isoformat() if sensor.calibration_date else None,
            "last_seen": sensor.last_seen.isoformat() if sensor.last_seen else None
        },
        "recent_readings": [
            {
                "id": m.id,
                "timestamp": m.timestamp.isoformat() if m.timestamp else None,
                "laeq": m.laeq,
                "lmax": m.lmax,
                "calibration_status": m.calibration_status
            } for m in recent_readings
        ]
    }

@router.post("/{id}/readings")
def ingest_reading(id: str, reading: ReadingIngest, db: Session = Depends(get_db)):
    try:
        result = SensorService.ingest_reading(
            db=db,
            sensor_id=id,
            laeq=reading.laeq,
            lmax=reading.lmax,
            category=reading.category or "Traffic",
            confidence=reading.confidence or 0.85,
            duration=reading.duration or 60.0
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/simulate")
def trigger_simulation(db: Session = Depends(get_db), user=Depends(require_officer)):
    """
    Simulates a live IoT acoustic reading batch across all registered sensors.
    """
    results = SensorService.simulate_telemetry_tick(db)
    return {
        "message": f"Successfully simulated acoustic telemetry for {len(results)} sensors.",
        "readings": results
    }
