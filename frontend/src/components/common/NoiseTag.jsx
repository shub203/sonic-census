import React from 'react';

/**
 * Noise scale status tag: quiet → moderate → loud.
 * Vermilion is strictly reserved for loud readings / exceedances.
 */
export const NoiseTag = ({ 
  level = 'quiet', // 'quiet' | 'moderate' | 'loud' | 'uncalibrated'
  label, 
  size = 'md',
  className = '' 
}) => {
  const norm = (level || 'quiet').toLowerCase();

  const styles = {
    quiet: {
      dot: 'bg-quiet',
      border: 'border-sand-dark',
      text: 'text-quiet',
      bg: 'bg-paper-light',
      defaultLabel: 'Quiet',
    },
    moderate: {
      dot: 'bg-moderate',
      border: 'border-sand-dark',
      text: 'text-moderate',
      bg: 'bg-paper-light',
      defaultLabel: 'Moderate',
    },
    loud: {
      dot: 'bg-loud',
      border: 'border-sand-dark',
      text: 'text-loud',
      bg: 'bg-paper-light',
      defaultLabel: 'Loud (Exceedance)',
    },
    uncalibrated: {
      dot: 'bg-graphite',
      border: 'border-sand-dark',
      text: 'text-graphite',
      bg: 'bg-sand-light pattern-hatched',
      defaultLabel: 'Uncalibrated',
    }
  };

  const current = styles[norm] || styles.quiet;
  const displayLabel = label || current.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono uppercase tracking-wider border rounded-none ${current.border} ${current.bg} ${
        size === 'sm' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]'
      } ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-none flex-shrink-0 ${current.dot}`} />
      <span className={`font-semibold ${current.text}`}>{displayLabel}</span>
    </span>
  );
};
