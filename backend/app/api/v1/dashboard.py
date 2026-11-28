from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.connection import get_db
from app.database.models import Measurement, SoundEvent, Sensor, Alert, ComplianceAssessment

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _build_recent_alerts(db: Session, limit: int = 6):
    alerts = db.query(Alert).order_by(Alert.created_at.desc()).limit(limit).all()
    results = []
    for a in alerts:
        sensor_code = a.sensor.sensor_name if a.sensor else "UPLOAD"
        sensor_loc = a.sensor.location_name if a.sensor else "Manual Audio Screening"
        laeq_val = round(a.measurement.laeq, 1) if a.measurement and a.measurement.laeq is not None else 60.0
        threshold_val = 55.0
        if a.measurement and a.measurement.assessments:
            threshold_val = a.measurement.assessments[0].threshold_db or 55.0
        margin_val = round(laeq_val - threshold_val, 1)
        sev_ui = "loud" if a.severity == "critical" or margin_val > 5 else "moderate"

        results.append({
            "id": a.id,
            "sensor_id": sensor_code,
            "alert_type": a.alert_type,
            "severity": sev_ui,
            "cause": a.description,
            "description": a.description,
            "status": a.status,
            "location": sensor_loc,
            "laeq": laeq_val,
            "margin": margin_val,
            "timestamp": a.created_at.isoformat() if a.created_at else datetime.utcnow().isoformat(),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        })
    return results


def _build_noise_clock(db: Session, base_avg: float):
    rows = db.query(Measurement.timestamp, Measurement.laeq).filter(Measurement.laeq.isnot(None)).all()
    by_hour = {h: [] for h in range(24)}
    for ts, val in rows:
        if ts and val is not None:
            by_hour[ts.hour].append(float(val))

    clock = []
    for h in range(24):
        is_day = 6 <= h < 22
        threshold = 55.0 if is_day else 45.0
        vals = by_hour[h]
        laeq = round(sum(vals) / len(vals), 1) if vals else round(max(38.0, base_avg + (3.0 if is_day else -6.0)), 1)
        status = "loud" if laeq > threshold else ("moderate" if laeq >= threshold - 3.0 else "quiet")
        clock.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "laeq": laeq,
            "threshold": threshold,
            "period": "Day" if is_day else "Night",
            "status": status,
        })
    return clock


@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    agg = db.query(
        func.avg(Measurement.laeq),
        func.max(Measurement.laeq)
    ).filter(Measurement.laeq.isnot(None)).first()
    avg_laeq = round(float(agg[0]), 1) if agg and agg[0] is not None else 0.0
    peak_laeq = round(float(agg[1]), 1) if agg and agg[1] is not None else 0.0

    exceedance_count = db.query(ComplianceAssessment).filter(
        ComplianceAssessment.outcome == "potential_exceedance"
    ).count()
    sound_event_count = db.query(SoundEvent).count()
    active_sensor_count = db.query(Sensor).filter(Sensor.status == "active").count()
    total_sensor_count = db.query(Sensor).count()

    now = datetime.utcnow()
    recent_cutoff = now - timedelta(hours=14)
    recent_meas = db.query(Measurement.timestamp, Measurement.laeq).filter(
        Measurement.laeq.isnot(None),
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
        "category_breakdown": category_breakdown,
        "recent_alerts": _build_recent_alerts(db, limit=6),
        "noise_clock": _build_noise_clock(db, base_avg=avg_laeq or 54.0),
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
    return _build_recent_alerts(db, limit=10)
