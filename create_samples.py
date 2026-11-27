import numpy as np
import soundfile as sf
import os

def create_sample_audio():
    os.makedirs("sample_audio", exist_ok=True)
    sr = 22050
    duration = 5.0  # 5 seconds
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)

    # 1. Traffic simulation: Low rumble (engine) + intermittent car horn burst
    engine_rumble = 0.4 * np.sin(2 * np.pi * 120 * t) + 0.25 * np.sin(2 * np.pi * 180 * t) + 0.15 * np.random.normal(0, 0.1, len(t))
    
    # Horn from t = 2.0 to 3.5 seconds (dual tone: 440 Hz + 550 Hz)
    horn_mask = (t >= 2.0) & (t <= 3.5)
    horn = np.zeros_like(t)
    horn[horn_mask] = 0.5 * (np.sin(2 * np.pi * 440 * t[horn_mask]) + np.sin(2 * np.pi * 550 * t[horn_mask]))

    traffic_audio = engine_rumble + horn
    # Normalize to avoid clipping
    traffic_audio = traffic_audio / np.max(np.abs(traffic_audio)) * 0.85
    traffic_path = os.path.join("sample_audio", "traffic_horn_sample.wav")
    sf.write(traffic_path, traffic_audio.astype(np.float32), sr)
    print(f"Created sample audio at {traffic_path}")

    # 2. Construction simulation: High crest factor transient hammer/drilling
    hammer = np.zeros_like(t)
    for hit_time in np.arange(0.5, duration - 0.2, 0.4):
        hit_idx = int(hit_time * sr)
        decay_len = int(0.08 * sr)
        if hit_idx + decay_len < len(t):
            decay = np.exp(-np.linspace(0, 10, decay_len))
            transient = np.random.normal(0, 1.0, decay_len) * decay
            hammer[hit_idx:hit_idx+decay_len] += transient * 0.9

    construction_audio = hammer + 0.1 * np.random.normal(0, 0.05, len(t))
    construction_audio = construction_audio / np.max(np.abs(construction_audio)) * 0.9
    construction_path = os.path.join("sample_audio", "construction_hammer_sample.wav")
    sf.write(construction_path, construction_audio.astype(np.float32), sr)
    print(f"Created sample audio at {construction_path}")

if __name__ == "__main__":
    create_sample_audio()
