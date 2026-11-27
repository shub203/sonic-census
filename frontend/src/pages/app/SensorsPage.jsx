import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Plus, 
  MapPin, 
  Calendar, 
  Clock, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  X
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { NoiseTag } from '../../components/common/NoiseTag';
import { createSensorDialHtml } from '../../components/common/SensorDial';
import { api } from '../../api';

export const SensorsPage = () => {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Sensor form state
  const [newSensor, setNewSensor] = useState({
    sensor_name: '',
    location_name: '',
    city: 'New Delhi',
    zone_type: 'Residential',
    latitude: 28.6139,
    longitude: 77.2090,
    sensor_type: 'IoT Class 1 Precision Sound Monitor'
  });

  const fetchSensors = async () => {
    try {
      const data = await api.getMapSensors();
      setSensors(data);
    } catch (err) {
      console.error('Sensors error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSensors();
  }, []);

  const handleAddSensor = async (e) => {
    e.preventDefault();
    try {
      const saved = await api.createSensor({
        sensor_name: newSensor.sensor_name || 'DEL-NEW-01',
        location_name: newSensor.location_name || 'New Survey Point, Delhi',
        zone_type: newSensor.zone_type,
        latitude: parseFloat(newSensor.latitude) || 28.6139,
        longitude: parseFloat(newSensor.longitude) || 77.2090,
        sensor_type: newSensor.sensor_type
      });
      const created = {
        ...saved,
        city: newSensor.city,
        calibration_date: saved.calibration_date || 'Today',
        last_seen: 'Just registered',
        current_laeq: saved.latest_laeq ?? 52.4,
        threshold: 55.0,
        compliance_status: 'quiet',
        recent_trend: [51, 52, 53, 52, 52, 53, 52],
        predominant_category: 'Traffic',
        is_simulated: true,
      };
      setSensors([created, ...sensors]);
      setShowAddModal(false);
    } catch (err) {
      console.error('Failed to register sensor:', err);
      alert(err?.response?.data?.detail || 'Officer authentication required to register new sensor nodes.');
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Metropolitan Sensor Node Registry
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Station Hardware Calibration, Geographic Coordinates & In-situ Telemetry Status
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Add Monitoring Node</span>
        </button>
      </div>

      {/* Overview Map of All Registered Sensors */}
      <div className="p-4 border border-sand bg-sand-light space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <span className="text-ink font-bold uppercase tracking-wider">Spatial Distribution of Nodes</span>
          <SimulatedBadge />
        </div>
        <div className="h-56 w-full border border-sand relative overflow-hidden">
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
                      <strong>{s.sensor_name || 'Monitoring Node'}</strong>
                      <div>{s.location_name || 'Station'}</div>
                      <div>{val} dB(A)</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Sensors Table */}
      <div className="p-5 border border-sand bg-paper space-y-3">
        <div className="flex items-center justify-between border-b border-sand pb-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
            Active Station Inventory ({sensors.length} Nodes)
          </span>
          <SimulatedBadge />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-sand text-[10px] text-graphite uppercase tracking-wider">
                <th className="py-2 pr-3">Sensor Code</th>
                <th className="py-2 pr-3">Location & Territory</th>
                <th className="py-2 pr-3">Zone Type</th>
                <th className="py-2 pr-3">Hardware Type</th>
                <th className="py-2 pr-3">Calibration Date</th>
                <th className="py-2 pr-3">Last Seen</th>
                <th className="py-2 pr-3 text-right">Current LAeq</th>
                <th className="py-2 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {sensors.map((s) => (
                <tr key={s.id} className="hover:bg-sand-light transition-colors">
                  <td className="py-2.5 font-bold text-ink">
                    <div className="flex items-center gap-1.5">
                      <span>{s.sensor_name}</span>
                      <SimulatedBadge />
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span className="text-ink font-semibold block">{s.location_name}</span>
                    <span className="text-[10px] text-graphite">Lat {s.latitude}, Lon {s.longitude}</span>
                  </td>
                  <td className="py-2.5">
                    <span className="border border-sand px-1.5 py-0.5 bg-sand-light text-[10px] text-ink">
                      {s.zone_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-graphite truncate max-w-xs">{s.sensor_type}</td>
                  <td className="py-2.5 text-graphite tabular-nums">{s.calibration_date}</td>
                  <td className="py-2.5 text-graphite">{s.last_seen}</td>
                  <td className="py-2.5 text-right font-bold text-ink tabular-nums">
                    {s.current_laeq} dB(A)
                  </td>
                  <td className="py-2.5 text-center">
                    <NoiseTag level={s.compliance_status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Add Sensor" Modal Form */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40">
          <div className="bg-paper border border-ink p-6 max-w-md w-full space-y-4 shadow-none text-xs font-mono">
            <div className="flex items-center justify-between border-b border-sand pb-2">
              <span className="font-serif text-sm font-bold text-ink uppercase tracking-wider">
                Register New In-situ Station
              </span>
              <button onClick={() => setShowAddModal(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddSensor} className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Sensor Identifier:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DEL-DWARKA-04"
                  value={newSensor.sensor_name}
                  onChange={(e) => setNewSensor({ ...newSensor, sensor_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper-light text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Location Name & Address:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 10 Roadway, Dwarka, Delhi"
                  value={newSensor.location_name}
                  onChange={(e) => setNewSensor({ ...newSensor, location_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper-light text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">CPCB Statutory Zone:</label>
                <select
                  value={newSensor.zone_type}
                  onChange={(e) => setNewSensor({ ...newSensor, zone_type: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper-light text-ink focus:border-ink focus:outline-none"
                >
                  <option value="Residential">Residential Zone</option>
                  <option value="Commercial">Commercial Zone</option>
                  <option value="Industrial">Industrial Zone</option>
                  <option value="Silence">Silence Zone</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase text-graphite mb-1">Latitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newSensor.latitude}
                    onChange={(e) => setNewSensor({ ...newSensor, latitude: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-sand bg-paper-light text-ink focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase text-graphite mb-1">Longitude:</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={newSensor.longitude}
                    onChange={(e) => setNewSensor({ ...newSensor, longitude: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-sand bg-paper-light text-ink focus:border-ink focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-sand text-graphite hover:text-ink text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 border border-ink bg-ink text-paper text-xs uppercase"
                >
                  Register Node
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
