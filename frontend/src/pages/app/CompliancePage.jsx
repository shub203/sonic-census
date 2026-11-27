import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Info, 
  FileText, 
  SlidersHorizontal,
  Scale
} from 'lucide-react';
import { DbGauge } from '../../components/common/DbGauge';
import { NoiseTag } from '../../components/common/NoiseTag';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { api } from '../../api';

export const CompliancePage = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Compliance evaluator state
  const [selectedZone, setSelectedZone] = useState('Residential');
  const [selectedPeriod, setSelectedPeriod] = useState('Day');
  const [testDb, setTestDb] = useState(58.4);
  const [isCalibrated, setIsCalibrated] = useState(true);
  const [evaluation, setEvaluation] = useState(null);

  // Recent Assessments Log
  const [recentAssessments, setRecentAssessments] = useState([
    {
      id: 'ASM-901',
      timestamp: '2026-11-17 16:30 IST',
      location: 'Connaught Place Inner Circle',
      zone: 'Commercial',
      period: 'Day (06:00–22:00)',
      measured_db: 63.8,
      limit_db: 65.0,
      margin: -1.2,
      status: 'Within limit',
      level: 'quiet'
    },
    {
      id: 'ASM-902',
      timestamp: '2026-11-17 15:45 IST',
      location: 'AIIMS Hospital Perimeter',
      zone: 'Silence',
      period: 'Day (06:00–22:00)',
      measured_db: 54.2,
      limit_db: 50.0,
      margin: 4.2,
      status: 'Potential exceedance',
      level: 'loud'
    },
    {
      id: 'ASM-903',
      timestamp: '2026-11-17 14:10 IST',
      location: 'Sector 9 Rohini',
      zone: 'Residential',
      period: 'Day (06:00–22:00)',
      measured_db: 51.2,
      limit_db: 55.0,
      margin: -3.8,
      status: 'Within limit',
      level: 'quiet'
    },
    {
      id: 'ASM-904',
      timestamp: '2026-11-17 03:15 IST',
      location: 'Whitefield Tech Corridor',
      zone: 'Commercial',
      period: 'Night (22:00–06:00)',
      measured_db: 58.6,
      limit_db: 55.0,
      margin: 3.6,
      status: 'Potential exceedance',
      level: 'loud'
    },
    {
      id: 'ASM-905',
      timestamp: '2026-11-17 01:20 IST',
      location: 'Dharavi Industrial Complex',
      zone: 'Industrial',
      period: 'Night (22:00–06:00)',
      measured_db: null,
      limit_db: 70.0,
      margin: null,
      status: 'Uncalibrated / Insufficient data',
      level: 'uncalibrated'
    }
  ]);

  useEffect(() => {
    api.getComplianceRules().then(data => {
      setRules(data);
      setLoading(false);
    });
  }, []);

  // Recalculate evaluation when inputs change
  useEffect(() => {
    const runEval = async () => {
      const res = await api.checkCompliance({
        measured_db: testDb,
        zone_type: selectedZone,
        period: selectedPeriod,
        is_calibrated: isCalibrated
      });
      setEvaluation(res);
    };
    runEval();
  }, [testDb, selectedZone, selectedPeriod, isCalibrated]);

  // Current limit based on selection
  const currentRule = (rules || []).find(r => (r?.zone_type || '').toLowerCase() === selectedZone.toLowerCase()) || {
    day_limit_db: selectedZone === 'Industrial' ? 75.0 : selectedZone === 'Commercial' ? 65.0 : selectedZone === 'Silence' ? 50.0 : 55.0,
    night_limit_db: selectedZone === 'Industrial' ? 70.0 : selectedZone === 'Commercial' ? 55.0 : selectedZone === 'Silence' ? 40.0 : 45.0
  };
  const activeLimit = selectedPeriod === 'Day' 
    ? (currentRule.day_limit_db ?? (selectedZone === 'Industrial' ? 75.0 : selectedZone === 'Commercial' ? 65.0 : selectedZone === 'Silence' ? 50.0 : 55.0))
    : (currentRule.night_limit_db ?? (selectedZone === 'Industrial' ? 70.0 : selectedZone === 'Commercial' ? 55.0 : selectedZone === 'Silence' ? 40.0 : 45.0));

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            CPCB Noise Pollution Compliance Engine
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            The Noise Pollution (Regulation and Control) Rules, 2000 Statutory Baseline Audit
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge />
          <span className="text-[10px] font-mono text-graphite">
            Rule 3(1) & 4(1) Schedule
          </span>
        </div>
      </div>

      {/* Main Grid: Interactive Evaluator (7 cols) + Statutory Schedule Table (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Interactive Compliance Evaluator & Sliding Limit Gauge */}
        <div className="lg:col-span-7 p-5 border border-sand bg-paper-light space-y-4">
          <div className="flex items-center justify-between border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              Statutory Limit Evaluator
            </span>
            <span className="text-[10px] font-mono text-graphite">
              Live Slider Test Bench
            </span>
          </div>

          {/* Form Selectors */}
          <div className="grid grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">
                Zone Classification:
              </label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Industrial">Industrial Zone</option>
                <option value="Commercial">Commercial Zone</option>
                <option value="Residential">Residential Zone</option>
                <option value="Silence">Silence Zone</option>
              </select>
            </div>

            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">
                Statutory Period:
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Day">Day (06:00 to 22:00)</option>
                <option value="Night">Night (22:00 to 06:00)</option>
              </select>
            </div>
          </div>

          {/* Test Decibel Input Slider */}
          <div className="space-y-1.5 pt-1 text-xs font-mono">
            <div className="flex justify-between items-baseline">
              <span className="text-graphite uppercase text-[10px]">Test Measured Sound Level:</span>
              <span className="font-bold text-ink text-sm tabular-nums">{testDb.toFixed(1)} dB(A)</span>
            </div>
            <input
              type="range"
              min="30"
              max="95"
              step="0.5"
              value={testDb}
              onChange={(e) => setTestDb(parseFloat(e.target.value))}
              disabled={!isCalibrated}
              className="w-full accent-ink cursor-pointer disabled:opacity-40"
            />
            <div className="flex justify-between text-[9px] text-graphite-light">
              <span>30 dB</span>
              <span>55 dB (Res. Day)</span>
              <span>75 dB (Ind. Day)</span>
              <span>95 dB</span>
            </div>
          </div>

          {/* Calibration toggle */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-mono">
              <input
                type="checkbox"
                checked={isCalibrated}
                onChange={(e) => setIsCalibrated(e.target.checked)}
                className="rounded-none border-sand-dark text-ink focus:ring-0"
              />
              <span className="text-ink">
                Hardware Microphone Calibrated (IEC 61672)
              </span>
            </label>
          </div>

          {/* The Horizontal Sliding Limit Gauge */}
          <div className="pt-3 border-t border-sand">
            <DbGauge
              currentDb={isCalibrated ? testDb : null}
              limitDb={activeLimit}
              zoneType={selectedZone}
              period={selectedPeriod}
              isCalibrated={isCalibrated}
            />
          </div>

          {/* Result Outcome Callout */}
          {evaluation && (
            <div className="p-3 border border-sand bg-paper space-y-1 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-graphite uppercase text-[10px]">Evaluation Verdict:</span>
                <NoiseTag 
                  level={evaluation.status === 'Potential exceedance' ? 'loud' : isCalibrated ? 'quiet' : 'uncalibrated'} 
                  label={evaluation.status} 
                />
              </div>
              <p className="text-[11px] text-graphite font-sans leading-relaxed pt-1">
                {evaluation.note}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Statutory CPCB 2000 Schedule Table */}
        <div className="lg:col-span-5 p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Official Reference Schedule
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Ambient Air Quality Standards in respect of Noise
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-sand text-graphite text-[10px] uppercase">
                  <th className="py-2 pr-2">Area Code</th>
                  <th className="py-2 pr-2">Zone</th>
                  <th className="py-2 text-center">Day</th>
                  <th className="py-2 text-center">Night</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand text-[11px]">
                <tr className={`hover:bg-sand-light ${selectedZone === 'Industrial' ? 'bg-sand font-bold' : ''}`}>
                  <td className="py-2 text-ink">A</td>
                  <td className="py-2 text-ink">Industrial</td>
                  <td className="py-2 text-center tabular-nums">75 dB</td>
                  <td className="py-2 text-center tabular-nums">70 dB</td>
                </tr>
                <tr className={`hover:bg-sand-light ${selectedZone === 'Commercial' ? 'bg-sand font-bold' : ''}`}>
                  <td className="py-2 text-ink">B</td>
                  <td className="py-2 text-ink">Commercial</td>
                  <td className="py-2 text-center tabular-nums">65 dB</td>
                  <td className="py-2 text-center tabular-nums">55 dB</td>
                </tr>
                <tr className={`hover:bg-sand-light ${selectedZone === 'Residential' ? 'bg-sand font-bold' : ''}`}>
                  <td className="py-2 text-ink">C</td>
                  <td className="py-2 text-ink">Residential</td>
                  <td className="py-2 text-center tabular-nums">55 dB</td>
                  <td className="py-2 text-center tabular-nums">45 dB</td>
                </tr>
                <tr className={`hover:bg-sand-light ${selectedZone === 'Silence' ? 'bg-sand font-bold' : ''}`}>
                  <td className="py-2 text-ink">D</td>
                  <td className="py-2 text-ink">Silence Zone</td>
                  <td className="py-2 text-center tabular-nums">50 dB</td>
                  <td className="py-2 text-center tabular-nums">40 dB</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Statutory footnote */}
          <div className="text-[10px] text-graphite font-sans leading-relaxed pt-2 border-t border-sand">
            <strong>Legal Note:</strong> Day time is reckoned from 6:00 AM to 10:00 PM. Night time is reckoned from 10:00 PM to 6:00 AM. Silence zone is an area comprising not less than 100 meters around hospitals, educational institutions, and courts.
          </div>
        </div>
      </div>

      {/* =====================================================================
          RECENT ASSESSMENTS TABLE (Ruled rows)
         ===================================================================== */}
      <div className="p-5 border border-sand bg-paper space-y-3">
        <div className="flex items-center justify-between border-b border-sand pb-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Audit History Log
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Recent Statutory Compliance Audits
            </h2>
          </div>
          <SimulatedBadge />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-sand text-[10px] text-graphite uppercase tracking-wider">
                <th className="py-2 pr-3">Audit ID</th>
                <th className="py-2 pr-3">Timestamp</th>
                <th className="py-2 pr-3">Location & Zone</th>
                <th className="py-2 pr-3 text-right">Measured LAeq</th>
                <th className="py-2 pr-3 text-right">Limit</th>
                <th className="py-2 text-center">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {recentAssessments.map((a) => (
                <tr key={a.id} className="hover:bg-sand-light transition-colors">
                  <td className="py-2.5 font-bold text-ink">{a.id}</td>
                  <td className="py-2.5 text-graphite tabular-nums">{a.timestamp}</td>
                  <td className="py-2.5">
                    <span className="text-ink font-semibold block">{a.location}</span>
                    <span className="text-[10px] text-graphite">{a.zone} • {a.period}</span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-ink tabular-nums">
                    {a.measured_db !== null ? `${a.measured_db.toFixed(1)} dB(A)` : '—'}
                  </td>
                  <td className="py-2.5 text-right text-graphite tabular-nums">
                    {a.limit_db.toFixed(1)} dB
                  </td>
                  <td className="py-2.5 text-center">
                    <NoiseTag level={a.level} label={a.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
