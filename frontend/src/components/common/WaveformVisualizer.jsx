import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

export const WaveformVisualizer = ({ peaks = [], audioUrl = null, duration = 0 }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 1
  const audioRef = useRef(null);

  // If no peaks provided, generate aesthetic synthetic waveform bars
  const displayPeaks = peaks && peaks.length > 0 ? peaks : [
    0.15, 0.28, 0.45, 0.65, 0.82, 0.40, 0.22, 0.35, 0.60, 0.75, 
    0.90, 0.70, 0.50, 0.30, 0.45, 0.85, 0.65, 0.40, 0.25, 0.18,
    0.35, 0.55, 0.72, 0.60, 0.45, 0.30, 0.50, 0.78, 0.95, 0.80,
    0.60, 0.40, 0.25, 0.35, 0.65, 0.50, 0.30, 0.20, 0.15, 0.10
  ];

  const togglePlay = () => {
    if (!audioRef.current && !audioUrl) {
      // Simulate play animation if no audio URL
      setIsPlaying(!isPlaying);
      return;
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || duration || 1;
      setProgress(current / total);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onEnded={handleEnded}
        />
      )}

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="flex items-center gap-1.5 font-medium text-slate-300">
          <Volume2 className="w-3.5 h-3.5 text-brand-400" />
          Acoustic Waveform Profile
        </span>
        <span className="font-mono text-[11px]">
          {duration ? `${duration}s duration` : 'Normalized Amplitude'}
        </span>
      </div>

      {/* Waveform Bar Graphic */}
      <div 
        className="h-20 bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex items-center gap-1 cursor-pointer overflow-hidden relative"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickPos = (e.clientX - rect.left) / rect.width;
          setProgress(clickPos);
          if (audioRef.current && audioRef.current.duration) {
            audioRef.current.currentTime = clickPos * audioRef.current.duration;
          }
        }}
      >
        {/* Playhead line */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-brand-400 z-10 pointer-events-none transition-all duration-75"
          style={{ left: `${progress * 100}%` }}
        />

        {displayPeaks.map((peak, idx) => {
          const barHeight = Math.max(8, Math.round(peak * 100));
          const isPassed = (idx / displayPeaks.length) <= progress;
          return (
            <div
              key={idx}
              className="flex-1 rounded-full transition-all duration-150"
              style={{
                height: `${barHeight}%`,
                backgroundColor: isPassed ? '#10b981' : '#334155'
              }}
            />
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-400 border border-brand-500/30 text-xs font-medium transition-colors"
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPlaying ? 'Pause' : 'Play Acoustic Sample'}</span>
        </button>

        <span className="text-[11px] font-mono text-slate-400">
          Progress: {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
};
