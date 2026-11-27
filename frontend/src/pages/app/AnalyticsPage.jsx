import React, { useState, useEffect } from 'react';
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
import { Stat } from '../../components/common/Stat';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { api } from '../../api';

export const AnalyticsPage = () => {
  const [period, setPeriod] = useState('daily'); // 'daily' | 'weekly'
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalyticsTrends(period).then(data => {
      setTrends(data);
      setLoading(false);
    });
  }, [period]);

  const locationComparisons = [
    { city: 'Connaught Place (Delhi)', avg: 63.8, peak: 78.4, status: 'moderate' },
    { city: 'AIIMS Perimeter (Delhi)', avg: 52.4, peak: 68.2, status: 'loud' }, // Silence zone exceedance
    { city: 'Bandra Kurla (Mumbai)', avg: 64.5, peak: 79.1, status: 'moderate' },
    { city: 'Dharavi Industrial (Mumbai)', avg: 72.1, peak: 86.4, status: 'moderate' },
    { city: 'Whitefield (Bengaluru)', avg: 67.2, peak: 82.5, status: 'loud' },
    { city: 'HITEC City (Hyderabad)', avg: 62.1, peak: 76.0, status: 'quiet' },
  ];

  const categoryDistribution = [
    { name: 'Traffic (Vehicular)', events: 642, pct: 34.8, color: '#E4572E' },
    { name: 'Human Activity (Voice, Crowd)', events: 388, pct: 21.1, color: '#2F6F63' },
    { name: 'Construction (Drills, Impacts)', events: 312, pct: 16.9, color: '#E4572E' },
    { name: 'Industrial (Machinery, Motors)', events: 245, pct: 13.3, color: '#E9A23B' },
    { name: 'Nature & Canopy (Birds, Wind)', events: 142, pct: 7.7, color: '#2F6F63' },
    { name: 'Emergency (Sirens, Horns)', events: 78, pct: 4.2, color: '#E4572E' },
    { name: 'Aviation & Rail', events: 35, pct: 2.0, color: '#2F6F63' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 antialiased">
      {/* Page Title & Period Toggle */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Diurnal Sound Trends & Acoustic Analytics
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Continuous Environmental Decibel Energy Aggregations & Sound Category Profiling
          </p>
        </div>

        {/* Daily / Weekly Toggle */}
        <div className="flex items-center gap-1 border border-sand bg-paper p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setPeriod('daily')}
            className={`px-3 py-1 font-semibold transition-colors ${
              period === 'daily' ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'
            }`}
          >
            24-HOUR DIURNAL
          </button>
          <button
            type="button"
            onClick={() => setPeriod('weekly')}
            className={`px-3 py-1 font-semibold transition-colors ${
              period === 'weekly' ? 'bg-ink text-paper' : 'text-graphite hover:text-ink'
            }`}
          >
            7-DAY AGGREGATE
          </button>
        </div>
      </div>

      {/* Primary Trend Area Chart with Brush */}
      <div className="p-5 border border-sand bg-paper-light space-y-4">
        <div className="flex items-center justify-between border-b border-sand pb-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Multi-Station Aggregated Time Series
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Sound Pressure Envelope: LAeq, Peak Lmax & Baseline
            </h2>
          </div>
          <SimulatedBadge />
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="laeqAnalyticsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2F6F63" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#2F6F63" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#4A5157" fontSize={10} fontFamily="IBM Plex Mono" tickLine={false} />
              <YAxis domain={[30, 85]} stroke="#4A5157" fontSize={10} fontFamily="IBM Plex Mono" tickLine={false} />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="p-2.5 border border-ink bg-paper text-xs font-mono">
                        <span className="font-bold text-ink block">{d.time}</span>
                        <div className="text-graphite">LAeq: <strong className="text-ink">{d.laeq} dB(A)</strong></div>
                        <div className="text-graphite">Lmax Peak: <strong className="text-ink">{d.lmax} dB(A)</strong></div>
                        <div className="text-graphite">Statutory Limit: {d.limit} dB</div>
                        <div className="text-graphite">Dominant Sound: {d.category}</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area type="stepAfter" dataKey="limit" stroke="#14181B" strokeWidth={1} strokeDasharray="3 3" fill="none" />
              <Area type="monotone" dataKey="lmax" stroke="#E9A23B" strokeWidth={1} fill="none" />
              <Area type="monotone" dataKey="laeq" stroke="#2F6F63" strokeWidth={1.5} fill="url(#laeqAnalyticsGrad)" />
              <Brush dataKey="time" height={22} stroke="#D9D3C4" fill="#F3EFE6" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between text-[10px] font-mono text-graphite border-t border-sand pt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-quiet" />
              <span>Energy Average LAeq</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-moderate" />
              <span>Peak Lmax</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-ink border-b border-dotted" />
              <span>CPCB Statutory Baseline</span>
            </span>
          </div>
          <span>Brushing enables zoom</span>
        </div>
      </div>

      {/* Two Columns: Category Distribution (Horizontal Bars) + Location Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Distribution (Horizontal bars, NOT pie - as specified) */}
        <div className="lg:col-span-6 p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              AudioSet Source Attribution
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Environmental Sound Category Distribution
            </h2>
          </div>

          <div className="space-y-3 pt-1">
            {categoryDistribution.map((cat, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between items-baseline text-xs font-mono">
                  <span className="text-ink font-semibold">{cat.name}</span>
                  <span className="text-graphite tabular-nums">
                    {cat.events} events ({cat.pct}%)
                  </span>
                </div>
                <div className="h-2 w-full bg-sand overflow-hidden">
                  <div
                    className="h-full transition-all duration-300"
                    style={{ width: `${cat.pct * 2.5}%`, backgroundColor: cat.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-sand text-[10px] font-mono text-graphite">
            Horizontal representation avoids radial distortion inherent in circular pie charts.
          </div>
        </div>

        {/* Location Comparison Table */}
        <div className="lg:col-span-6 p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Metropolitan Comparative Audit
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Cross-Jurisdiction Sound Pressure Readings
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-sand text-[10px] text-graphite uppercase">
                  <th className="py-2 pr-2">Station Location</th>
                  <th className="py-2 text-right">Avg LAeq</th>
                  <th className="py-2 text-right">Peak Lmax</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {locationComparisons.map((loc, idx) => (
                  <tr key={idx} className="hover:bg-sand-light transition-colors">
                    <td className="py-2.5 text-ink font-medium">{loc.city}</td>
                    <td className="py-2.5 text-right font-bold text-ink tabular-nums">
                      {loc.avg} dB(A)
                    </td>
                    <td className="py-2.5 text-right text-graphite tabular-nums">
                      {loc.peak} dB(A)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 border-t border-sand text-[10px] font-mono text-graphite">
            Ranked by statutory exceedance severity. All sensors surveyed under IEC 61672 Class 1 protocol.
          </div>
        </div>
      </div>
    </div>
  );
};
