import React from 'react';

/**
 * Sensor dial / gauge SVG marker.
 * Colored on the strict noise scale: quiet (#2F6F63) → moderate (#E9A23B) → loud (#E4572E).
 * Used on the Leaflet map and sensor cards.
 */
export const SensorDial = ({ 
  laeq = 55.0, 
  threshold = 55.0,
  status = 'quiet', // 'quiet' | 'moderate' | 'loud'
  size = 28,
  className = ''
}) => {
  const norm = (status || 'quiet').toLowerCase();

  const colorMap = {
    quiet: '#2F6F63',
    moderate: '#E9A23B',
    loud: '#E4572E',
  };

  const color = colorMap[norm] || '#2F6F63';

  // Calculate needle angle on a 180-deg dial (from -90 to +90 degrees)
  const minDb = 35;
  const maxDb = 85;
  const clamped = Math.min(Math.max(laeq, minDb), maxDb);
  const ratio = (clamped - minDb) / (maxDb - minDb);
  const angle = -90 + ratio * 180; // degrees

  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 36 36"
        className="overflow-visible"
      >
        {/* Outer instrument dial ring */}
        <circle
          cx="18"
          cy="18"
          r="16"
          fill="#0F1315"
          stroke="#1E2529"
          strokeWidth="1.5"
        />

        {/* Gauge arc background */}
        <path
          d="M 6 22 A 13 13 0 1 1 30 22"
          fill="none"
          stroke="#2A3338"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Active gauge arc colored on noise scale */}
        <path
          d="M 6 22 A 13 13 0 1 1 30 22"
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray="47"
          strokeDashoffset={47 * (1 - ratio * 0.85)}
          strokeLinecap="round"
        />

        {/* Center pivot */}
        <circle cx="18" cy="18" r="2" fill="#D8DEE2" />

        {/* Needle pointer */}
        <line
          x1="18"
          y1="18"
          x2="18"
          y2="7"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${angle} 180 18)`}
        />
      </svg>
    </div>
  );
};

/**
 * Helper to generate Leaflet HTML marker string for dynamic map injection
 */
export const createSensorDialHtml = (laeq, status = 'quiet') => {
  const colorMap = {
    quiet: '#2F6F63',
    moderate: '#E9A23B',
    loud: '#E4572E',
  };
  const color = colorMap[status] || '#2F6F63';
  const minDb = 35;
  const maxDb = 85;
  const clamped = Math.min(Math.max(laeq || 50, minDb), maxDb);
  const ratio = (clamped - minDb) / (maxDb - minDb);
  const angle = -90 + ratio * 180;

  return `
    <div style="
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    ">
      <svg width="32" height="32" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r="16" fill="#0F1315" stroke="${color}" stroke-width="2"/>
        <path d="M 6 22 A 13 13 0 1 1 30 22" fill="none" stroke="#283238" stroke-width="2.5"/>
        <path d="M 6 22 A 13 13 0 1 1 30 22" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="47" stroke-dashoffset="${47 * (1 - ratio * 0.85)}"/>
        <circle cx="18" cy="18" r="2.5" fill="#D8DEE2"/>
        <line x1="18" y1="18" x2="18" y2="7" stroke="#FFFFFF" stroke-width="1.5" stroke-linecap="round" transform="rotate(${angle} 18 18)"/>
      </svg>
    </div>
  `;
};
