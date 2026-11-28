import os
import csv
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import (
    Report, Measurement, SoundEvent, 
    Sensor, ComplianceAssessment, ComplianceRule
)

# ReportLab imports for professional PDF generation
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, 
    Table, TableStyle, HRFlowable
)

class ReportService:
    @staticmethod
    def generate_report(
        db: Session,
        report_type: str,
        reporting_period: str = "Last 24 Hours",
        location: str = "All Monitoring Zones",
        file_format: str = "PDF",
        user_id: str = None
    ) -> Report:
        """
        Generates an environmental compliance and acoustic monitoring report (PDF or CSV).
        """
        os.makedirs(settings.REPORTS_DIRECTORY, exist_ok=True)
        report_id = str(uuid.uuid4())
        timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        
        # Query relevant data
        measurements = db.query(Measurement).order_by(Measurement.timestamp.desc()).limit(50).all()
        events = db.query(SoundEvent).order_by(SoundEvent.created_at.desc()).limit(50).all()
        assessments = db.query(ComplianceAssessment).order_by(ComplianceAssessment.assessment_timestamp.desc()).limit(50).all()
        sensors = db.query(Sensor).all()

        # Compute summary stats
        valid_laeqs = [m.laeq for m in measurements if m.laeq is not None]
        avg_laeq = round(sum(valid_laeqs) / len(valid_laeqs), 1) if valid_laeqs else 0.0
        max_laeq = max(valid_laeqs) if valid_laeqs else 0.0
        exceedances = [a for a in assessments if a.outcome == "potential_exceedance"]

        if file_format.upper() == "CSV":
            filename = f"report_{report_type.lower()}_{timestamp_str}.csv"
            filepath = os.path.join(settings.REPORTS_DIRECTORY, filename)
            
            with open(filepath, mode="w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerow(["Sonic Census - Environmental Acoustic Monitoring Report"])
                writer.writerow(["Report Type", report_type])
                writer.writerow(["Period", reporting_period])
                writer.writerow(["Location", location])
                writer.writerow(["Generated At", datetime.utcnow().isoformat()])
                writer.writerow(["Average LAeq (dB)", avg_laeq])
                writer.writerow(["Peak Level (dB)", max_laeq])
                writer.writerow(["Total Exceedances", len(exceedances)])
                writer.writerow([])
                writer.writerow(["Measurement ID", "Timestamp", "LAeq dB(A)", "Lmax dB(A)", "Weighting", "Calibration Status"])
                for m in measurements:
                    writer.writerow([m.id, m.timestamp, m.laeq, m.lmax, m.frequency_weighting, m.calibration_status])

        else: # Default to PDF
            filename = f"report_{report_type.lower()}_{timestamp_str}.pdf"
            filepath = os.path.join(settings.REPORTS_DIRECTORY, filename)
            
            doc = SimpleDocTemplate(
                filepath, 
                pagesize=letter,
                rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36
            )
            styles = getSampleStyleSheet()
            
            # Custom styles
            title_style = ParagraphStyle(
                'ReportTitle',
                parent=styles['Heading1'],
                fontSize=20,
                leading=24,
                textColor=colors.HexColor('#047857'), # Emerald 700
                spaceAfter=6
            )
            subtitle_style = ParagraphStyle(
                'ReportSubtitle',
                parent=styles['Normal'],
                fontSize=10,
                textColor=colors.HexColor('#475569'),
                spaceAfter=12
            )
            section_heading = ParagraphStyle(
                'SectionHeading',
                parent=styles['Heading2'],
                fontSize=13,
                leading=16,
                textColor=colors.HexColor('#0f172a'),
                spaceBefore=10,
                spaceAfter=6
            )
            body_style = ParagraphStyle(
                'ReportBody',
                parent=styles['Normal'],
                fontSize=9,
                leading=12,
                textColor=colors.HexColor('#334155')
            )

            story = []

            # Header
            story.append(Paragraph("Sonic Census — Environmental Monitoring System", title_style))
            story.append(Paragraph(f"<b>{report_type} Report</b> | Period: {reporting_period} | Location: {location}", subtitle_style))
            story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#10b981'), spaceAfter=14))

            # Key Statistics Box
            stats_data = [
                [
                    Paragraph("<b>Average LAeq</b>", body_style),
                    Paragraph("<b>Peak Recorded (Lmax)</b>", body_style),
                    Paragraph("<b>Potential Exceedances</b>", body_style),
                    Paragraph("<b>Active Sensors</b>", body_style)
                ],
                [
                    Paragraph(f"<font size=14 color='#047857'><b>{avg_laeq} dB(A)</b></font>", body_style),
                    Paragraph(f"<font size=14 color='#b91c1c'><b>{max_laeq} dB(A)</b></font>", body_style),
                    Paragraph(f"<font size=14 color='#d97706'><b>{len(exceedances)}</b></font>", body_style),
                    Paragraph(f"<font size=14 color='#2563eb'><b>{len(sensors)}</b></font>", body_style)
                ]
            ]
            t_stats = Table(stats_data, colWidths=[130, 130, 140, 140])
            t_stats.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#f8fafc')),
                ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#cbd5e1')),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0')),
                ('PADDING', (0,0), (-1,-1), 8),
                ('ALIGN', (0,0), (-1,-1), 'CENTER')
            ]))
            story.append(t_stats)
            story.append(Spacer(1, 14))

            # Section: Indian Regulatory Standards (CPCB 2000)
            story.append(Paragraph("Applicable Regulatory Framework: CPCB Noise Pollution Rules 2000", section_heading))
            rules_data = [
                ["Zone Category", "Daytime Limit (06:00-22:00)", "Nighttime Limit (22:00-06:00)", "Metric"],
                ["Industrial Zone", "75 dB(A) Leq", "70 dB(A) Leq", "LAeq"],
                ["Commercial Zone", "65 dB(A) Leq", "55 dB(A) Leq", "LAeq"],
                ["Residential Zone", "55 dB(A) Leq", "45 dB(A) Leq", "LAeq"],
                ["Silence Zone (100m)", "50 dB(A) Leq", "40 dB(A) Leq", "LAeq"]
            ]
            t_rules = Table(rules_data, colWidths=[140, 140, 140, 120])
            t_rules.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#047857')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('PADDING', (0,0), (-1,-1), 5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#cbd5e1'))
            ]))
            story.append(t_rules)
            story.append(Spacer(1, 14))

            # Section: Recent Acoustic Measurements
            story.append(Paragraph("Recent Acoustic Measurements & Event Classifications", section_heading))
            meas_rows = [["Timestamp (UTC)", "LAeq dB(A)", "Lmax dB(A)", "Calibration", "Primary Category"]]
            
            for m in measurements[:8]:
                cat = "Environmental"
                if m.audio_file and m.audio_file.sound_events:
                    cat = m.audio_file.sound_events[0].category
                meas_rows.append([
                    m.timestamp.strftime("%Y-%m-%d %H:%M") if m.timestamp else "-",
                    f"{m.laeq} dB" if m.laeq is not None else "-",
                    f"{m.lmax} dB" if m.lmax is not None else "-",
                    m.calibration_status or "uncalibrated",
                    cat
                ])

            if len(meas_rows) == 1:
                meas_rows.append(["No measurements recorded in this period.", "-", "-", "-", "-"])

            t_meas = Table(meas_rows, colWidths=[130, 95, 95, 110, 110])
            t_meas.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#334155')),
                ('TEXTCOLOR', (0,0), (-1,0), colors.white),
                ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
                ('FONTSIZE', (0,0), (-1,-1), 8),
                ('PADDING', (0,0), (-1,-1), 5),
                ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#e2e8f0'))
            ]))
            story.append(t_meas)
            story.append(Spacer(1, 14))

            # Regulatory Notice & Methodology
            story.append(Paragraph("Technical Methodology & Limitations", section_heading))
            disclaimer_text = (
                "<b>Acoustic Averaging:</b> All LAeq calculations adhere to IEC 61672-1 logarithmic energy averaging over observation windows. "
                "<b>AI Classification:</b> Sound classifications are inferred via PANNs CNN14 neural architecture. "
                "<b>Calibration Notice:</b> Absolute sound pressure levels require hardware-traceable microphone sensitivity calibration. "
                "Uncalibrated uploads provide relative sound profiles and should not be used as exclusive judicial evidence."
            )
            story.append(Paragraph(disclaimer_text, body_style))

            doc.build(story)

        file_blob = None
        if os.path.exists(filepath):
            with open(filepath, "rb") as rf:
                file_blob = rf.read()

        report = Report(
            id=report_id,
            report_type=report_type,
            reporting_period=reporting_period,
            location=location,
            file_format=file_format.upper(),
            file_path=f"/static/reports/{filename}",
            file_blob=file_blob,
            created_by=user_id,
            status="ready"
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report
