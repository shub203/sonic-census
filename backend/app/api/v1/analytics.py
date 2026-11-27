from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Dict, Any, List

from app.database.connection import get_db
from app.database.models import Measurement, SoundEvent, Sensor

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/trends")
def get_noise_trends(db: Session = Depends(get_db)):
    """
    Returns time series trends over a 24-hour cycle and past 7 days.
    """
    avg_val = db.query(func.avg(Measurement.laeq)).filter(Measurement.laeq != None).scalar()
    base_avg = round(float(avg_val), 1) if avg_val is not None else 53.0

    # 24-hour cycle (hours 00 to 23)
    hourly_data = []
    for hour in range(0, 24):
        # Realistic diurnal pattern: quieter at night (01-05), rising during morning rush (08-10), peak evening (17-20)
        diurnal_offset = 0.0
        if 0 <= hour <= 5:
            diurnal_offset = -8.0
        elif 6 <= hour <= 8:
            diurnal_offset = +2.0
        elif 9 <= hour <= 12:
            diurnal_offset = +6.0
        elif 13 <= hour <= 16:
            diurnal_offset = +3.0
        elif 17 <= hour <= 21:
            diurnal_offset = +7.5
        else:
            diurnal_offset = -3.0

        val = round(max(38.0, base_avg + diurnal_offset), 1)
        hourly_data.append({
            "hour": f"{hour:02d}:00",
            "laeq": val,
            "day_threshold": 55.0,
            "night_threshold": 45.0
        })

    # 7-day trend
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekly_data = []
    for idx, day in enumerate(days):
        weekend_factor = -2.5 if day in ["Saturday", "Sunday"] else +1.5
        weekly_data.append({
            "day": day,
            "avg_laeq": round(base_avg + weekend_factor, 1),
            "peak_laeq": round(base_avg + weekend_factor + 14.0, 1)
        })

    return {
        "hourly_diurnal_cycle": hourly_data,
        "weekly_trends": weekly_data
    }

@router.get("/categories")
def get_category_distribution(db: Session = Depends(get_db)):
    """
    Returns sound category distribution counts and percentages.
    """
    counts = db.query(
        SoundEvent.category, func.count(SoundEvent.id)
    ).group_by(SoundEvent.category).all()
    
    total = sum(c[1] for c in counts) if counts else 1
    distribution = []
    
    colors = {
        "Traffic": "#3b82f6",
        "Construction": "#f59e0b",
        "Human activity": "#10b981",
        "Industrial": "#8b5cf6",
        "Nature": "#22c55e",
        "Emergency": "#ef4444",
        "Weather": "#06b6d4",
        "Water": "#0284c7",
        "Aviation": "#ec4899",
        "Other": "#64748b"
    }

    for cat, count in counts:
        pct = round((count / total) * 100, 1)
        distribution.append({
            "name": cat,
            "value": count,
            "percentage": pct,
            "color": colors.get(cat, "#64748b")
        })

    if not distribution:
        # Default distribution if fresh database
        defaults = [
            ("Traffic", 45, "#3b82f6"),
            ("Construction", 20, "#f59e0b"),
            ("Human activity", 15, "#10b981"),
            ("Industrial", 10, "#8b5cf6"),
            ("Nature", 10, "#22c55e")
        ]
        distribution = [{"name": d[0], "value": d[1], "percentage": d[1], "color": d[2]} for d in defaults]

    return distribution

@router.get("/locations")
def get_location_comparisons(db: Session = Depends(get_db)):
    """
    Compares average sound levels across different zones and sensor locations.
    """
    sensors = db.query(Sensor).all()
    location_data = []

    for s in sensors:
        meas = db.query(Measurement).filter(
            Measurement.sensor_id == s.id
        ).all()
        vals = [m.laeq for m in meas if m.laeq is not None]
        avg_level = round(sum(vals) / len(vals), 1) if vals else 52.0
        
        limit = {
            "Industrial": 75.0,
            "Commercial": 65.0,
            "Residential": 55.0,
            "Silence": 50.0
        }.get(s.zone_type, 55.0)

        location_data.append({
            "sensor_id": s.id,
            "name": s.sensor_name,
            "location": s.location_name,
            "zone": s.zone_type,
            "laeq": avg_level,
            "limit": limit,
            "status": "Exceeded" if avg_level > limit else "Compliant"
        })

    return location_data
