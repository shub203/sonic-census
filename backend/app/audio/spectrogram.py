import os
import numpy as np
from scipy import signal
import matplotlib
matplotlib.use('Agg')  # Headless backend
import matplotlib.pyplot as plt
from app.config import settings

def generate_spectrogram_image(audio_data: np.ndarray, sample_rate: int, output_filename: str) -> str:
    """
    Computes STFT spectrogram using SciPy and outputs an optimized PNG image with an urban acoustic theme.
    Returns the relative path to the generated image.
    """
    os.makedirs(settings.SPECTROGRAMS_DIRECTORY, exist_ok=True)
    out_path = os.path.join(settings.SPECTROGRAMS_DIRECTORY, output_filename)
    
    # Compute spectrogram using Welch / STFT
    nperseg = min(1024, len(audio_data))
    if nperseg < 16:
        nperseg = 16
    noverlap = nperseg // 2

    frequencies, times, Sxx = signal.spectrogram(
        audio_data, 
        fs=sample_rate, 
        nperseg=nperseg, 
        noverlap=noverlap,
        scaling='spectrum'
    )

    # Convert to log scale (dB)
    Sxx_log = 10 * np.log10(Sxx + 1e-10)

    # Create figure with dark acoustic styling
    fig, ax = plt.subplots(figsize=(10, 3.5), facecolor='#0b1120')
    ax.set_facecolor('#0b1120')

    # Meshgrid plot
    im = ax.pcolormesh(times, frequencies, Sxx_log, shading='gouraud', cmap='inferno')

    # Styling
    ax.set_ylim(0, min(sample_rate / 2, 10000))  # focus on 0 - 10 kHz
    ax.set_xlabel('Time (s)', color='#94a3b8', fontsize=9)
    ax.set_ylabel('Frequency (Hz)', color='#94a3b8', fontsize=9)
    ax.tick_params(colors='#94a3b8', labelsize=8)
    for spine in ax.spines.values():
        spine.set_color('#334155')

    # Colorbar
    cbar = fig.colorbar(im, ax=ax, orientation='vertical', pad=0.02)
    cbar.set_label('Power Spectral Density (dB)', color='#94a3b8', fontsize=8)
    cbar.ax.yaxis.set_tick_params(color='#94a3b8')
    plt.setp(plt.getp(cbar.ax.axes, 'yticklabels'), color='#94a3b8', fontsize=8)

    plt.tight_layout()
    plt.savefig(out_path, dpi=120, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)

    return f"/static/spectrograms/{output_filename}"
