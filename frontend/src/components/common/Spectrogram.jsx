import React, { useRef, useEffect } from 'react';

/**
 * Field Instrument Canvas Mel-Spectrogram.
 * Colormap (STRICT): instrument-dark (#0F1315) → teal (#2F6F63) → amber (#E9A23B) → vermilion (#E4572E).
 * Never rainbow.
 * Shares playhead scrubber and time alignment with Waveform.
 */
export const Spectrogram = ({ 
  duration = 10, 
  currentTime = 0, 
  highlightRegion = null,
  onSeek = () => {},
  height = 140,
  className = ''
}) => {
  const canvasRef = useRef(null);

  // Colormap lookup helper: intensity (0.0 to 1.0) -> RGB string
  const getColormapColor = (val) => {
    // 0.00 - 0.33: #0F1315 to #2F6F63
    // 0.33 - 0.66: #2F6F63 to #E9A23B
    // 0.66 - 1.00: #E9A23B to #E4572E
    const c0 = [15, 19, 21];    // #0F1315
    const c1 = [47, 111, 99];   // #2F6F63
    const c2 = [233, 162, 59];  // #E9A23B
    const c3 = [228, 87, 46];   // #E4572E

    let r, g, b;
    if (val <= 0.33) {
      const t = val / 0.33;
      r = Math.round(c0[0] + (c1[0] - c0[0]) * t);
      g = Math.round(c0[1] + (c1[1] - c0[1]) * t);
      b = Math.round(c0[2] + (c1[2] - c0[2]) * t);
    } else if (val <= 0.66) {
      const t = (val - 0.33) / 0.33;
      r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    } else {
      const t = Math.min((val - 0.66) / 0.34, 1);
      r = Math.round(c2[0] + (c3[0] - c2[0]) * t);
      g = Math.round(c2[1] + (c3[1] - c2[1]) * t);
      b = Math.round(c2[2] + (c3[2] - c2[2]) * t);
    }

    return `rgb(${r},${g},${b})`;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#0F1315';
    ctx.fillRect(0, 0, width, h);

    // Synthesize realistic Mel-spectrogram time-frequency matrix
    const numTimeBins = 140;
    const numFreqBins = 48; // Mel bins
    const cellW = width / numTimeBins;
    const cellH = h / numFreqBins;

    for (let x = 0; x < numTimeBins; x++) {
      const tSec = (x / numTimeBins) * duration;
      for (let y = 0; y < numFreqBins; y++) {
        // Lower frequencies have higher baseline energy in environmental recordings
        const freqNorm = 1 - (y / numFreqBins); // 1 = low freq, 0 = high freq
        const baseEnergy = Math.pow(freqNorm, 1.8) * 0.45;
        
        // Formant harmonics + temporal bursts
        const burst1 = Math.exp(-Math.pow((tSec - 2.5) / 1.2, 2)) * Math.sin(freqNorm * 12);
        const burst2 = Math.exp(-Math.pow((tSec - 7.0) / 1.6, 2)) * (freqNorm > 0.4 ? 0.4 : 0);
        const noise = (Math.sin(x * 3.7 + y * 5.1) * 0.5 + 0.5) * 0.12;

        const rawIntensity = baseEnergy + Math.max(0, burst1) * 0.5 + burst2 * 0.4 + noise;
        const intensity = Math.min(Math.max(rawIntensity, 0), 1);

        ctx.fillStyle = getColormapColor(intensity);
        ctx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
      }
    }

    // Highlight Region Overlay
    if (highlightRegion && duration > 0) {
      const startX = (highlightRegion.start / duration) * width;
      const endX = (highlightRegion.end / duration) * width;
      const regW = Math.max(endX - startX, 2);

      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(startX, 1, regW, h - 2);
      ctx.setLineDash([]);
    }

    // Playhead Scrubber Line
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();
    }
  }, [duration, currentTime, highlightRegion]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className={`relative flex font-mono ${className}`}>
      {/* Frequency Axis Labels (kHz) */}
      <div className="flex flex-col justify-between text-[8px] text-graphite-light pr-1.5 py-1 select-none text-right w-9">
        <span>8 kHz</span>
        <span>4 kHz</span>
        <span>2 kHz</span>
        <span>500 Hz</span>
        <span>0 Hz</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasRef}
          width={720}
          height={height}
          onClick={handleClick}
          className="w-full cursor-crosshair block rounded-none border border-instrument-border"
          style={{ height: `${height}px` }}
        />
        {/* Subtle colormap legend key */}
        <div className="absolute bottom-1 right-2 flex items-center gap-1.5 bg-instrument/90 px-1.5 py-0.5 border border-instrument-border text-[8px] text-graphite-light">
          <span>MIN</span>
          <div className="w-10 h-1.5 bg-gradient-to-r from-instrument via-quiet via-moderate to-loud border border-instrument-muted" />
          <span>PEAK</span>
        </div>
      </div>
    </div>
  );
};
