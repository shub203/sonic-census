import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  HeartHandshake, 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  Volume2, 
  CheckCircle2, 
  Clock, 
  ArrowRight, 
  FileText, 
  Info, 
  Activity, 
  Radio, 
  FileQuestion,
  BookOpen,
  Shield,
  Lock
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { NoiseTag } from '../../components/common/NoiseTag';

export const CitizenDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/summary')
      .then(res => setSummary(res.data))
      .catch(err => console.error("Citizen summary error:", err))
      .finally(() => setLoading(false));
  }, []);

  const avgDb = summary?.average_laeq || 52.4;
  const healthScore = Math.max(30, Math.min(100, Math.round(100 - (avgDb - 40) * 1.5)));

  return (
    <div className="space-y-8 antialiased">
      {/* Page Header Monograph */}
      <div className="border-b border-sand pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Public Soundscape Observer
            </span>
            <SimulatedBadge text="CITIZEN PORTAL" />
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
            Welcome, {user?.name || 'Citizen Observer'}
          </h1>
          <p className="text-xs sm:text-sm text-graphite font-sans mt-1 max-w-2xl leading-relaxed">
            Monitor residential acoustic comfort, evaluate neighborhood sound levels against CPCB Noise Rules 2000, and lodge statutory noise grievances.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <Link
            to="/app/check-noise"
            className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-1.5"
          >
            <Volume2 className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Check Area Sound</span>
          </Link>

          <Link
            to="/app/complaint"
            className="px-4 py-2 border border-sand bg-paper-light hover:border-ink text-ink text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-loud" strokeWidth={1.5} />
            <span>File Grievance</span>
          </Link>

          <button
            onClick={() => navigate('/app/citizen', { state: { requireAdminLogin: true } })}
            className="px-3.5 py-2 border border-sand bg-paper hover:border-ink hover:text-ink text-graphite text-xs font-mono uppercase tracking-wider transition-colors flex items-center gap-1.5"
            title="Switch to Admin / Officer Portal (Login Required)"
          >
            <Lock className="w-3.5 h-3.5 text-loud" strokeWidth={1.5} />
            <span>Admin Portal</span>
          </button>
        </div>
      </div>

      {/* Key Metric Hairline Strips */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 border border-sand bg-paper-light space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-graphite uppercase">
            <span>Acoustic Comfort Score</span>
            <HeartHandshake className="w-3.5 h-3.5 text-quiet" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold text-ink tabular-nums">{healthScore}</span>
            <span className="text-xs text-graphite font-mono">/ 100</span>
          </div>
          <span className="text-[10px] font-mono text-quiet block pt-1">
            {healthScore >= 75 ? 'Safe & Restorative Baseline' : 'Elevated Ambient Exposure'}
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 border border-sand bg-paper-light space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-graphite uppercase">
            <span>Neighborhood Ambient LAeq</span>
            <Volume2 className="w-3.5 h-3.5 text-graphite" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold text-ink tabular-nums">{avgDb}</span>
            <span className="text-xs text-graphite font-mono">dB(A)</span>
          </div>
          <span className="text-[10px] font-mono text-graphite block pt-1">
            Limit: 55 Day / 45 Night
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 border border-sand bg-paper-light space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-graphite uppercase">
            <span>Public IoT Stations</span>
            <Radio className="w-3.5 h-3.5 text-graphite" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-3xl font-bold text-ink tabular-nums">{summary?.active_sensors || 8}</span>
            <span className="text-xs text-graphite font-mono">Nodes</span>
          </div>
          <span className="text-[10px] font-mono text-graphite block pt-1">
            Telemetry: Delhi, BLR, Mumbai
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 border border-sand bg-paper-light space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-graphite uppercase">
            <span>Statutory Framework</span>
            <ShieldCheck className="w-3.5 h-3.5 text-graphite" strokeWidth={1.5} />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-mono text-xl font-bold text-ink">Rules 2000</span>
          </div>
          <span className="text-[10px] font-mono text-graphite block pt-1">
            Silence Period: 22:00 – 06:00
          </span>
        </div>
      </div>

      {/* Two Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Decibel Comfort Guide (7 cols) */}
        <div className="lg:col-span-7 p-6 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-3 flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base font-bold text-ink">
                Environmental Sound Pressure Thresholds
              </h2>
              <p className="text-xs text-graphite font-sans mt-0.5">
                Practical interpretation of acoustic levels under Indian statutory guidelines.
              </p>
            </div>
            <Link
              to="/app/guidelines"
              className="text-xs font-mono text-ink hover:underline"
            >
              Full Schedule →
            </Link>
          </div>

          <div className="space-y-3 font-mono text-xs">
            {[
              {
                range: '30 - 45 dB(A)',
                title: 'Peaceful & Restorative (Night Residential Limit: 45 dB)',
                desc: 'Whisper, quiet library, residential bedroom at night. Optimal for uninterrupted REM sleep.',
                status: 'quiet'
              },
              {
                range: '45 - 55 dB(A)',
                title: 'Comfortable Urban Daytime (Day Residential Limit: 55 dB)',
                desc: 'Normal household conversation, residential street with light vehicle flow. Safe for prolonged exposure.',
                status: 'quiet'
              },
              {
                range: '55 - 65 dB(A)',
                title: 'Commercial Urban Activity (CPCB Commercial: 65 dB)',
                desc: 'Busy retail markets, office spaces, arterial roads. Noticeable cognitive fatigue over extended hours.',
                status: 'moderate'
              },
              {
                range: '65 - 85+ dB(A)',
                title: 'Industrial Machinery & Traffic Spike (Loud Exceedance)',
                desc: 'Heavy truck diesel engines, pneumatic drilling, continuous horn blowing. Risk of hearing impairment.',
                status: 'loud'
              }
            ].map((tier, idx) => (
              <div 
                key={idx}
                className="p-3 border border-sand bg-paper space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <NoiseTag status={tier.status} />
                    <span className="font-sans font-bold text-xs text-ink">{tier.title}</span>
                  </div>
                  <span className="text-[10px] text-graphite tabular-nums font-mono">
                    {tier.range}
                  </span>
                </div>
                <p className="text-[11px] text-graphite font-sans leading-relaxed">
                  {tier.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Citizen Actions & Statutory Rights (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 border border-sand bg-paper-light space-y-3">
            <h3 className="font-serif text-sm font-bold text-ink">
              Citizen Actions
            </h3>
            <div className="space-y-2">
              <Link
                to="/app/check-noise"
                className="block p-3 border border-sand bg-paper hover:border-ink transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-ink">
                  <span>1. Check Audio Sample</span>
                  <ArrowRight className="w-3.5 h-3.5 text-graphite group-hover:text-ink transition-colors" />
                </div>
                <p className="text-[11px] text-graphite font-sans mt-1">
                  Upload an audio recording to run PANNs classification and check compliance.
                </p>
              </Link>

              <Link
                to="/app/complaint"
                className="block p-3 border border-sand bg-paper hover:border-ink transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-ink">
                  <span>2. File Grievance Ticket</span>
                  <ArrowRight className="w-3.5 h-3.5 text-graphite group-hover:text-ink transition-colors" />
                </div>
                <p className="text-[11px] text-graphite font-sans mt-1">
                  Submit a formal complaint for nighttime loudspeakers, generators, or construction noise.
                </p>
              </Link>

              <Link
                to="/app/map"
                className="block p-3 border border-sand bg-paper hover:border-ink transition-colors group"
              >
                <div className="flex items-center justify-between text-xs font-mono font-bold text-ink">
                  <span>3. Public Soundscape Map</span>
                  <ArrowRight className="w-3.5 h-3.5 text-graphite group-hover:text-ink transition-colors" />
                </div>
                <p className="text-[11px] text-graphite font-sans mt-1">
                  Inspect in-situ telemetry across Delhi, Mumbai, Bengaluru, Chennai, and Hyderabad.
                </p>
              </Link>
            </div>
          </div>

          <div className="p-4 border border-sand bg-sand-light/50 space-y-1.5 text-[11px] font-mono text-graphite">
            <div className="flex items-center gap-1.5 text-ink font-bold uppercase text-[10px]">
              <Info className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Statutory Rule 5 (Noise Rules 2000)</span>
            </div>
            <p className="leading-relaxed">
              Under Rule 5(1), a loudspeaker or public address system shall not be used at night (between 10:00 PM and 6:00 AM) except in closed premises. Violations may be prosecuted under the Environment (Protection) Act, 1986.
            </p>
          </div>
        </div>
      </div>

      {/* Officer Switch Banner */}
      <div className="p-5 border border-sand bg-paper flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 border border-ink bg-ink text-paper flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="w-4 h-4" strokeWidth={1.5} />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-graphite block">
              CPCB / Municipal Authorities
            </span>
            <h4 className="font-serif font-bold text-sm text-ink">
              Looking for the Administrative & Regulatory Dashboard?
            </h4>
            <p className="text-xs text-graphite font-sans mt-0.5 max-w-xl">
              Access the live sensor telemetry grid, PANNs neural audio spectrograms, statutory PDF audit reports, and legal compliance engine.
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/app/citizen', { state: { requireAdminLogin: true } })}
          className="px-4 py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-2 flex-shrink-0"
        >
          <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
          <span>Login to Admin Portal</span>
          <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
};