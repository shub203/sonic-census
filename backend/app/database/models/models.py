import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Float, Integer, BigInteger, Boolean, 
    DateTime, ForeignKey, Text, Date, LargeBinary
)
from sqlalchemy.orm import relationship
from app.database.base import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="analyst")  # admin, officer, analyst, observer
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    audio_files = relationship("AudioFile", back_populates="uploader", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="creator", cascade="all, delete-orphan")

class AudioVaultEntry(Base):
    __tablename__ = "audio_vault"

    sha256_hash = Column(String(64), primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    file_format = Column(String(20), nullable=False)
    mime_type = Column(String(100), nullable=False, default="audio/wav")
    file_size = Column(BigInteger, nullable=False)
    audio_blob = Column(LargeBinary, nullable=False)
    upload_count = Column(Integer, nullable=False, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class AudioFile(Base):
    __tablename__ = "audio_files"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    original_filename = Column(String(255), nullable=False)
    storage_path = Column(Text, nullable=False)
    file_format = Column(String(20), nullable=False)
    file_size = Column(BigInteger, nullable=False)
    file_hash = Column(String(64), ForeignKey("audio_vault.sha256_hash", ondelete="SET NULL"), index=True, nullable=True)
    entry_hash = Column(String(64), index=True, nullable=True)
    duration = Column(Float, nullable=False, default=0.0)
    sample_rate = Column(Integer, nullable=False, default=44100)
    channels = Column(Integer, nullable=False, default=1)
    source_type = Column(String(50), default="manual_upload")  # manual_upload, iot_sensor
    sensor_id = Column(String(36), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    processing_status = Column(String(50), default="queued")  # queued, processing, completed, failed
    waveform_data = Column(Text, nullable=True)  # JSON array of downsampled peak amplitudes
    spectrogram_path = Column(String(255), nullable=True)
    uploaded_by = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    uploader = relationship("User", back_populates="audio_files")
    sensor = relationship("Sensor", back_populates="audio_files")
    vault_entry = relationship("AudioVaultEntry", foreign_keys=[file_hash])
    sound_events = relationship("SoundEvent", back_populates="audio_file", cascade="all, delete-orphan")
    measurements = relationship("Measurement", back_populates="audio_file", cascade="all, delete-orphan")
    processing_jobs = relationship("ProcessingJob", back_populates="audio_file", cascade="all, delete-orphan")

class SoundEvent(Base):
    __tablename__ = "sound_events"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    audio_file_id = Column(String(36), ForeignKey("audio_files.id", ondelete="CASCADE"), nullable=True)
    sensor_id = Column(String(36), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    category = Column(String(100), nullable=False)  # Traffic, Construction, Human activity, etc.
    confidence_score = Column(Float, nullable=False)
    start_time = Column(Float, nullable=False, default=0.0)
    end_time = Column(Float, nullable=False, default=0.0)
    model_name = Column(String(100), default="PANNs-CNN14")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    audio_file = relationship("AudioFile", back_populates="sound_events")
    sensor = relationship("Sensor", back_populates="sound_events")

class Sensor(Base):
    __tablename__ = "sensors"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    sensor_name = Column(String(100), nullable=False)
    location_name = Column(String(200), nullable=False)
    zone_type = Column(String(50), default="Residential")  # Industrial, Commercial, Residential, Silence
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    sensor_type = Column(String(100), default="IoT Acoustic Node")
    status = Column(String(50), default="active")  # active, offline, maintenance, simulated
    calibration_date = Column(Date, nullable=True)
    last_seen = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    audio_files = relationship("AudioFile", back_populates="sensor")
    sound_events = relationship("SoundEvent", back_populates="sensor")
    measurements = relationship("Measurement", back_populates="sensor", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="sensor", cascade="all, delete-orphan")

class Measurement(Base):
    __tablename__ = "measurements"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    sensor_id = Column(String(36), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    audio_file_id = Column(String(36), ForeignKey("audio_files.id", ondelete="SET NULL"), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    laeq = Column(Float, nullable=True)  # Equivalent Continuous Sound Level in dB(A)
    lmax = Column(Float, nullable=True)  # Maximum Sound Level in dB(A)
    measurement_duration = Column(Float, nullable=False, default=1.0)
    frequency_weighting = Column(String(20), default="A")  # A, C, Z
    time_weighting = Column(String(20), default="Fast")     # Fast, Slow, Impulse
    calibration_status = Column(String(50), default="uncalibrated")  # calibrated, uncalibrated, estimated
    measurement_uncertainty = Column(Float, nullable=True)
    
    # Relationships
    sensor = relationship("Sensor", back_populates="measurements")
    audio_file = relationship("AudioFile", back_populates="measurements")
    alerts = relationship("Alert", back_populates="measurement", cascade="all, delete-orphan")
    assessments = relationship("ComplianceAssessment", back_populates="measurement", cascade="all, delete-orphan")

class ComplianceRule(Base):
    __tablename__ = "compliance_rules"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    jurisdiction = Column(String(100), default="India")
    regulation_name = Column(String(200), default="Noise Pollution (Regulation and Control) Rules, 2000")
    zone_type = Column(String(50), nullable=False)  # Industrial, Commercial, Residential, Silence
    time_period = Column(String(20), nullable=False)  # Day, Night
    threshold_db = Column(Float, nullable=False)
    measurement_metric = Column(String(50), default="LAeq")
    effective_date = Column(Date, nullable=True)
    source_reference = Column(Text, nullable=True)
    active = Column(Boolean, default=True)
    
    assessments = relationship("ComplianceAssessment", back_populates="rule")

class ComplianceAssessment(Base):
    __tablename__ = "compliance_assessments"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    measurement_id = Column(String(36), ForeignKey("measurements.id", ondelete="CASCADE"), nullable=False)
    rule_id = Column(String(36), ForeignKey("compliance_rules.id", ondelete="SET NULL"), nullable=True)
    zone_type = Column(String(50), nullable=False)
    time_period = Column(String(20), nullable=False)
    measured_laeq = Column(Float, nullable=False)
    threshold_db = Column(Float, nullable=False)
    outcome = Column(String(50), nullable=False)  # within_limit, potential_exceedance, uncalibrated, insufficient_data
    exceedance_amount = Column(Float, default=0.0)
    assessment_timestamp = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)
    
    measurement = relationship("Measurement", back_populates="assessments")
    rule = relationship("ComplianceRule", back_populates="assessments")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    sensor_id = Column(String(36), ForeignKey("sensors.id", ondelete="SET NULL"), nullable=True)
    measurement_id = Column(String(36), ForeignKey("measurements.id", ondelete="SET NULL"), nullable=True)
    alert_type = Column(String(100), default="Noise Exceedance")  # Noise Exceedance, Sensor Offline, Sensor Malfunction
    severity = Column(String(50), default="warning")  # info, warning, critical
    description = Column(Text, nullable=False)
    status = Column(String(50), default="active")  # active, acknowledged, resolved
    created_at = Column(DateTime, default=datetime.utcnow)
    
    sensor = relationship("Sensor", back_populates="alerts")
    measurement = relationship("Measurement", back_populates="alerts")

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    report_type = Column(String(100), nullable=False)  # Daily, Weekly, Zone, Exceedance
    reporting_period = Column(String(100), nullable=False)
    location = Column(Text, default="All Locations")
    file_format = Column(String(20), default="PDF")  # PDF, CSV
    file_path = Column(Text, nullable=False)
    created_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="ready")
    
    creator = relationship("User", back_populates="reports")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    audio_file_id = Column(String(36), ForeignKey("audio_files.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="queued")  # queued, processing, completed, failed
    error_message = Column(Text, nullable=True)
    progress = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    audio_file = relationship("AudioFile", back_populates="processing_jobs")


class CitizenComplaint(Base):
    __tablename__ = "citizen_complaints"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    ticket_number = Column(String(50), unique=True, nullable=False, index=True)
    category = Column(String(150), nullable=False)
    location = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, default="New Delhi")
    zone_type = Column(String(50), nullable=False, default="Residential")
    incident_time = Column(String(20), nullable=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="Submitted & Queued")
    is_exceedance = Column(Boolean, default=True)
    submitted_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
