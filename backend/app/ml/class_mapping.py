"""
Category mappings and AudioSet ontology taxonomy for Sonic Census.
Maps 527 AudioSet classes and acoustic signatures to the 10 core urban sound categories.
"""

from typing import Dict, List, Set

TARGET_CATEGORIES = [
    "Traffic",
    "Construction",
    "Human activity",
    "Industrial",
    "Nature",
    "Weather",
    "Water",
    "Emergency",
    "Aviation",
    "Other"
]

AUDIOSET_MAP: Dict[str, str] = {
    # Traffic
    "Motor vehicle (road)": "Traffic",
    "Car": "Traffic",
    "Vehicle": "Traffic",
    "Truck": "Traffic",
    "Bus": "Traffic",
    "Motorcycle": "Traffic",
    "Traffic noise, roadway noise": "Traffic",
    "Car horn, honking": "Traffic",
    "Accelerating, revving, vroom": "Traffic",
    "Tire squeal": "Traffic",
    "Bicycle": "Traffic",
    "Skateboard": "Traffic",

    # Construction
    "Drill": "Construction",
    "Jackhammer": "Construction",
    "Hammer": "Construction",
    "Sawing": "Construction",
    "Power tool": "Construction",
    "Heavy machinery": "Construction",
    "Excavation": "Construction",
    "Demolition": "Construction",
    "Pneumatic tool": "Construction",

    # Human activity
    "Speech": "Human activity",
    "Conversation": "Human activity",
    "Shout": "Human activity",
    "Yell": "Human activity",
    "Screaming": "Human activity",
    "Laughter": "Human activity",
    "Crowd": "Human activity",
    "Cheering": "Human activity",
    "Applause": "Human activity",
    "Footsteps": "Human activity",
    "Babbling": "Human activity",
    "Singing": "Human activity",

    # Industrial
    "Engine": "Industrial",
    "Generator": "Industrial",
    "Air conditioning": "Industrial",
    "Ventilation": "Industrial",
    "Factory": "Industrial",
    "Industrial machinery": "Industrial",
    "Compressor": "Industrial",
    "Pump": "Industrial",

    # Nature
    "Bird": "Nature",
    "Bird vocalization, bird call, bird song": "Nature",
    "Chirp, tweet": "Nature",
    "Insect": "Nature",
    "Cricket": "Nature",
    "Animal": "Nature",
    "Dog": "Nature",
    "Bark": "Nature",
    "Cat": "Nature",

    # Weather
    "Rain": "Weather",
    "Raindrop": "Weather",
    "Thunderstorm": "Weather",
    "Thunder": "Weather",
    "Wind": "Weather",
    "Rustling leaves": "Weather",
    "Storm": "Weather",

    # Water
    "Water": "Water",
    "Stream, burbling": "Water",
    "Waterfall": "Water",
    "Ocean": "Water",
    "Waves, surf": "Water",
    "Splash, splatter": "Water",
    "Trickle, dribble": "Water",

    # Emergency
    "Siren": "Emergency",
    "Emergency vehicle": "Emergency",
    "Police car (siren)": "Emergency",
    "Ambulance (siren)": "Emergency",
    "Fire engine, fire truck (siren)": "Emergency",
    "Alarm": "Emergency",
    "Fire alarm": "Emergency",
    "Smoke detector, smoke alarm": "Emergency",

    # Aviation
    "Aircraft": "Aviation",
    "Airplane": "Aviation",
    "Helicopter": "Aviation",
    "Jet engine": "Aviation",
    "Propeller, airscrew": "Aviation",
    "Fixed-wing aircraft, airplane": "Aviation"
}

def map_label_to_category(label: str) -> str:
    """
    Maps an audio label or tag to one of the 10 target categories.
    Prioritizes longer, more specific substrings to prevent generic tokens like 'car'
    from shadowing specific phrases like 'Police car (siren)'.
    """
    label_lower = label.lower().strip()
    
    # 1. Exact match
    for key, cat in AUDIOSET_MAP.items():
        if key.lower() == label_lower:
            return cat

    # 2. Longest substring match
    sorted_items = sorted(AUDIOSET_MAP.items(), key=lambda x: len(x[0]), reverse=True)
    for key, cat in sorted_items:
        if key.lower() in label_lower or label_lower in key.lower():
            return cat

    return "Other"
