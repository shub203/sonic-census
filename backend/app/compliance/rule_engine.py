from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import ComplianceRule, ComplianceAssessment, Measurement
from app.compliance.india_rules import determine_time_period

class ComplianceEngine:
    @staticmethod
    def evaluate_measurement(
        db: Session,
        measurement: Measurement,
        zone_type: str = "Residential",
        custom_time: Optional[datetime] = None,
        auto_commit: bool = True
    ) -> Dict[str, Any]:
        """
        Evaluate an acoustic measurement against configured Indian compliance rules.
        """
        eval_time = custom_time or measurement.timestamp or datetime.utcnow()
        time_period = determine_time_period(eval_time.hour)
        
        # Look up rule in database
        rule = db.query(ComplianceRule).filter(
            ComplianceRule.zone_type.ilike(zone_type),
            ComplianceRule.time_period.ilike(time_period),
            ComplianceRule.active == True
        ).first()

        threshold_db = rule.threshold_db if rule else (55.0 if time_period == "Day" else 45.0)
        laeq = measurement.laeq or 0.0
        calibration_status = measurement.calibration_status or "uncalibrated"

        is_uncalibrated = calibration_status.lower() == "uncalibrated"
        
        outcome = "within_limit"
        exceedance_amount = 0.0
        
        if laeq > threshold_db:
            outcome = "potential_exceedance"
            exceedance_amount = round(laeq - threshold_db, 2)
        else:
            outcome = "within_limit"
            exceedance_amount = 0.0

        notes = []
        if is_uncalibrated:
            notes.append("Uncalibrated recording: Decibel levels are estimated relative values; CPCB regulatory certification requires calibrated acoustic hardware.")
        if outcome == "potential_exceedance":
            notes.append(f"Exceeds {zone_type} {time_period} standard ({threshold_db} dB) by {exceedance_amount} dB(A).")
        else:
            notes.append(f"Compliant with {zone_type} {time_period} threshold ({threshold_db} dB).")

        assessment = ComplianceAssessment(
            measurement_id=measurement.id,
            rule_id=rule.id if rule else None,
            zone_type=zone_type,
            time_period=time_period,
            measured_laeq=laeq,
            threshold_db=threshold_db,
            outcome=outcome,
            exceedance_amount=exceedance_amount,
            notes=" ".join(notes)
        )
        db.add(assessment)
        if auto_commit:
            db.commit()
            db.refresh(assessment)
        else:
            db.flush()

        return {
            "assessment_id": assessment.id,
            "measurement_id": measurement.id,
            "zone_type": zone_type,
            "time_period": time_period,
            "measured_laeq": laeq,
            "threshold_db": threshold_db,
            "outcome": outcome,
            "exceedance_amount": exceedance_amount,
            "calibration_status": calibration_status,
            "notes": " ".join(notes),
            "timestamp": assessment.assessment_timestamp.isoformat()
        }
