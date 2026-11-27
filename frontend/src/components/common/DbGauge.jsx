import React from 'react';
import { NoiseTag } from './NoiseTag';

/**
 * Field instrument horizontal decibel gauge.
 * Features a sliding vertical limit tick line that updates smoothly on zone/period changes.
 * Scale: 30 dB(A) to 100 dB(A).
 */
export const DbGauge = ({ 
  currentDb = null, 
  limitDb = 55.0, 
  zoneType = 'Residential',
  period = 'Day',
  isCalibrated = true,
  min = 30,
  max = 100,
  className = ''
}) => {
  // Convert dB value to percentage on 30–100 scale
  const toPct = (val) => {
    if (val === null || val === undefined || isNaN(val)) return 0;
    const clamped = Math.min(Math.max(val, min), max);
    return ((clamped - min) / (max - min)) * 100;
  };

  const currentPct = toPct(currentDb);
  const limitPct = toPct(limitDb);

  // Status calculation
  let status = 'Within limit';
  let level = 'quiet';

  if (!isCalibrated || currentDb === null) {
    status = 'Uncalibrated / Insufficient data';
    level = 'uncalibrated';
  } else if (currentDb > limitDb) {
    status = 'Potential exceedance';
    level = 'loud';
  } else if (currentDb >= limitDb - 2.5) {
    status = 'Elevated (Approaching limit)';
    level = 'moderate';
  } else {
    status = 'Within statutory limit';
    level = 'quiet';
  }

  // Generate tick markers every 10 dB
  const ticks = [30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className={`space-y-3 font-sans ${className}`}>
      {/* Header with values */}
      <div className="flex items-baseline justify-between text-xs border-b border-sand pb-2">
        <div className="space-y-0.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
            Measured LAeq (IEC 61672 A-Weighted)
          </span>
          <div className="flex items-baseline gap-2">
            {isCalibrated && typeof currentDb === 'number' && !isNaN(currentDb) ? (
              <span className="font-mono text-2xl font-bold text-ink tabular-nums">
                {currentDb.toFixed(1)} <span className="text-xs text-graphite font-normal">dB(A)</span>
              </span>
            ) : (
              <span className="font-mono text-sm text-graphite italic pattern-hatched px-2 py-0.5 border border-sand">
                No valid dB: uncalibrated
              </span>
            )}
          </div>
        </div>

        <div className="text-right space-y-1">
          <div className="text-[10px] font-mono uppercase tracking-wider text-graphite">
            CPCB Limit: <span className="font-bold text-ink tabular-nums">{(Number(limitDb) || 55.0).toFixed(1)} dB</span> ({period})
          </div>
          <NoiseTag level={level} label={status} size="sm" />
        </div>
      </div>

      {/* The Gauge Track */}
      <div className="relative pt-6 pb-4">
        {/* Track background */}
        <div className="h-3 w-full bg-sand-light border border-sand relative overflow-hidden">
          {/* Subtle noise scale gradient segments: quiet → moderate → loud */}
          <div 
            className="absolute inset-y-0 left-0 bg-quiet/20 border-r border-quiet/30"
            style={{ width: `${toPct(55)}%` }}
            title="Safe residential daylight baseline (30-55 dB)"
          />
          <div 
            className="absolute inset-y-0 bg-moderate/25 border-r border-moderate/40"
            style={{ left: `${toPct(55)}%`, width: `${toPct(75) - toPct(55)}%` }}
            title="Commercial / industrial activity (55-75 dB)"
          />
          <div 
            className="absolute inset-y-0 right-0 bg-loud/25"
            style={{ left: `${toPct(75)}%` }}
            title="Exceedance / loud threshold (>75 dB)"
          />

          {/* Current reading fill */}
          {isCalibrated && currentDb !== null && (
            <div 
              className={`h-full transition-all duration-300 ${
                level === 'loud' ? 'bg-loud' : level === 'moderate' ? 'bg-moderate' : 'bg-quiet'
              }`}
              style={{ width: `${currentPct}%` }}
            />
          )}

          {/* Uncalibrated hatched overlay */}
          {(!isCalibrated || currentDb === null) && (
            <div className="absolute inset-0 pattern-hatched opacity-60" />
          )}
        </div>

        {/* Sliding Vertical Statutory Limit Line */}
        <div 
          className="absolute top-2 bottom-0 w-0.5 bg-ink transition-all duration-300 pointer-events-none z-10"
          style={{ left: `${limitPct}%` }}
        >
          <div className="absolute -top-4 -translate-x-1/2 whitespace-nowrap bg-ink text-paper text-[9px] font-mono font-bold px-1 py-0.5 rounded-none uppercase">
            Limit {limitDb} dB
          </div>
        </div>

        {/* Current Reading Arrow Indicator */}
        {isCalibrated && currentDb !== null && (
          <div 
            className="absolute bottom-1 w-0 h-0 border-x-4 border-x-transparent border-b-6 border-b-ink -translate-x-1/2 transition-all duration-300"
            style={{ left: `${currentPct}%` }}
          />
        )}

        {/* Ticks & Labels */}
        <div className="relative w-full h-4 mt-1">
          {ticks.map((t) => (
            <div
              key={t}
              className="absolute -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${toPct(t)}%` }}
            >
              <div className="w-px h-1.5 bg-sand-dark" />
              <span className="text-[9px] font-mono text-graphite tabular-nums mt-0.5">
                {t}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Statutory Guidance Note */}
      <div className="text-[10px] text-graphite font-mono pt-1 border-t border-sand-light flex items-center justify-between">
        <span>Schedule Area: {zoneType} Zone</span>
        <span>Reference: CPCB Rules, 2000</span>
      </div>
    </div>
  );
};
