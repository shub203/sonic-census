from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, date


# --- AUTH SCHEMAS ---
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[str] = "citizen"


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)


class UserProfileUpdateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)


class UserRoleUpdateRequest(BaseModel):
    role: str = Field(..., min_length=3, max_length=30)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    email: str
    role: str
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


# --- SOUND EVENT SCHEMAS ---
class SoundEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    audio_file_id: Optional[str] = None
    sensor_id: Optional[str] = None
    category: str
    confidence_score: float
    start_time: float
    end_time: float
    model_name: str
    created_at: datetime


# --- AUDIO SCHEMAS ---
class AudioFileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    original_filename: str
    file_format: str
    file_size: int
    duration: float
    sample_rate: int
    channels: int
    source_type: str
    processing_status: str
    waveform_data: Optional[str] = None
    spectrogram_path: Optional[str] = None
    uploaded_at: datetime
    sound_events: List[SoundEventResponse] = []


# --- SENSOR SCHEMAS ---
class SensorCreate(BaseModel):
    sensor_name: str
    location_name: str
    latitude: float
    longitude: float
    zone_type: Optional[str] = "Residential"
    sensor_type: Optional[str] = "IoT Acoustic Node"


class SensorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sensor_name: str
    location_name: str
    zone_type: str
    latitude: float
    longitude: float
    sensor_type: str
    status: str
    calibration_date: Optional[date] = None
    last_seen: Optional[datetime] = None
    latest_laeq: Optional[float] = None


class ReadingIngest(BaseModel):
    laeq: float
    lmax: float
    category: Optional[str] = "Traffic"
    confidence: Optional[float] = 0.85
    duration: Optional[float] = 60.0


class SensorApiKeyCreate(BaseModel):
    label: str = Field("Primary IoT Gateway", min_length=2, max_length=100)


# --- MEASUREMENT SCHEMAS ---
class MeasurementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sensor_id: Optional[str] = None
    audio_file_id: Optional[str] = None
    timestamp: datetime
    laeq: Optional[float] = None
    lmax: Optional[float] = None
    measurement_duration: float
    frequency_weighting: str
    time_weighting: str
    calibration_status: str
    measurement_uncertainty: Optional[float] = None


# --- COMPLIANCE SCHEMAS ---
class ComplianceRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    jurisdiction: str
    regulation_name: str
    zone_type: str
    time_period: str
    threshold_db: float
    measurement_metric: str
    source_reference: Optional[str] = None
    active: bool


class ComplianceCheckRequest(BaseModel):
    laeq: Optional[float] = None
    measured_db: Optional[float] = None
    zone_type: str = "Residential"
    period: Optional[str] = None
    timestamp: Optional[datetime] = None
    is_calibrated: bool = False

    @property
    def effective_laeq(self) -> float:
        if self.laeq is not None:
            return float(self.laeq)
        if self.measured_db is not None:
            return float(self.measured_db)
        return 55.0


class ComplianceAssessmentResponse(BaseModel):
    assessment_id: str
    zone_type: str
    time_period: str
    measured_laeq: float
    threshold_db: float
    outcome: str
    exceedance_amount: float
    calibration_status: str
    notes: Optional[str] = None
    timestamp: str


# --- ALERT SCHEMAS ---
class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    sensor_id: Optional[str] = None
    measurement_id: Optional[str] = None
    alert_type: str
    severity: str
    description: str
    status: str
    created_at: datetime
    sensor_name: Optional[str] = None


# --- REPORT SCHEMAS ---
class ReportGenerateRequest(BaseModel):
    report_type: str = "Daily Environmental"
    reporting_period: str = "Last 24 Hours"
    location: str = "All Monitoring Zones"
    file_format: str = "PDF"


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    report_type: str
    reporting_period: str
    location: str
    file_format: str
    file_path: str
    generated_at: datetime
    status: str


# --- CONTACT INQUIRY SCHEMAS ---
class ContactInquiryCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    organization: str = Field(..., min_length=2, max_length=180)
    email: EmailStr
    inquiry_type: str = Field("Municipal Monitoring Deployment", min_length=2, max_length=120)
    message: str = Field(..., min_length=5, max_length=3000)


class ContactInquiryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    organization: str
    email: str
    inquiry_type: str
    message: str
    status: str
    created_at: datetime
