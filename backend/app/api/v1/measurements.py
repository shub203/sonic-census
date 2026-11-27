from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.database.models import Measurement
from app.schemas.schemas import MeasurementResponse

router = APIRouter(prefix="/measurements", tags=["Acoustic Measurements"])

@router.get("", response_model=List[MeasurementResponse])
def list_measurements(db: Session = Depends(get_db)):
    meas = db.query(Measurement).order_by(Measurement.timestamp.desc()).limit(50).all()
    return meas

@router.get("/{id}", response_model=MeasurementResponse)
def get_measurement(id: str, db: Session = Depends(get_db)):
    m = db.query(Measurement).filter(Measurement.id == id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return m
