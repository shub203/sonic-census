import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  MapPin, 
  Volume2, 
  BarChart2, 
  ShieldCheck, 
  FileText, 
  Radio, 
  Settings, 
  ArrowRight,
  X
} from 'lucide-react';
import { MOCK_SENSORS } from '../../api/mockData';

export const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else onClose(true);
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const quickLinks = [
    { name: 'Analyze Audio Recording', path: '/app/analyze', icon: Volume2, cat: 'Analysis' },
    { name: 'Soundscape Geographical Map', path: '/app/map', icon: MapPin, cat: 'Monitoring' },
    { name: 'CPCB Regulatory Compliance', path: '/app/compliance', icon: ShieldCheck, cat: 'Regulatory' },
    { name: 'Acoustic Analytics & Trends', path: '/app/analytics', icon: BarChart2, cat: 'Data' },
    { name: 'Statutory Reports Generator', path: '/app/reports', icon: FileText, cat: 'Reporting' },
    { name: 'Sensor & IoT Station Registry', path: '/app/sensors', icon: Radio, cat: 'Hardware' },
    { name: 'System Settings & Units', path: '/app/settings', icon: Settings, cat: 'Config' },
  ];

  // Filter links & sensors
  const filteredLinks = quickLinks.filter(l => 
    l.name.toLowerCase().includes(query.toLowerCase()) || 
    l.cat.toLowerCase().includes(query.toLowerCase())
  );

  const filteredSensors = MOCK_SENSORS.filter(s =>
    s.sensor_name.toLowerCase().includes(query.toLowerCase()) ||
    s.location_name.toLowerCase().includes(query.toLowerCase()) ||
    s.city.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-ink/40 backdrop-blur-none animate-fade-in">
      <div 
        className="w-full max-w-xl bg-paper border border-ink rounded-none shadow-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 border-b border-sand bg-paper-light">
          <Search className="w-4 h-4 text-graphite mr-2.5 flex-shrink-0" strokeWidth={1.5} />
          <input
            type="text"
            autoFocus
            placeholder="Type a page, station, or command (e.g. Map, AIIMS, PDF)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-ink font-sans placeholder-graphite focus:outline-none"
          />
          <button
            onClick={() => onClose()}
            className="text-graphite hover:text-ink text-xs p-1"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto divide-y divide-sand-light p-2">
          {/* Pages */}
          {filteredLinks.length > 0 && (
            <div className="py-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite px-2 block mb-1">
                Navigation Modules
              </span>
              {filteredLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="w-full text-left flex items-center justify-between px-2.5 py-2 hover:bg-sand-light transition-colors group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-graphite group-hover:text-ink" strokeWidth={1.5} />
                      <span className="text-xs font-medium text-ink">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-graphite-light uppercase">
                      {item.cat}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Sensors */}
          {filteredSensors.length > 0 && (
            <div className="py-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite px-2 block mb-1">
                Metropolitan Sensors
              </span>
              {filteredSensors.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelect('/app/map')}
                  className="w-full text-left flex items-center justify-between px-2.5 py-2 hover:bg-sand-light transition-colors group"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-ink">{s.sensor_name}</span>
                      <span className="text-[10px] text-graphite font-mono">({s.city})</span>
                    </div>
                    <span className="text-[11px] text-graphite truncate block max-w-sm">
                      {s.location_name}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold text-ink tabular-nums">
                    {s.current_laeq} dB
                  </span>
                </button>
              ))}
            </div>
          )}

          {filteredLinks.length === 0 && filteredSensors.length === 0 && (
            <div className="py-8 text-center text-xs text-graphite font-mono">
              No matching field instruments or pages found.
            </div>
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2 border-t border-sand bg-sand-light flex items-center justify-between text-[10px] font-mono text-graphite">
          <span>Navigate: Click or Enter</span>
          <span>Close: Esc</span>
        </div>
      </div>
    </div>
  );
};
