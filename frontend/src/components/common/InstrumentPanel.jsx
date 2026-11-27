import React from 'react';

/**
 * Field Instrument Dark Panel.
 * Used strictly for acoustic oscillograms, spectrograms, and real-time sensor monitors.
 * Features dark background (#0F1315), 1px hairline border, and technical metadata bar.
 */
export const InstrumentPanel = ({ 
  title, 
  subtitle = null, 
  badge = null, 
  headerRight = null,
  children, 
  className = '' 
}) => {
  return (
    <div className={`bg-instrument border border-instrument-border rounded-none text-instrument-text shadow-instrument ${className}`}>
      {/* Technical Header Bar */}
      {(title || subtitle || headerRight) && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-instrument-border text-xs">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-quiet flex-shrink-0" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-white font-medium">
              {title}
            </span>
            {subtitle && (
              <span className="text-[10px] font-mono text-graphite-light">
                / {subtitle}
              </span>
            )}
            {badge && (
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 border border-instrument-muted bg-instrument-glow text-graphite-light">
                {badge}
              </span>
            )}
          </div>

          {headerRight && (
            <div className="flex items-center gap-2">
              {headerRight}
            </div>
          )}
        </div>
      )}

      {/* Panel Canvas / Content Container */}
      <div className="p-3">
        {children}
      </div>
    </div>
  );
};
