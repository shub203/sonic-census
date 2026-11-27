import React, { useState, useEffect } from 'react';

/**
 * Field instrument numeric stat readout.
 * Separated by hairlines, tabular numerals, animated number tick on mount.
 */
export const Stat = ({ 
  label, 
  value, 
  unit = '', 
  meta = null, 
  decimalPlaces = 0,
  trend = null, // { value: string, direction: 'up' | 'down' | 'neutral' }
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const num = typeof value === 'number' ? value : parseFloat(value);
    if (isNaN(num)) {
      setDisplayValue(value);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();
    const startVal = 0;

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startVal + (num - startVal) * eased;

      if (decimalPlaces > 0) {
        setDisplayValue(current.toFixed(decimalPlaces));
      } else {
        setDisplayValue(Math.round(current));
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        if (decimalPlaces > 0) {
          setDisplayValue(num.toFixed(decimalPlaces));
        } else {
          setDisplayValue(num);
        }
      }
    };

    requestAnimationFrame(tick);
  }, [value, decimalPlaces]);

  return (
    <div className={`p-4 md:p-6 bg-paper ${className}`}>
      <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block mb-1">
        {label}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-3xl md:text-4xl font-bold tracking-tight text-ink tabular-nums">
          {displayValue}
        </span>
        {unit && (
          <span className="font-mono text-xs uppercase tracking-wider text-graphite">
            {unit}
          </span>
        )}
      </div>
      {meta && (
        <span className="text-[11px] text-graphite block mt-1 font-mono">
          {meta}
        </span>
      )}
    </div>
  );
};
