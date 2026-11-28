import hashlib
import secrets
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.database.models import Sensor, Measurement, SoundEvent, SensorApiKey
from app.schemas.schemas import SensorCreate, SensorResponse, ReadingIngest, SensorApiKeyCreate
from app.services.sensor_service import SensorService
from app.services.audit_service import AuditService
from app.security.rate_limit import rate_limit
from app.dependencies import get_current_user, require_officer

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
def create_sensor(sensor_data: SensorCreate, request: Request, db: Session = Depends(get_db), user=Depends(require_officer)):
    sensor = SensorService.register_sensor(
        db=db,
        sensor_name=sensor_data.sensor_name,
        location_name=sensor_data.location_name,
        latitude=sensor_data.latitude,
        longitude=sensor_data.longitude,
        zone_type=sensor_data.zone_type or "Residential",
        sensor_type=sensor_data.sensor_type or "IoT Acoustic Node"
    )
    AuditService.log_event(
        db=db,
        action="sensor.create",
        resource_type="sensor",
        resource_id=sensor.id,
        actor=user,
        request=request,
        details={"sensor_name": sensor.sensor_name, "zone_type": sensor.zone_type},
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

@router.post(
    "/{id}/readings",
    dependencies=[Depends(rate_limit("sensor_readings", max_requests=120, window_seconds=60))],
)
def ingest_reading(
    id: str,
    reading: ReadingIngest,
    db: Session = Depends(get_db),
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
    user=Depends(get_current_user),
):
    """Ingest calibrated telemetry via per-sensor X-API-Key or Officer JWT."""
    authorized = bool(user and (user.role or "").lower() in {"officer", "admin", "analyst"})
    if not authorized and x_api_key:
        key_hash = hashlib.sha256(x_api_key.strip().encode("utf-8")).hexdigest()
        key_row = (
            db.query(SensorApiKey)
            .filter(
                SensorApiKey.sensor_id == id,
                SensorApiKey.key_hash == key_hash,
                SensorApiKey.active.is_(True),
            )
            .first()
        )
        if key_row:
            key_row.last_used_at = datetime.utcnow()
            authorized = True

    if not authorized:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Valid X-API-Key for this sensor or Officer authentication required",
        )

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


@router.get("/{id}/api-keys")
def list_sensor_api_keys(id: str, db: Session = Depends(get_db), user=Depends(require_officer)):
    keys = (
        db.query(SensorApiKey)
        .filter(SensorApiKey.sensor_id == id)
        .order_by(SensorApiKey.created_at.desc())
        .all()
    )
    return [
        {
            "id": k.id,
            "sensor_id": k.sensor_id,
            "key_prefix": k.key_prefix,
            "label": k.label,
            "active": k.active,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat() if k.created_at else None,
        }
        for k in keys
    ]


@router.post("/{id}/api-keys")
def create_sensor_api_key(
    id: str,
    payload: SensorApiKeyCreate,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    sensor = db.query(Sensor).filter(Sensor.id == id).first()
    if not sensor:
        raise HTTPException(status_code=404, detail="Sensor not found")

    raw_token = f"sc_iot_{secrets.token_urlsafe(24)}"
    key_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    key_row = SensorApiKey(
        sensor_id=sensor.id,
        key_prefix=raw_token[:14],
        key_hash=key_hash,
        label=payload.label.strip(),
        active=True,
        created_by=user.id,
    )
    db.add(key_row)
    db.commit()
    db.refresh(key_row)

    AuditService.log_event(
        db=db,
        action="sensor.api_key_create",
        resource_type="sensor_api_key",
        resource_id=key_row.id,
        actor=user,
        request=request,
        details={"sensor_id": sensor.id, "label": key_row.label},
    )

    return {
        "id": key_row.id,
        "sensor_id": sensor.id,
        "label": key_row.label,
        "key_prefix": key_row.key_prefix,
        "api_key": raw_token,
        "created_at": key_row.created_at.isoformat() if key_row.created_at else None,
        "notice": "Store this key securely now — it cannot be retrieved again.",
    }


@router.delete("/{id}/api-keys/{key_id}")
def revoke_sensor_api_key(
    id: str,
    key_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    key_row = (
        db.query(SensorApiKey)
        .filter(SensorApiKey.id == key_id, SensorApiKey.sensor_id == id)
        .first()
    )
    if not key_row:
        raise HTTPException(status_code=404, detail="Sensor API key not found")
    key_row.active = False
    db.commit()
    AuditService.log_event(
        db=db,
        action="sensor.api_key_revoke",
        resource_type="sensor_api_key",
        resource_id=key_id,
        actor=user,
        request=request,
    )
    return {"message": "Sensor API key revoked"}

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
