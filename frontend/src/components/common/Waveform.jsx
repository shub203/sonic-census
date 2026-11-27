import React, { useRef, useEffect } from 'react';

/**
 * Field Instrument Canvas Waveform.
 * Renders audio peak envelope, playhead scrubber, time ticks, and detection region highlight.
 */
export const Waveform = ({ 
  peaks = [], 
  duration = 10, 
  currentTime = 0, 
  highlightRegion = null, // { start: number, end: number, category: string }
  onSeek = () => {},
  height = 96,
  className = ''
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0F1315';
    ctx.fillRect(0, 0, width, h);

    // Draw horizontal zero-axis
    const midY = h / 2;
    ctx.strokeStyle = '#1E2529';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();

    // If no peaks available, generate realistic envelope
    let data = peaks;
    if (!data || data.length === 0) {
      data = [];
      const numPoints = 160;
      for (let i = 0; i < numPoints; i++) {
        const t = (i / numPoints) * duration;
        // Synthesize dynamic environmental envelope
        const envelope = 0.2 + 0.5 * Math.sin(t * 1.5) * Math.sin(t * 4.2) + 0.15 * Math.random();
        data.push(Math.min(Math.max(envelope, 0.05), 0.95));
      }
    }

    const step = width / data.length;

    // Draw Highlight Region if present
    if (highlightRegion && duration > 0) {
      const startX = (highlightRegion.start / duration) * width;
      const endX = (highlightRegion.end / duration) * width;
      const regW = Math.max(endX - startX, 2);

      // Region background fill
      ctx.fillStyle = 'rgba(47, 111, 99, 0.25)'; // quiet deep teal
      ctx.fillRect(startX, 0, regW, h);

      // Region border lines
      ctx.strokeStyle = '#2F6F63';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(startX, 0);
      ctx.lineTo(startX, h);
      ctx.moveTo(endX, 0);
      ctx.lineTo(endX, h);
      ctx.stroke();

      // Region category label
      if (highlightRegion.category) {
        ctx.fillStyle = '#2F6F63';
        ctx.font = '9px "IBM Plex Mono", monospace';
        ctx.fillText(highlightRegion.category.toUpperCase(), startX + 4, 12);
      }
    }

    // Draw Waveform Bars
    for (let i = 0; i < data.length; i++) {
      const x = i * step;
      const val = data[i];
      const barH = val * (h / 2 - 4);

      // Determine bar color (highlighted vs normal)
      const t = (i / data.length) * duration;
      const isInside = highlightRegion && t >= highlightRegion.start && t <= highlightRegion.end;

      if (isInside) {
        ctx.fillStyle = '#458578'; // Teal
      } else if (val > 0.75) {
        ctx.fillStyle = '#E4572E'; // Vermilion peaks
      } else if (val > 0.5) {
        ctx.fillStyle = '#E9A23B'; // Moderate amber
      } else {
        ctx.fillStyle = '#5A6770'; // Graphite instrument
      }

      ctx.fillRect(x, midY - barH, Math.max(step - 1, 1), barH * 2);
    }

    // Draw Playhead scrubber line
    if (duration > 0) {
      const playheadX = (currentTime / duration) * width;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, h);
      ctx.stroke();

      // Playhead top marker
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(playheadX - 2, 0, 5, 5);
    }

    // Draw subtle time tick lines at every 1/4 of width
    ctx.strokeStyle = '#1F262A';
    ctx.lineWidth = 1;
    for (let f = 1; f < 4; f++) {
      const tx = (f / 4) * width;
      ctx.beginPath();
      ctx.moveTo(tx, h - 6);
      ctx.lineTo(tx, h);
      ctx.stroke();
    }
  }, [peaks, duration, currentTime, highlightRegion]);

  const handleClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * duration);
  };

  return (
    <div className={`relative select-none ${className}`}>
      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        onClick={handleClick}
        className="w-full cursor-crosshair block rounded-none"
        style={{ height: `${height}px` }}
      />
      {/* Time axis metadata */}
      <div className="flex justify-between text-[9px] font-mono text-graphite-light pt-1 px-1">
        <span>00:00.0</span>
        <span>{duration ? `${(duration / 2).toFixed(1)}s` : '00:05.0'}</span>
        <span>{duration ? `${duration.toFixed(1)}s` : '00:10.0'}</span>
      </div>
    </div>
  );
};
