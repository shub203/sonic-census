import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  Clock, 
  Send, 
  CheckCircle2, 
  FileText, 
  ShieldAlert, 
  Volume2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { api } from '../../api';

export const CitizenComplaintPage = () => {
  const [complaints, setComplaints] = useState([
    {
      id: 'CPCB-NOISE-2026-8912',
      category: 'Late-Night Loudspeaker (Past 10 PM)',
      location: 'Block C, Vasant Kunj, New Delhi',
      timestamp: '2026-11-16 23:45',
      status: 'Under Review',
      isExceedance: true
    },
    {
      id: 'CPCB-NOISE-2026-7645',
      category: 'Illegal Night Construction',
      location: 'Indiranagar 100ft Road, Bengaluru',
      timestamp: '2026-11-14 02:15',
      status: 'Notice Issued',
      isExceedance: false
    }
  ]);

  useEffect(() => {
    api.getComplaints().then((rows) => {
      if (Array.isArray(rows) && rows.length > 0) {
        setComplaints(rows.map((r) => ({
          id: r.ticket_number || r.id,
          category: r.category,
          location: `${r.location}, ${r.city}`,
          timestamp: r.incident_time ? `${r.created_at?.slice(0, 10) || 'Today'} ${r.incident_time}` : (r.created_at?.slice(0, 16).replace('T', ' ') || 'Recent'),
          status: r.status || 'Submitted & Queued',
          isExceedance: Boolean(r.is_exceedance)
        })));
      }
    });
  }, []);

  const [form, setForm] = useState({
    category: 'Loudspeaker / DJ Past 10 PM',
    location: '',
    city: 'New Delhi',
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    zone: 'Residential'
  });

  const [submittedTicket, setSubmittedTicket] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const saved = await api.createComplaint(form);
    const newId = saved?.ticket_number || `CPCB-NOISE-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const newEntry = {
      id: newId,
      category: saved?.category || form.category,
      location: `${saved?.location || form.location}, ${saved?.city || form.city}`,
      timestamp: `Today, ${form.time}`,
      status: saved?.status || 'Submitted & Queued',
      isExceedance: true
    };

    setComplaints([newEntry, ...complaints]);
    setSubmittedTicket(newId);
    setForm({
      category: 'Loudspeaker / DJ Past 10 PM',
      location: '',
      city: 'New Delhi',
      time: new Date().toTimeString().slice(0, 5),
      description: '',
      zone: 'Residential'
    });
  };

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
            Statutory Public Grievance
          </span>
          <SimulatedBadge text="RULE 2000 AUDIT" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
          Lodge Noise Nuisance Grievance
        </h1>
        <p className="text-xs sm:text-sm text-graphite font-sans mt-1 max-w-2xl leading-relaxed">
          File an incident report under the Noise Pollution (Regulation and Control) Rules 2000 for verification by municipal environmental officers.
        </p>
      </div>

      {submittedTicket && (
        <div className="p-4 border border-sand-dark bg-paper-light flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-quiet flex-shrink-0" strokeWidth={1.5} />
            <div>
              <span className="font-mono font-bold text-xs text-ink block">
                Grievance Lodged Successfully
              </span>
              <span className="text-xs text-graphite font-mono">
                Tracking Ticket: <strong className="text-ink">{submittedTicket}</strong>
              </span>
            </div>
          </div>
          <button
            onClick={() => setSubmittedTicket(null)}
            className="text-xs font-mono text-ink underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form Column (7 cols) */}
        <div className="lg:col-span-7 p-6 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-3">
            <span className="text-[10px] font-mono uppercase text-graphite block">Form Form-IV</span>
            <h2 className="font-serif text-base font-bold text-ink">
              Incident Documentation
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Violation Classification
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
              >
                {[
                  'Loudspeaker / DJ Past 10 PM',
                  'Illegal Night Construction (22:00 - 06:00)',
                  'Continuous Commercial / Industrial Generator',
                  'Persistent Vehicular Horn Nuisance near Silence Zone',
                  'Public Event Exceeding Prescribed Decibels'
                ].map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">
                  Metropolitan Region
                </label>
                <select
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
                >
                  {['New Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Chennai', 'Other Urban Area'].map(city => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">
                  Zonal Category
                </label>
                <select
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
                >
                  <option value="Residential">Residential (55 Day / 45 Night)</option>
                  <option value="Silence">Silence Zone (50 Day / 40 Night)</option>
                  <option value="Commercial">Commercial (65 Day / 55 Night)</option>
                  <option value="Industrial">Industrial (75 Day / 70 Night)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Specific Landmark / Sector Address
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Near Community Center, Sector 14"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Incident Description & Context
              </label>
              <textarea
                rows={3}
                placeholder="Detail time elapsed, sound characteristics (bass vibrations, machinery, sirens), and immediate impact..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Submit Grievance to Pollution Control Cell</span>
            </button>
          </form>
        </div>

        {/* Existing Grievances Column (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 border border-sand bg-paper-light space-y-3">
            <div className="border-b border-sand pb-2 flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-ink">
                Recent Citizen Grievances
              </span>
              <SimulatedBadge />
            </div>

            <div className="space-y-2.5">
              {complaints.map((item) => (
                <div key={item.id} className="p-3 border border-sand bg-paper space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-ink">{item.id}</span>
                    <span className="px-1.5 py-0.5 border border-sand bg-sand-light text-graphite">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs font-serif font-semibold text-ink">
                    {item.category}
                  </div>
                  <div className="text-[11px] font-mono text-graphite">
                    {item.location} • {item.timestamp}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border border-sand bg-sand-light/50 text-[11px] font-mono text-graphite space-y-1">
            <span className="font-bold text-ink uppercase text-[10px] block">
              Legal Recourse (Rule 7, CPCB)
            </span>
            <p className="leading-relaxed">
              Any person aggrieved by noise levels exceeding prescribed standards by 10 dB(A) or more may make a complaint to the designated authority for prompt remedial action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};