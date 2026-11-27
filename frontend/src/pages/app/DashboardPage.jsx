import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  MapPin, 
  AlertTriangle, 
  Clock, 
  ArrowRight, 
  Radio, 
  Layers, 
  SlidersHorizontal,
  ChevronRight,
  RefreshCw,
  Search
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Brush,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Stat } from '../../components/common/Stat';
import { NoiseTag } from '../../components/common/NoiseTag';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { createSensorDialHtml } from '../../components/common/SensorDial';
import { api } from '../../api';

export const DashboardPage = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Radial Noise Clock hover state
  const [hoveredHour, setHoveredHour] = useState(null);

  // Linked Chart brush state: time filter
  const [filteredCategoryData, setFilteredCategoryData] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sumRes, trendRes, sensorRes] = await Promise.all([
          api.getDashboardSummary(),
          api.getAnalyticsTrends('daily'),
          api.getMapSensors()
        ]);
        setSummary(sumRes);
        setTrends(trendRes);
        setSensors(sensorRes);
        setFilteredCategoryData(sumRes.category_breakdown || []);
        setFilteredAlerts(sumRes.recent_alerts || []);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Handle Linked Chart Brush change
  const handleBrushChange = (range) => {
    if (!summary || !range) return;
    const { startIndex, endIndex } = range;
    const sliced = trends.slice(startIndex, endIndex + 1);

    // Filter categories based on dominant sounds in brushed window
    const catMap = {};
    sliced.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + 1;
    });

    const updatedCategories = (summary.category_breakdown || []).map(c => ({
      ...c,
      count: catMap[c.category] ? Math.round(c.count * (sliced.length / trends.length) * 1.5) : Math.round(c.count * 0.2)
    }));

    setFilteredCategoryData(updatedCategories);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16 antialiased">
      {/* Page Title & Field Station Identifier */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Metropolitan Soundscape & Field Station Dashboard
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Station Network Telemetry / IEC 61672:2013 Calibrated Environmental Acoustic Audit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge />
          <span className="text-[10px] font-mono text-graphite">
            Network Sync: Live (IST)
          </span>
        </div>
      </div>

      {/* =====================================================================
          TOP STAT ROW: Plain typographic stats separated by hairlines (no cards)
         ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border border-sand bg-paper divide-y lg:divide-y-0 lg:divide-x divide-sand">
        <Stat
          label="Average Valid LAeq"
          value={summary?.average_valid_laeq || 59.4}
          unit="dB(A)"
          decimalPlaces={1}
          meta="Energy-averaged across 8 nodes"
        />
        <Stat
          label="Potential Exceedances"
          value={summary?.potential_exceedances || 14}
          unit="events"
          meta="Past 24-hr CPCB limit audits"
        />
        <Stat
          label="Detected Sound Events"
          value={summary?.detected_sound_events || 1842}
          unit="classified"
          meta="PANNs AudioSet taxonomy"
        />
        <Stat
          label="Active Field Sensors"
          value={summary?.active_sensors || 8}
          unit="/ 8 online"
          meta="Delhi, Mumbai, Bengaluru, Hyd"
        />
      </div>

      {/* =====================================================================
          MAIN SECTION: 24-Hour Radial Noise Clock & Linked Diurnal Trends
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): 24-Hour Radial "Noise Clock" */}
        <div className="lg:col-span-5 p-5 border border-sand bg-paper-light space-y-4">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                Circular Diurnal Sound Clock
              </span>
              <h2 className="font-serif text-base font-bold text-ink">
                24-Hour Acoustic Radial Meter
              </h2>
            </div>
            <SimulatedBadge />
          </div>

          <p className="text-[11px] text-graphite font-sans leading-relaxed">
            Each radial segment represents one hour of the diurnal cycle. Colors map to the strict noise scale: Quiet (teal) → Moderate (amber) → Loud (vermilion exceedance).
          </p>

          {/* Radial SVG Dial */}
          <div className="flex flex-col items-center justify-center pt-2 relative">
            <svg width="260" height="260" viewBox="0 0 300 300" className="overflow-visible select-none">
              {/* Outer Day / Night Ring */}
              <circle cx="150" cy="150" r="138" fill="none" stroke="#D9D3C4" strokeWidth="1" strokeDasharray="3 3" />

              {/* Day Period Arc (06:00 to 22:00 = 240 degrees) */}
              <text x="150" y="24" textAnchor="middle" fill="#4A5157" fontSize="9" fontFamily="IBM Plex Mono">00:00 (NIGHT)</text>
              <text x="282" y="153" textAnchor="start" fill="#4A5157" fontSize="9" fontFamily="IBM Plex Mono">06:00 (DAY)</text>
              <text x="150" y="286" textAnchor="middle" fill="#4A5157" fontSize="9" fontFamily="IBM Plex Mono">12:00</text>
              <text x="18" y="153" textAnchor="end" fill="#4A5157" fontSize="9" fontFamily="IBM Plex Mono">18:00</text>

              {/* 24 Radial Hour Segments */}
              {summary?.noise_clock?.map((seg) => {
                const angle = (seg.hour / 24) * 360 - 90; // Start at top (00:00)
                const rad = (angle * Math.PI) / 180;
                const innerR = 48;
                const outerR = 120;

                const x1 = 150 + innerR * Math.cos(rad);
                const y1 = 150 + innerR * Math.sin(rad);
                const x2 = 150 + outerR * Math.cos(rad);
                const y2 = 150 + outerR * Math.sin(rad);

                const color = seg.status === 'loud' ? '#E4572E' : seg.status === 'moderate' ? '#E9A23B' : '#2F6F63';
                const isHovered = hoveredHour?.hour === seg.hour;

                return (
                  <g 
                    key={seg.hour}
                    onMouseEnter={() => setHoveredHour(seg)}
                    onMouseLeave={() => setHoveredHour(null)}
                    className="cursor-pointer"
                  >
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={color}
                      strokeWidth={isHovered ? 8 : 4.5}
                      strokeLinecap="round"
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}

              {/* Center Readout Disc */}
              <circle cx="150" cy="150" r="42" fill="#F3EFE6" stroke="#14181B" strokeWidth="1.5" />
              <text x="150" y="146" textAnchor="middle" fill="#14181B" fontSize="13" fontWeight="bold" fontFamily="IBM Plex Mono">
                {hoveredHour ? `${hoveredHour.laeq} dB` : `${summary?.average_valid_laeq || 59.4} dB`}
              </text>
              <text x="150" y="160" textAnchor="middle" fill="#4A5157" fontSize="8" fontFamily="IBM Plex Mono" uppercase="true">
                {hoveredHour ? hoveredHour.label : '24-HR AVG'}
              </text>
            </svg>

            {/* Hover details badge */}
            <div className="h-10 mt-3 flex items-center justify-center text-xs font-mono">
              {hoveredHour ? (
                <div className="flex items-center gap-2 border border-sand px-3 py-1 bg-paper">
                  <span className="font-bold text-ink">{hoveredHour.label}</span>
                  <span>•</span>
                  <span>LAeq: <strong className="text-ink">{hoveredHour.laeq} dB(A)</strong></span>
                  <span>•</span>
                  <span>Limit: {hoveredHour.threshold} dB ({hoveredHour.period})</span>
                  <span>•</span>
                  <NoiseTag level={hoveredHour.status} size="sm" />
                </div>
              ) : (
                <span className="text-[10px] text-graphite-light">
                  Hover any hour line along the perimeter for detailed acoustic log
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): Linked Trend Chart with Range Brushing */}
        <div className="lg:col-span-7 p-5 border border-sand bg-paper-light space-y-4">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                Continuous Diurnal Audio Spectrum
              </span>
              <h2 className="font-serif text-base font-bold text-ink">
                Hourly Sound Pressure Levels & Statutory Baselines
              </h2>
            </div>
            <span className="text-[10px] font-mono text-graphite">
              Brush bottom slider to filter
            </span>
          </div>

          {/* Recharts Area Chart with Brush */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="laeqGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2F6F63" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2F6F63" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis 
                  dataKey="time" 
                  stroke="#4A5157" 
                  fontSize={10} 
                  fontFamily="IBM Plex Mono" 
                  tickLine={false} 
                />
                <YAxis 
                  domain={[30, 85]} 
                  stroke="#4A5157" 
                  fontSize={10} 
                  fontFamily="IBM Plex Mono" 
                  tickLine={false} 
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2 border border-ink bg-paper text-xs font-mono shadow-none">
                          <span className="font-bold text-ink block">{data.time}</span>
                          <span className="text-graphite">LAeq: <strong className="text-ink">{data.laeq} dB(A)</strong></span>
                          <span className="text-graphite block">Lmax: {data.lmax} dB | Limit: {data.limit} dB</span>
                          <span className="text-graphite block">Predominant: {data.category}</span>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {/* Statutory Limit Line */}
                <Area 
                  type="stepAfter" 
                  dataKey="limit" 
                  stroke="#14181B" 
                  strokeWidth={1} 
                  strokeDasharray="3 3" 
                  fill="none" 
                  name="CPCB Baseline" 
                />
                {/* Measured LAeq Curve */}
                <Area 
                  type="monotone" 
                  dataKey="laeq" 
                  stroke="#2F6F63" 
                  strokeWidth={1.5} 
                  fill="url(#laeqGrad)" 
                  name="Measured LAeq" 
                />
                <Brush 
                  dataKey="time" 
                  height={22} 
                  stroke="#D9D3C4" 
                  fill="#F3EFE6"
                  onChange={handleBrushChange}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-graphite border-t border-sand pt-2">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-quiet" />
                <span>Measured LAeq dB(A)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-ink border-b border-dotted" />
                <span>CPCB Limit Schedule</span>
              </span>
            </div>
            <span>Crosshair synced</span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          LINKED SECOND ROW: Category Distribution & Ruled Alerts & Map Preview
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Horizontal Category Distribution Bars (4 cols) */}
        <div className="lg:col-span-4 p-5 border border-sand bg-paper-light space-y-3">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              Sound Source Breakdown (AudioSet)
            </span>
            <SimulatedBadge />
          </div>

          <div className="space-y-2.5 pt-1">
            {filteredCategoryData.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-ink font-medium">{cat.category}</span>
                  <span className="text-graphite tabular-nums">{cat.count} events</span>
                </div>
                <div className="h-1.5 w-full bg-sand overflow-hidden">
                  <div 
                    className={`h-full ${cat.status === 'loud' ? 'bg-loud' : cat.status === 'moderate' ? 'bg-moderate' : 'bg-quiet'}`}
                    style={{ width: `${Math.min((cat.count / 650) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Alerts Ruled List (4 cols) */}
        <div className="lg:col-span-4 p-5 border border-sand bg-paper-light space-y-3">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              Recent Limit Exceedances
            </span>
            <Link to="/app/compliance" className="text-[10px] font-mono text-graphite hover:text-ink">
              View All →
            </Link>
          </div>

          <div className="divide-y divide-sand space-y-0 text-xs">
            {filteredAlerts.map((alt) => (
              <div key={alt.id} className="py-2.5 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={`w-2 h-2 ${alt.severity === 'loud' ? 'bg-loud' : 'bg-moderate'}`} />
                    <span className="font-bold text-ink">{alt.sensor_id}</span>
                  </div>
                  <span className="font-mono text-[10px] text-graphite tabular-nums">
                    {alt.timestamp.slice(11, 19)}
                  </span>
                </div>
                <p className="text-[11px] text-graphite line-clamp-1">
                  {alt.cause} ({alt.location})
                </p>
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span>LAeq: <strong className="text-ink">{alt.laeq} dB</strong></span>
                  {alt.margin > 0 ? (
                    <span className="text-loud font-bold">+{alt.margin} dB Exceedance</span>
                  ) : (
                    <span className="text-quiet font-bold">{Math.abs(alt.margin)} dB Under Limit</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Small Map Preview (4 cols) */}
        <div className="lg:col-span-4 p-5 border border-sand bg-paper-light space-y-3">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              Metropolitan Survey Grid
            </span>
            <Link to="/app/map" className="text-[10px] font-mono text-graphite hover:text-ink">
              Open Full Map →
            </Link>
          </div>

          {/* Mini Leaflet Preview */}
          <div className="h-44 w-full border border-sand relative overflow-hidden">
            <MapContainer
              center={[20.5937, 78.9629]}
              zoom={4}
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {sensors.map((s) => {
                const lat = Number(s.latitude);
                const lng = Number(s.longitude);
                if (isNaN(lat) || isNaN(lng)) return null;
                const val = typeof s.current_laeq === 'number' ? s.current_laeq : (typeof s.laeq === 'number' ? s.laeq : 55.0);

                const icon = L.divIcon({
                  className: 'custom-dial-marker',
                  html: createSensorDialHtml(val, s.compliance_status || 'quiet'),
                  iconSize: [28, 28],
                  iconAnchor: [14, 14],
                });
                return (
                  <Marker key={s.id || `${lat}-${lng}`} position={[lat, lng]} icon={icon}>
                    <Popup>
                      <div className="font-mono text-xs">
                        <strong>{s.sensor_name || 'Station'}</strong>
                        <div>{val} dB(A)</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-graphite pt-1">
            <span>8 Registered Field Stations</span>
            <span>OSM Muted Cartography</span>
          </div>
        </div>
      </div>
    </div>
  );
};
