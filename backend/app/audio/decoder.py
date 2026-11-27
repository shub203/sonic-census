import os
import numpy as np
import soundfile as sf
from typing import Tuple, Dict, Any

def decode_audio(file_path: str) -> Tuple[np.ndarray, int, float, int]:
    """
    Decodes audio file into floating point numpy array, sample rate, duration, and channel count.
    Converts multi-channel audio to mono for standardized acoustic and AI processing.
    """
    try:
        data, sample_rate = sf.read(file_path, dtype="float32")
    except Exception as e:
        # If soundfile fails, try fallback
        raise ValueError(f"Failed to decode audio file '{os.path.basename(file_path)}': {str(e)}")

    # Channel handling
    if len(data.shape) > 1:
        channels = data.shape[1]
        # Mix down to mono
        mono_data = np.mean(data, axis=1)
    else:
        channels = 1
        mono_data = data

    duration = float(len(mono_data)) / float(sample_rate) if sample_rate > 0 else 0.0
    return mono_data, sample_rate, duration, channels
