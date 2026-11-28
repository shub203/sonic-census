import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  FileSpreadsheet, 
  FileCheck,
  Calendar,
  MapPin,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { AudioVaultPanel } from '../../components/common/AudioVaultPanel';
import { api } from '../../api';

export const ReportsPage = () => {
  const [reportType, setReportType] = useState('Daily Environmental Monitoring');
  const [period, setPeriod] = useState('Last 24 Hours');
  const [location, setLocation] = useState('Delhi NCR Metropolitan Cluster');
  const [reportsList, setReportsList] = useState([]);
  const [previewSensors, setPreviewSensors] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [generatedToast, setGeneratedToast] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getReportsList().catch((err) => {
        setErrorMsg(err?.response?.data?.detail || 'Unable to load reports archive.');
        return [];
      }),
      api.getMapSensors().catch(() => []),
    ]).then(([reps, sens]) => {
      setReportsList(reps || []);
      setPreviewSensors((sens || []).slice(0, 4));
    });
  }, []);

  const handleGenerate = async (format) => {
    setGenerating(true);
    setErrorMsg(null);
    try {
      const newRep = await api.generateReport({
        report_type: reportType,
        period,
        location,
        file_format: format
      });
      setReportsList([newRep, ...reportsList]);
      setGeneratedToast(`Compiled and certified ${format} report: ${newRep.id}`);
      setTimeout(() => setGeneratedToast(null), 4000);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || err?.message || 'Report generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadReport = async (report) => {
    setDownloadingId(report.id);
    setErrorMsg(null);
    try {
      await api.downloadReport(report);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to download report file.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Statutory Noise Pollution Audit & Report Generator
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Certified Environmental Compliance Audits (PDF) / Acoustic Telemetry Time Series (CSV)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge />
          <span className="text-[10px] font-mono text-graphite">CPCB Schedule Format</span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 border border-loud bg-loud/10 text-loud text-xs font-mono">
          {errorMsg}
        </div>
      )}

      {generatedToast && (
        <div className="p-3 border border-ink bg-paper-light text-xs font-mono flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-quiet flex-shrink-0" strokeWidth={1.5} />
            <span className="text-ink font-semibold">{generatedToast}</span>
          </div>
          <button onClick={() => setGeneratedToast(null)} className="text-graphite hover:text-ink text-xs">✕</button>
        </div>
      )}

      {/* Grid: Parameters Form (5 cols) + Live Preview Panel (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Report Configuration */}
        <div className="lg:col-span-5 p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Audit Scope & Filter Options
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Configure Report Parameters
            </h2>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Report Type:
              </label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Daily Environmental Monitoring">Daily Environmental Monitoring Audit</option>
                <option value="Weekly Noise Analysis">Weekly Acoustic Diurnal Analysis</option>
                <option value="Location-Specific Soundscape">Location-Specific Soundscape Survey</option>
                <option value="CPCB Regulatory Exceedance">CPCB Statutory Exceedance Audit</option>
                <option value="Sound Category Distribution">AudioSet Acoustic Source Profile</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Audited Time Window:
              </label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Last 24 Hours">Last 24 Hours (Diurnal Cycle)</option>
                <option value="Past 7 Days">Past 7 Days (Weekly Survey)</option>
                <option value="Past 30 Days">Past 30 Days (Monthly Baseline)</option>
                <option value="Quarter to Date">Current Quarter (Regulatory Return)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Monitored Territory / Cluster:
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Delhi NCR Metropolitan Cluster">Delhi NCR Metropolitan Cluster (3 nodes)</option>
                <option value="Mumbai Financial Corridor">Mumbai Financial Corridor (BKC & Dharavi)</option>
                <option value="Bengaluru Tech Corridor">Bengaluru Tech Corridor (Whitefield)</option>
                <option value="All Monitored National Stations">All Monitored National Stations (8 nodes)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-sand flex items-center gap-3">
            <button
              type="button"
              disabled={generating}
              onClick={() => handleGenerate('PDF')}
              className="flex-1 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FileCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{generating ? 'Compiling...' : 'Generate PDF'}</span>
            </button>

            <button
              type="button"
              disabled={generating}
              onClick={() => handleGenerate('CSV')}
              className="flex-1 py-2 border border-sand-dark bg-paper text-ink text-xs font-mono uppercase tracking-wider hover:border-ink transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Right Column (7 cols): Live Dynamic Report Preview Panel */}
        <div className="lg:col-span-7 p-6 border border-sand bg-paper space-y-4 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-sand pb-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-graphite block">
                Statutory Document Live Preview
              </span>
              <h3 className="font-serif text-lg font-bold text-ink">
                {reportType}
              </h3>
            </div>
            <SimulatedBadge />
          </div>

          {/* Survey Metadata Header Box */}
          <div className="p-3 border border-sand bg-sand-light/50 space-y-1.5 text-[11px] text-graphite">
            <div className="flex justify-between">
              <span>Jurisdiction:</span>
              <strong className="text-ink">Central Pollution Control Board (CPCB) India</strong>
            </div>
            <div className="flex justify-between">
              <span>Time Horizon:</span>
              <strong className="text-ink">{period}</strong>
            </div>
            <div className="flex justify-between">
              <span>Target Cluster:</span>
              <strong className="text-ink">{location}</strong>
            </div>
            <div className="flex justify-between">
              <span>Certification Protocol:</span>
              <strong className="text-ink">IEC 61672-1:2013 Class 1</strong>
            </div>
          </div>

          {/* Sample Audit Table Preview */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] uppercase text-graphite block">
              Sample Summary Table (Preview):
            </span>
            <div className="border border-sand bg-paper overflow-hidden">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="border-b border-sand bg-sand-light/50 text-[9px] uppercase text-graphite">
                    <th className="py-1.5 px-2">Zone</th>
                    <th className="py-1.5 px-2 text-right">Avg LAeq</th>
                    <th className="py-1.5 px-2 text-right">CPCB Limit</th>
                    <th className="py-1.5 px-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sand">
                  {previewSensors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-2 px-2 text-graphite">
                        Station summary rows will populate from PostgreSQL telemetry upon compilation.
                      </td>
                    </tr>
                  ) : previewSensors.map((s) => {
                    const laeq = typeof s.current_laeq === 'number' ? s.current_laeq : 55.0;
                    const limit = s.zone_type === 'Industrial' ? 75 : s.zone_type === 'Commercial' ? 65 : s.zone_type === 'Silence' ? 50 : 55;
                    const exceeded = laeq > limit;
                    return (
                      <tr key={s.id}>
                        <td className="py-1.5 px-2 text-ink">{s.sensor_name} ({s.zone_type})</td>
                        <td className={`py-1.5 px-2 text-right tabular-nums ${exceeded ? 'text-loud font-bold' : ''}`}>
                          {laeq.toFixed(1)} dB(A)
                        </td>
                        <td className="py-1.5 px-2 text-right tabular-nums">{limit.toFixed(1)} dB</td>
                        <td className={`py-1.5 px-2 text-center font-bold ${exceeded ? 'text-loud' : 'text-quiet'}`}>
                          {exceeded ? `Exceedance (+${(laeq - limit).toFixed(1)})` : 'Within limit'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-graphite font-sans leading-relaxed border-t border-sand">
            Generated documents feature embedded SHA-256 integrity checksums, station calibration serial numbers, and statutory signatures for municipal audit submission.
          </div>
        </div>
      </div>

      {/* =====================================================================
          REPORT HISTORY ARCHIVE (Ruled rows)
         ===================================================================== */}
      <div className="p-5 border border-sand bg-paper space-y-3">
        <div className="flex items-center justify-between border-b border-sand pb-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Audit Register
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Archived Statutory Environmental Reports
            </h2>
          </div>
          <SimulatedBadge />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-sand text-[10px] text-graphite uppercase tracking-wider">
                <th className="py-2 pr-3">Report ID</th>
                <th className="py-2 pr-3">Title & Classification</th>
                <th className="py-2 pr-3">Territory</th>
                <th className="py-2 pr-3">Compiled At</th>
                <th className="py-2 pr-3 text-center">Format / Size</th>
                <th className="py-2 text-right">Download</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand">
              {reportsList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-graphite">
                    No compiled statutory reports in archive yet. Use Configure Report Parameters above to generate a PDF or CSV.
                  </td>
                </tr>
              ) : reportsList.map((r) => (
                <tr key={r.id} className="hover:bg-sand-light transition-colors">
                  <td className="py-2.5 font-bold text-ink">{r.id}</td>
                  <td className="py-2.5">
                    <span className="font-semibold text-ink block">{r.title}</span>
                    <span className="text-[10px] text-graphite">{r.type}</span>
                  </td>
                  <td className="py-2.5 text-graphite">{r.location}</td>
                  <td className="py-2.5 text-graphite tabular-nums">{r.generated_at}</td>
                  <td className="py-2.5 text-center">
                    <span className="text-[10px] font-bold border border-sand px-1.5 py-0.5 bg-sand-light text-ink">
                      {r.file_format} ({r.file_size_kb} KB)
                    </span>
                  </td>
                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      disabled={downloadingId === r.id}
                      onClick={() => handleDownloadReport(r)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-ink hover:underline border border-sand px-2 py-1 bg-paper-light hover:border-ink disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" strokeWidth={1.5} />
                      <span>{downloadingId === r.id ? '...' : r.file_format}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================================
          HASHED DATABASE AUDIO VAULT & EXPORT
         ===================================================================== */}
      <AudioVaultPanel />
    </div>
  );
};
