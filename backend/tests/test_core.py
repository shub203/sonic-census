import numpy as np
import pytest
from datetime import datetime

from app.audio.measurement import calculate_acoustic_metrics, apply_a_weighting
from app.audio.waveform import generate_waveform_peaks
from app.compliance.india_rules import determine_time_period, INDIAN_NOISE_RULES_2000
from app.ml.class_mapping import map_label_to_category, TARGET_CATEGORIES
from app.dependencies import create_access_token, verify_password, get_password_hash
import jwt
from app.config import settings

def test_acoustic_laeq_logarithmic_averaging():
    """
    Validates IEC 61672 logarithmic energy averaging vs flawed arithmetic averaging.
    Example: Two sound events: 60 dB and 80 dB.
    Arithmetic average: (60 + 80) / 2 = 70 dB
    Logarithmic energy average: 10 * log10( 0.5 * (10^6 + 10^8) ) = 77.0 dB!
    """
    sr = 22050
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # 1 kHz reference tone
    signal_data = 0.5 * np.sin(2 * np.pi * 1000 * t)
    metrics = calculate_acoustic_metrics(signal_data, sr, is_calibrated=True)
    
    assert metrics["laeq"] is not None
    assert metrics["lmax"] is not None
    assert metrics["laeq"] <= metrics["lmax"]
    assert metrics["frequency_weighting"] == "A"
    assert metrics["time_weighting"] == "Fast"

def test_waveform_peak_generation():
    """
    Verifies waveform downsampling produces valid normalized amplitude array.
    """
    audio = np.random.uniform(-0.8, 0.8, 44100)
    peaks = generate_waveform_peaks(audio, num_points=100)
    
    assert len(peaks) == 100
    assert all(0.0 <= p <= 1.0 for p in peaks)
    assert max(peaks) == 1.0

def test_cpcb_day_night_periods():
    """
    Verifies CPCB statutory day (06:00 to 22:00) vs night (22:00 to 06:00) detection.
    """
    assert determine_time_period(6) == "Day"
    assert determine_time_period(12) == "Day"
    assert determine_time_period(21) == "Day"
    assert determine_time_period(22) == "Night"
    assert determine_time_period(23) == "Night"
    assert determine_time_period(0) == "Night"
    assert determine_time_period(5) == "Night"

def test_cpcb_statutory_thresholds():
    """
    Verifies that the 4 zone types and their Day/Night thresholds match the 2000 Rules Schedule.
    """
    rules_dict = {(r["zone_type"], r["time_period"]): r["threshold_db"] for r in INDIAN_NOISE_RULES_2000}
    
    # Industrial: 75 Day / 70 Night
    assert rules_dict[("Industrial", "Day")] == 75.0
    assert rules_dict[("Industrial", "Night")] == 70.0

    # Commercial: 65 Day / 55 Night
    assert rules_dict[("Commercial", "Day")] == 65.0
    assert rules_dict[("Commercial", "Night")] == 55.0

    # Residential: 55 Day / 45 Night
    assert rules_dict[("Residential", "Day")] == 55.0
    assert rules_dict[("Residential", "Night")] == 45.0

    # Silence Zone: 50 Day / 40 Night
    assert rules_dict[("Silence", "Day")] == 50.0
    assert rules_dict[("Silence", "Night")] == 40.0

def test_panns_category_mapping():
    """
    Verifies AudioSet labels map correctly to the 10 target categories.
    """
    assert map_label_to_category("Car horn, honking") == "Traffic"
    assert map_label_to_category("Jackhammer") == "Construction"
    assert map_label_to_category("Speech") == "Human activity"
    assert map_label_to_category("Factory") == "Industrial"
    assert map_label_to_category("Bird") == "Nature"
    assert map_label_to_category("Raindrop") == "Weather"
    assert map_label_to_category("Waterfall") == "Water"
    assert map_label_to_category("Police car (siren)") == "Emergency"
    assert map_label_to_category("Helicopter") == "Aviation"
    assert map_label_to_category("Unclassified noise") == "Other"

def test_jwt_auth_security():
    """
    Verifies password hashing via bcrypt and JWT token signing.
    """
    pwd = "secure_environmental_officer_pwd"
    hashed = get_password_hash(pwd)
    
    assert verify_password(pwd, hashed) is True
    assert verify_password("wrong_password", hashed) is False

    token = create_access_token({"sub": "user-123", "role": "officer"})
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
    assert decoded["sub"] == "user-123"
    assert decoded["role"] == "officer"


def test_database_url_normalization():
    """Verify postgres:// and postgresql:// provider URLs normalize cleanly to psycopg v3 dialect."""
    from app.database.connection import _normalize_database_url

    assert _normalize_database_url("postgres://u:p@host:5432/db") == "postgresql+psycopg://u:p@host:5432/db"
    assert _normalize_database_url("postgresql://u:p@host:5432/db") == "postgresql+psycopg://u:p@host:5432/db"
    assert _normalize_database_url("postgresql+psycopg://u:p@host:5432/db") == "postgresql+psycopg://u:p@host:5432/db"
    assert _normalize_database_url("sqlite:///./noisepollution.db") == "sqlite:///./noisepollution.db"
