from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.database.connection import get_db
from app.database.models import Measurement, SoundEvent, Sensor, Alert, ComplianceAssessment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    # 1. Total & Average LAeq via SQL aggregate (avoids loading entire table into memory)
    agg = db.query(
        func.avg(Measurement.laeq),
        func.max(Measurement.laeq)
    ).filter(Measurement.laeq != None).first()
    avg_laeq = round(float(agg[0]), 1) if agg and agg[0] is not None else 0.0
    peak_laeq = round(float(agg[1]), 1) if agg and agg[1] is not None else 0.0

    # 2. Exceedances count
    exceedance_count = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.outcome == "potential_exceedance"
    ).count()

    # 3. Sound events count
    sound_event_count = db.query(SoundEvent).count()

    # 4. Sensor count
    active_sensor_count = db.query(Sensor).filter(Sensor.status == "active").count()
    total_sensor_count = db.query(Sensor).count()

    # 5. Hourly noise trend (strictly fetch recent 14h window instead of full history)
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(hours=14)
    recent_meas = db.query(Measurement.timestamp, Measurement.laeq).filter(
        Measurement.laeq != None,
        Measurement.timestamp >= recent_cutoff
    ).all()
    trend_points = []
    for h in range(12, -1, -2):
        target_time = now - timedelta(hours=h)
        window_start = target_time - timedelta(hours=1)
        window_end = target_time + timedelta(hours=1)
        sub_meas = [
            m_laeq for m_ts, m_laeq in recent_meas
            if m_ts and window_start <= m_ts <= window_end
        ]
        val = round(sum(sub_meas) / len(sub_meas), 1) if sub_meas else (avg_laeq or 54.0)
        trend_points.append({
            "time": target_time.strftime("%H:%M"),
            "laeq": val,
            "threshold": 55.0
        })

    # 6. Category breakdown
    category_counts = db.query(
        SoundEvent.category, func.count(SoundEvent.id)
    ).group_by(SoundEvent.category).all()
    
    category_breakdown = [
        {"category": cat, "count": count} for cat, count in category_counts
    ]

    return {
        "average_laeq": avg_laeq,
        "peak_laeq": peak_laeq,
        "total_exceedances": exceedance_count,
        "total_sound_events": sound_event_count,
        "active_sensors": active_sensor_count,
        "total_sensors": total_sensor_count,
        "hourly_trends": trend_points,
        "category_breakdown": category_breakdown
    }

@router.get("/recent-events")
def get_recent_events(db: Session = Depends(get_db)):
    events = db.query(SoundEvent).order_by(SoundEvent.created_at.desc()).limit(8).all()
    results = []
    for e in events:
        source = "Uploaded Recording"
        if e.sensor:
            source = f"Sensor: {e.sensor.sensor_name} ({e.sensor.location_name})"
        results.append({
            "id": e.id,
            "category": e.category,
            "confidence": e.confidence_score,
            "duration": round(e.end_time - e.start_time, 1),
            "source": source,
            "timestamp": e.created_at.isoformat() if e.created_at else None
        })
    return results

@router.get("/alerts")
def get_dashboard_alerts(db: Session = Depends(get_db)):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(6).all()
    results = []
    for a in alerts:
        sensor_info = a.sensor.location_name if a.sensor else "Central Zone"
        results.append({
            "id": a.id,
            "alert_type": a.alert_type,
            "severity": a.severity,
            "description": a.description,
            "status": a.status,
            "location": sensor_info,
            "created_at": a.created_at.isoformat() if a.created_at else None
        })
    return results
