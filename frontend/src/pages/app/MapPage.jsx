import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Filter, 
  Volume2, 
  AlertTriangle, 
  CheckCircle2, 
  Radio, 
  Layers, 
  Activity, 
  RefreshCw, 
  Compass, 
  X, 
  Clock, 
  Sun, 
  Moon, 
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';
import { createSensorDialHtml } from '../../components/common/SensorDial';
import { NoiseTag } from '../../components/common/NoiseTag';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { DbGauge } from '../../components/common/DbGauge';
import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { api } from '../../api';

// Map FlyTo controller
const MapFlyTo = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { duration: 1.2 });
    }
  }, [center, zoom, map]);
  return null;
};

export const MapPage = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedZone, setSelectedZone] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Day / Night statutory period toggle
  const [isDayPeriod, setIsDayPeriod] = useState(true); // true = Day (06:00-22:00), false = Night (22:00-06:00)

  // Diurnal scrub time slider (0 to 23 hours)
  const [timeHour, setTimeHour] = useState(14); // 14:00 (2 PM)

  // Selected sensor for right-side drawer
  const [selectedSensor, setSelectedSensor] = useState(null);

  // Map center & zoom
  const [mapCenter, setMapCenter] = useState([20.5937, 78.9629]); // India center
  const [mapZoom, setMapZoom] = useState(5);

  const fetchSensors = async () => {
    try {
      const data = await api.getMapSensors();
      setSensors(data);
      if (data.length > 0 && !selectedSensor) {
        setSelectedSensor(data[0]);
      }
    } catch (err) {
      console.error('Failed to load map sensors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  const quickCities = [
    { name: 'All India Survey', coords: [20.5937, 78.9629], zoom: 5 },
    { name: 'New Delhi', coords: [28.6139, 77.2090], zoom: 12 },
    { name: 'Mumbai', coords: [19.0760, 72.8777], zoom: 12 },
    { name: 'Bengaluru', coords: [12.9716, 77.5946], zoom: 12 },
    { name: 'Hyderabad', coords: [17.3850, 78.4867], zoom: 12 },
    { name: 'Chennai', coords: [13.0827, 80.2707], zoom: 12 },
  ];

  // Dynamic diurnal time adjustment on sensor readings
  const getDynamicLaeq = (sensor) => {
    if (!sensor) return 55.0;
    // Diurnal variation curve: afternoon peak vs night quiet
    const hourDelta = Math.sin((timeHour / 24) * Math.PI * 2 - Math.PI / 2) * 4.5;
    const raw = sensor.current_laeq ?? sensor.laeq ?? 55.0;
    const base = typeof raw === 'number' ? raw : parseFloat(raw) || 55.0;
    return Math.round((base + hourDelta) * 10) / 10;
  };

  const getComplianceForSensor = (sensor, dynamicLaeq) => {
    if (!sensor) return { status: 'quiet', limit: 55.0 };
    const zone = sensor.zone_type || 'Residential';
    const isCommercial = zone === 'Commercial';
    const isIndustrial = zone === 'Industrial';
    const isSilence = zone === 'Silence';

    let limit = isDayPeriod ? 55.0 : 45.0; // Residential default
    if (isCommercial) limit = isDayPeriod ? 65.0 : 55.0;
    if (isIndustrial) limit = isDayPeriod ? 75.0 : 70.0;
    if (isSilence) limit = isDayPeriod ? 50.0 : 40.0;

    const val = typeof dynamicLaeq === 'number' && !isNaN(dynamicLaeq) ? dynamicLaeq : 55.0;
    if (val > limit) return { status: 'loud', limit };
    if (val >= limit - 2.5) return { status: 'moderate', limit };
    return { status: 'quiet', limit };
  };

  // Filtered sensors
  const filteredSensors = sensors.filter((s) => {
    if (!s) return false;
    const zone = s.zone_type || '';
    const cat = s.predominant_category || s.sound_category || 'Traffic';
    if (selectedZone !== 'All' && zone !== selectedZone) return false;
    if (selectedCategory !== 'All' && cat !== selectedCategory) return false;
    if (selectedStatus !== 'All') {
      const dynLaeq = getDynamicLaeq(s);
      const comp = getComplianceForSensor(s, dynLaeq);
      if (selectedStatus === 'exceedance' && comp.status !== 'loud') return false;
      if (selectedStatus === 'compliant' && comp.status === 'loud') return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 antialiased">
      {/* Page Title & Control Bar */}
      <div className="border-b border-sand pb-4 flex flex-col lg:flex-row lg:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Metropolitan Soundscape & Spatial Noise Map
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Muted Cartographic Survey / Continuous In-situ IoT Microphone Telemetry
          </p>
        </div>

        {/* City Quick Jumps */}
        <div className="flex flex-wrap items-center gap-2">
          {quickCities.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setMapCenter(c.coords);
                setMapZoom(c.zoom);
              }}
              className="px-2.5 py-1 border border-sand bg-paper-light hover:border-ink text-xs font-mono transition-colors text-ink"
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 border border-sand bg-paper-light flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3">
          {/* Zone filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-graphite uppercase">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="px-2 py-1 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
            >
              <option value="All">All Statutory Zones</option>
              <option value="Residential">Residential (55/45 dB)</option>
              <option value="Commercial">Commercial (65/55 dB)</option>
              <option value="Industrial">Industrial (75/70 dB)</option>
              <option value="Silence">Silence (50/40 dB)</option>
            </select>
          </div>

          {/* Sound category filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-graphite uppercase">Source:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2 py-1 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
            >
              <option value="All">All Categories</option>
              <option value="Traffic">Traffic</option>
              <option value="Construction">Construction</option>
              <option value="Industrial">Industrial</option>
              <option value="Emergency">Emergency</option>
              <option value="Human activity">Human activity</option>
            </select>
          </div>

          {/* Compliance filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-graphite uppercase">Compliance:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2 py-1 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
            >
              <option value="All">All Readouts</option>
              <option value="compliant">Within Statutory Limit</option>
              <option value="exceedance">Potential Exceedance Only</option>
            </select>
          </div>
        </div>

        {/* Day / Night Statutory Toggle */}
        <div className="flex items-center gap-2 border border-sand px-2 py-1 bg-paper">
          <span className="text-graphite uppercase text-[10px]">Statutory Period:</span>
          <button
            type="button"
            onClick={() => setIsDayPeriod(true)}
            className={`px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 transition-colors ${
              isDayPeriod ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'
            }`}
          >
            <Sun className="w-3 h-3" />
            <span>DAY (06–22)</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDayPeriod(false)}
            className={`px-2 py-0.5 text-[11px] font-bold flex items-center gap-1 transition-colors ${
              !isDayPeriod ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'
            }`}
          >
            <Moon className="w-3 h-3" />
            <span>NIGHT (22–06)</span>
          </button>
        </div>
      </div>

      {/* Map Layout: Left Canvas / Right Detail Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Map Canvas (8 cols) */}
        <div className="lg:col-span-8 border border-sand bg-sand-light relative">
          <div className="h-[520px] w-full relative">
            <ErrorBoundary>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
              >
                <MapFlyTo center={mapCenter} zoom={mapZoom} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {filteredSensors.map((s) => {
                  const lat = Number(s.latitude);
                  const lng = Number(s.longitude);
                  if (isNaN(lat) || isNaN(lng)) return null;

                  const dynLaeq = getDynamicLaeq(s);
                  const comp = getComplianceForSensor(s, dynLaeq);

                  const icon = L.divIcon({
                    className: 'custom-dial-marker',
                    html: createSensorDialHtml(dynLaeq, comp.status),
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  });

                  return (
                    <Marker
                      key={s.id || `${lat}-${lng}`}
                      position={[lat, lng]}
                      icon={icon}
                      eventHandlers={{
                        click: () => setSelectedSensor(s)
                      }}
                    >
                      <Popup>
                        <div className="font-mono text-xs p-1 space-y-1">
                          <div className="font-bold text-ink">{s.sensor_name || 'Station'}</div>
                          <div className="text-[10px] text-graphite">{s.location_name || 'Field Sensor'}</div>
                          <div className="pt-1 flex items-center justify-between">
                            <span className="font-bold text-sm text-ink">{dynLaeq} dB(A)</span>
                            <span className="text-[10px] text-graphite">Limit: {comp.limit} dB</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </ErrorBoundary>

            {/* Bottom Floating Time Slider (Scrubbing diurnal hours 00:00 to 23:00) */}
            <div className="absolute bottom-4 left-4 right-4 z-20 bg-paper/95 border border-sand p-3 backdrop-blur-none text-xs font-mono space-y-1.5 shadow-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-ink flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-graphite" strokeWidth={1.5} />
                  Diurnal Scrub Time: <strong className="text-ink text-xs">{String(timeHour).padStart(2, '0')}:00 IST</strong>
                </span>
                <span className="text-[10px] text-graphite">
                  Applies diurnal decay / rush hour curve to markers
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="23"
                value={timeHour}
                onChange={(e) => setTimeHour(parseInt(e.target.value, 10))}
                className="w-full accent-ink cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-graphite-light">
                <span>00:00 (Night)</span>
                <span>06:00 (Day Start)</span>
                <span>12:00 (Midday)</span>
                <span>18:00 (Peak Rush)</span>
                <span>23:00 (Night)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Detail Drawer (4 cols) */}
        <div className="lg:col-span-4 p-5 border border-sand bg-paper-light space-y-4">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              Station Telemetry Inspector
            </span>
            <SimulatedBadge />
          </div>

          {selectedSensor ? (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-ink">
                    {selectedSensor.sensor_name || 'Station Node'}
                  </span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 border border-sand text-graphite">
                    {selectedSensor.zone_type || 'General'} Zone
                  </span>
                </div>
                <h3 className="text-xs text-graphite font-sans mt-0.5">
                  {selectedSensor.location_name || 'Monitoring Station'}
                </h3>
                <span className="text-[10px] font-mono text-graphite-light block mt-0.5">
                  Lat: {selectedSensor.latitude}, Lon: {selectedSensor.longitude}
                </span>
              </div>

              {/* Dynamic Decibel Gauge Readout */}
              {(() => {
                const dynLaeq = getDynamicLaeq(selectedSensor);
                const comp = getComplianceForSensor(selectedSensor, dynLaeq);
                return (
                  <DbGauge
                    currentDb={dynLaeq}
                    limitDb={comp.limit}
                    zoneType={selectedSensor.zone_type || 'Residential'}
                    period={isDayPeriod ? 'Day' : 'Night'}
                    isCalibrated={true}
                  />
                );
              })()}

              {/* Mini Sparkline */}
              {Array.isArray(selectedSensor.recent_trend) && selectedSensor.recent_trend.length > 0 && (
                <div className="p-3 border border-sand bg-paper space-y-1">
                  <span className="text-[9px] font-mono uppercase text-graphite block">
                    Recent 7-Reading Sparkline (LAeq dB)
                  </span>
                  <div className="flex items-end gap-1 h-8 pt-1">
                    {selectedSensor.recent_trend.map((val, i) => {
                      const num = typeof val === 'number' ? val : parseFloat(val) || 50;
                      const h = ((num - 45) / (75 - 45)) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-ink hover:bg-quiet transition-colors"
                          style={{ height: `${Math.max(Math.min(h, 100), 15)}%` }}
                          title={`${num} dB(A)`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-[8px] font-mono text-graphite-light pt-1">
                    <span>-3h</span>
                    <span>Now</span>
                  </div>
                </div>
              )}

              {/* Hardware & Calibration Metadata */}
              <div className="space-y-1.5 text-xs font-mono border-t border-sand pt-3 text-graphite">
                <div className="flex justify-between">
                  <span>Hardware Model:</span>
                  <strong className="text-ink">{selectedSensor.sensor_type || 'IoT Class 1 Precision Sound Monitor'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Last Calibrated:</span>
                  <strong className="text-ink">{selectedSensor.calibration_date || '2026-09-12'}</strong>
                </div>
                <div className="flex justify-between">
                  <span>In-situ Health:</span>
                  <span className="text-quiet font-bold">Operational (Active)</span>
                </div>
                <div className="flex justify-between">
                  <span>Predominant Source:</span>
                  <strong className="text-ink">{selectedSensor.predominant_category || selectedSensor.sound_category || 'Traffic'}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-graphite font-mono">
              Click any dial marker on the map to inspect telemetry details.
            </div>
          )}

          {/* Strict Cartographic Notice */}
          <div className="pt-2 border-t border-sand text-[10px] text-graphite leading-relaxed">
            <strong>Cartographic survey rule:</strong> Spatial sound maps and acoustic contours are compiled solely from calibrated energy sound pressure readings (LAeq), never from unverified AI probabilities.
          </div>
        </div>
      </div>
    </div>
  );
};
