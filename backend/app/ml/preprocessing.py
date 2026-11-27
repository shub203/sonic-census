import numpy as np
import torch
from scipy import signal

def resample_audio(audio_data: np.ndarray, orig_sr: int, target_sr: int = 32000) -> np.ndarray:
    """
    Resamples audio to target sampling rate (default 32000 Hz as used by PANNs CNN14).
    """
    if orig_sr == target_sr:
        return audio_data
    
    num_samples = int(len(audio_data) * float(target_sr) / float(orig_sr))
    resampled = signal.resample(audio_data, num_samples)
    return resampled.astype(np.float32)

def compute_mel_spectrogram(
    audio_data: np.ndarray, 
    sample_rate: int = 32000, 
    n_mels: int = 64, 
    n_fft: int = 1024, 
    hop_length: int = 320
) -> torch.Tensor:
    """
    Computes a Log-Mel Spectrogram tensor for PyTorch model inference.
    """
    # Simple STFT using SciPy
    f, t, Zxx = signal.stft(audio_data, fs=sample_rate, nperseg=n_fft, noverlap=n_fft - hop_length)
    mag = np.abs(Zxx)
    
    # Create mel filterbank
    low_freq_mel = 0
    high_freq_mel = 2595 * np.log10(1 + (sample_rate / 2) / 700)
    mel_points = np.linspace(low_freq_mel, high_freq_mel, n_mels + 2)
    hz_points = 700 * (10**(mel_points / 2595) - 1)
    
    bin_points = np.floor((n_fft + 1) * hz_points / sample_rate).astype(int)
    fbank = np.zeros((n_mels, int(np.floor(n_fft / 2 + 1))))
    
    for m in range(1, n_mels + 1):
        f_m_minus = bin_points[m - 1]
        f_m = bin_points[m]
        f_m_plus = bin_points[m + 1]

        for k in range(f_m_minus, f_m):
            if f_m != f_m_minus:
                fbank[m - 1, k] = (k - bin_points[m - 1]) / (f_m - f_m_minus)
        for k in range(f_m, f_m_plus):
            if f_m_plus != f_m:
                fbank[m - 1, k] = (bin_points[m + 1] - k) / (f_m_plus - f_m)

    mel_spec = np.dot(fbank, mag)
    mel_spec = np.maximum(mel_spec, 1e-10)
    log_mel = 10 * np.log10(mel_spec)
    
    # Return as [1, 1, time, freq]
    tensor = torch.from_numpy(log_mel.T).unsqueeze(0).unsqueeze(0).float()
    return tensor
