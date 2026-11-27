import numpy as np
from typing import List

def generate_waveform_peaks(audio_data: np.ndarray, num_points: int = 150) -> List[float]:
    """
    Downsamples audio data into a smooth envelope array of normalized amplitudes (0.0 to 1.0)
    for rendering in frontend waveform bars/curves.
    """
    if len(audio_data) == 0:
        return [0.0] * num_points

    # Split into chunks
    chunk_size = max(1, len(audio_data) // num_points)
    peaks = []

    for i in range(num_points):
        start = i * chunk_size
        end = min(len(audio_data), (i + 1) * chunk_size)
        if start >= len(audio_data):
            peaks.append(0.0)
        else:
            chunk = audio_data[start:end]
            # RMS amplitude or max absolute value
            rms = np.sqrt(np.mean(chunk**2)) if len(chunk) > 0 else 0.0
            peaks.append(float(rms))

    # Normalize between 0.05 and 1.0
    max_val = max(peaks) if peaks else 1.0
    if max_val > 1e-6:
        normalized = [round(float(p / max_val), 3) for p in peaks]
    else:
        normalized = [0.05 for _ in peaks]

    return normalized
