import React from 'react';

/**
 * Field notebook honesty badge.
 * Indicates that the displayed reading or telemetry point is simulated / mock data.
 */
export const SimulatedBadge = ({ className = '', title = 'Simulated field instrument data' }) => {
  return (
    <span
      title={title}
      className={`inline-flex items-center px-1.5 py-0.2 rounded-none border border-sand-dark text-[9px] font-mono tracking-wider uppercase text-graphite bg-sand-light select-none font-medium ${className}`}
    >
      SIMULATED
    </span>
  );
};
