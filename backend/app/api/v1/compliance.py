from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database.connection import get_db
from app.database.models import ComplianceRule, ComplianceAssessment, Measurement
from app.schemas.schemas import ComplianceRuleResponse, ComplianceCheckRequest, ComplianceAssessmentResponse
from app.compliance.india_rules import determine_time_period

router = APIRouter(prefix="/compliance", tags=["Compliance Engine"])

@router.get("/rules", response_model=List[ComplianceRuleResponse])
def get_compliance_rules(db: Session = Depends(get_db)):
    rules = db.query(ComplianceRule).filter(ComplianceRule.active == True).all()
    return rules

@router.post("/check", response_model=ComplianceAssessmentResponse)
@router.post("/evaluate", response_model=ComplianceAssessmentResponse)
def check_compliance(req: ComplianceCheckRequest, db: Session = Depends(get_db)):
    eval_time = req.timestamp or datetime.utcnow()
    time_period = determine_time_period(eval_time.hour)
    
    rule = db.query(ComplianceRule).filter(
        ComplianceRule.zone_type.ilike(req.zone_type),
        ComplianceRule.time_period.ilike(time_period),
        ComplianceRule.active == True
    ).first()

    threshold_db = rule.threshold_db if rule else (55.0 if time_period == "Day" else 45.0)
    laeq = req.effective_laeq
    is_uncalibrated = not req.is_calibrated
    
    outcome = "potential_exceedance" if laeq > threshold_db else "within_limit"
    exceedance_amount = round(max(0.0, laeq - threshold_db), 1)

    notes = []
    if is_uncalibrated:
        notes.append("Uncalibrated measurement: Decibel levels are relative; legal CPCB proof requires calibrated Class 1/2 sound level equipment.")
    if outcome == "potential_exceedance":
        notes.append(f"Exceeds {req.zone_type} {time_period} threshold ({threshold_db} dB) by {exceedance_amount} dB(A).")
    else:
        notes.append(f"Compliant with {req.zone_type} {time_period} limit ({threshold_db} dB).")

    return ComplianceAssessmentResponse(
        assessment_id="adhoc_eval",
        zone_type=req.zone_type,
        time_period=time_period,
        measured_laeq=laeq,
        threshold_db=threshold_db,
        outcome=outcome,
        exceedance_amount=exceedance_amount,
        calibration_status="calibrated" if req.is_calibrated else "uncalibrated",
        notes=" ".join(notes),
        timestamp=eval_time.isoformat()
    )

@router.get("/assessments")
def get_assessments(db: Session = Depends(get_db)):
    assessments = db.query(ComplianceAssessment).order_by(
        ComplianceAssessment.assessment_timestamp.desc()
    ).limit(30).all()
    
    results = []
    for a in assessments:
        source_name = "Acoustic Sample"
        if a.measurement and a.measurement.sensor:
            source_name = f"{a.measurement.sensor.sensor_name} ({a.measurement.sensor.location_name})"
        elif a.measurement and a.measurement.audio_file:
            source_name = f"Upload: {a.measurement.audio_file.original_filename}"

        results.append({
            "id": a.id,
            "source": source_name,
            "zone_type": a.zone_type,
            "time_period": a.time_period,
            "measured_laeq": a.measured_laeq,
            "threshold_db": a.threshold_db,
            "outcome": a.outcome,
            "exceedance_amount": a.exceedance_amount,
            "notes": a.notes,
            "timestamp": a.assessment_timestamp.isoformat() if a.assessment_timestamp else None
        })
    return results
