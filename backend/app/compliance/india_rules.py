"""
Indian Ambient Noise Standards as per Schedule to the
Noise Pollution (Regulation and Control) Rules, 2000.
"""

from typing import Dict, Any

INDIAN_NOISE_RULES_2000 = [
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Industrial",
        "time_period": "Day",
        "threshold_db": 75.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 1 (Day: 06:00-22:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Industrial",
        "time_period": "Night",
        "threshold_db": 70.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 1 (Night: 22:00-06:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Commercial",
        "time_period": "Day",
        "threshold_db": 65.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 2 (Day: 06:00-22:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Commercial",
        "time_period": "Night",
        "threshold_db": 55.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 2 (Night: 22:00-06:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Residential",
        "time_period": "Day",
        "threshold_db": 55.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 3 (Day: 06:00-22:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Residential",
        "time_period": "Night",
        "threshold_db": 45.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 3 (Night: 22:00-06:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Silence",
        "time_period": "Day",
        "threshold_db": 50.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 4 (Day: 06:00-22:00)",
        "active": True
    },
    {
        "jurisdiction": "India",
        "regulation_name": "Noise Pollution (Regulation and Control) Rules, 2000",
        "zone_type": "Silence",
        "time_period": "Night",
        "threshold_db": 40.0,
        "measurement_metric": "LAeq",
        "source_reference": "CPCB Schedule to the Rules, Item 4 (Night: 22:00-06:00)",
        "active": True
    }
]

def determine_time_period(hour: int) -> str:
    """
    Daytime: 6:00 AM to 10:00 PM (06:00 <= hour < 22:00)
    Nighttime: 10:00 PM to 6:00 AM (hour >= 22 or hour < 6)
    """
    if 6 <= hour < 22:
        return "Day"
    return "Night"
