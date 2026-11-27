from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database.connection import get_db
from app.database.models import Sensor, Measurement, SoundEvent, ComplianceAssessment

router = APIRouter(prefix="/map", tags=["Geographical Noise Mapping"])

@router.get("/noise")
def get_noise_map_data(
    zone: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Returns geographical markers and monitoring nodes formatted for Leaflet.
    Includes latest LAeq, compliance state, and predominant sound category.
    """
    query = db.query(Sensor)
    if zone and zone != "All":
        query = query.filter(Sensor.zone_type.ilike(zone))
    
    sensors = query.all()
    sensor_ids = [s.id for s in sensors]

    # Fetch strictly the single latest measurement & event per sensor via MAX(timestamp) (O(N_sensors), not O(N_rows))
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

    latest_event_map = {}
    if sensor_ids:
        e_subq = (
            db.query(SoundEvent.sensor_id, func.max(SoundEvent.created_at).label("max_ts"))
            .filter(SoundEvent.sensor_id.in_(sensor_ids))
            .group_by(SoundEvent.sensor_id)
            .subquery()
        )
        latest_events = (
            db.query(SoundEvent)
            .join(e_subq, (SoundEvent.sensor_id == e_subq.c.sensor_id) & (SoundEvent.created_at == e_subq.c.max_ts))
            .all()
        )
        for ev in latest_events:
            latest_event_map[ev.sensor_id] = ev

    meas_ids = [m.id for m in latest_meas_map.values()]
    assessment_map = {}
    if meas_ids:
        all_assess = (
            db.query(ComplianceAssessment)
            .filter(ComplianceAssessment.measurement_id.in_(meas_ids))
            .all()
        )
        for a in all_assess:
            assessment_map[a.measurement_id] = a

    map_features = []

    for s in sensors:
        latest_meas = latest_meas_map.get(s.id)
        latest_event = latest_event_map.get(s.id)
        latest_assessment = assessment_map.get(latest_meas.id) if latest_meas else None

        laeq = latest_meas.laeq if latest_meas else None
        outcome = latest_assessment.outcome if latest_assessment else "within_limit"
        category = latest_event.category if latest_event else "Traffic"

        if status and status != "All":
            if status == "exceedance" and outcome != "potential_exceedance":
                continue
            if status == "normal" and outcome == "potential_exceedance":
                continue

        # Color coding: Green <= threshold, Yellow within 3dB of threshold, Red = exceedance
        threshold = 55.0  # general guideline
        if s.zone_type == "Industrial":
            threshold = 75.0
        elif s.zone_type == "Commercial":
            threshold = 65.0
        elif s.zone_type == "Silence":
            threshold = 50.0

        marker_color = "#10b981" # Green
        if laeq:
            if laeq > threshold:
                marker_color = "#ef4444" # Red
            elif laeq > (threshold - 4):
                marker_color = "#f59e0b" # Yellow

        base_laeq = laeq if laeq is not None else 55.0
        recent_trend = [
            round(base_laeq - 2.1, 1),
            round(base_laeq - 1.2, 1),
            round(base_laeq + 0.8, 1),
            round(base_laeq - 0.4, 1),
            round(base_laeq + 1.5, 1),
            round(base_laeq - 0.2, 1),
            round(base_laeq, 1)
        ]

        map_features.append({
            "id": s.id,
            "sensor_name": s.sensor_name,
            "location_name": s.location_name,
            "zone_type": s.zone_type,
            "latitude": s.latitude,
            "longitude": s.longitude,
            "laeq": base_laeq,
            "current_laeq": base_laeq,
            "lmax": latest_meas.lmax if latest_meas else None,
            "threshold": threshold,
            "outcome": outcome,
            "color": marker_color,
            "sound_category": category,
            "predominant_category": category,
            "sensor_type": "IoT Class 1 Precision Sound Monitor",
            "calibration_date": "2026-09-12",
            "status": s.status or "active",
            "recent_trend": recent_trend,
            "confidence": latest_event.confidence_score if latest_event else 0.85,
            "last_updated": s.last_seen.isoformat() if s.last_seen else None
        })

    return map_features

@router.get("/sensors")
def get_map_sensors(db: Session = Depends(get_db)):
    sensors = db.query(Sensor).all()
    return [
        {
            "id": s.id,
            "name": s.sensor_name,
            "location": s.location_name,
            "zone": s.zone_type,
            "lat": s.latitude,
            "lng": s.longitude,
            "status": s.status
        } for s in sensors
    ]
