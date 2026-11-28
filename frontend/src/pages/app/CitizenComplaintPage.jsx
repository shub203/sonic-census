import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Send,
  CheckCircle2,
  Search,
  ShieldCheck,
  Clock,
  FileCheck,
} from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { api, USE_REAL_BACKEND } from '../../api';

const MY_TICKETS_KEY = 'sonic_my_complaint_tickets';

function loadSavedTickets() {
  try {
    const parsed = JSON.parse(localStorage.getItem(MY_TICKETS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const CitizenComplaintPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const [form, setForm] = useState({
    category: 'Loudspeaker / DJ Past 10 PM',
    location: '',
    city: 'New Delhi',
    time: new Date().toTimeString().slice(0, 5),
    description: '',
    zone: 'Residential',
    evidence_hash: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submittedTicket, setSubmittedTicket] = useState(null);

  const [trackInput, setTrackInput] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState(null);
  const [tracking, setTracking] = useState(false);

  const mapComplaintRow = (r) => ({
    id: r.ticket_number || r.id,
    category: r.category,
    location: r.location ? `${r.location}, ${r.city}` : r.city,
    timestamp: r.incident_time
      ? `${r.created_at?.slice(0, 10) || 'Today'} ${r.incident_time}`
      : (r.created_at?.slice(0, 16).replace('T', ' ') || 'Recent'),
    status: r.status || 'Submitted & Queued',
    isExceedance: Boolean(r.is_exceedance),
    evidenceHash: r.evidence_hash || null,
    officerNotes: r.officer_notes || null,
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoadingList(true);
      try {
        const ownRows = await api.getComplaints();
        const merged = new Map();
        (ownRows || []).forEach((r) => {
          const item = mapComplaintRow(r);
          merged.set(item.id, item);
        });

        // Also hydrate tickets submitted in this browser session (when unauthenticated)
        const savedTickets = loadSavedTickets().slice(0, 10);
        if (USE_REAL_BACKEND && savedTickets.length > 0) {
          const tracked = await Promise.all(
            savedTickets.map((t) => api.trackComplaint(t).catch(() => null))
          );
          tracked.filter(Boolean).forEach((r) => {
            if (!merged.has(r.ticket_number)) {
              merged.set(r.ticket_number, mapComplaintRow(r));
            }
          });
        }
        if (active) setComplaints(Array.from(merged.values()));
      } finally {
        if (active) setLoadingList(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        evidence_hash: form.evidence_hash.trim() || undefined,
      };
      const saved = await api.createComplaint(payload);
      const ticket = saved?.ticket_number || `CPCB-NOISE-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      const existingTickets = loadSavedTickets();
      const nextTickets = [ticket, ...existingTickets.filter((t) => t !== ticket)].slice(0, 20);
      localStorage.setItem(MY_TICKETS_KEY, JSON.stringify(nextTickets));

      const newEntry = mapComplaintRow({
        ...saved,
        ticket_number: ticket,
        location: saved?.location || form.location,
        city: saved?.city || form.city,
        incident_time: saved?.incident_time || form.time,
      });

      setComplaints((prev) => [newEntry, ...prev.filter((c) => c.id !== ticket)]);
      setSubmittedTicket(ticket);
      setForm({
        category: 'Loudspeaker / DJ Past 10 PM',
        location: '',
        city: 'New Delhi',
        time: new Date().toTimeString().slice(0, 5),
        description: '',
        zone: 'Residential',
        evidence_hash: '',
      });
    } catch (err) {
      setSubmitError(err?.response?.data?.detail || err?.message || 'Unable to lodge grievance. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!trackInput.trim()) return;
    setTrackError(null);
    setTrackResult(null);
    setTracking(true);
    try {
      const res = await api.trackComplaint(trackInput);
      if (res) {
        setTrackResult(mapComplaintRow(res));
      } else {
        setTrackError('Ticket tracking requires backend connection.');
      }
    } catch (err) {
      setTrackError(err?.response?.data?.detail || 'Ticket not found.');
    } finally {
      setTracking(false);
    }
  };

  return (
    <div className="space-y-8 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
            Statutory Public Grievance
          </span>
          {USE_REAL_BACKEND ? (
            <span className="text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border border-quiet text-quiet">
              RULE 2000 · POSTGRESQL
            </span>
          ) : (
            <SimulatedBadge text="RULE 2000 AUDIT" />
          )}
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
          Lodge Noise Nuisance Grievance
        </h1>
        <p className="text-xs sm:text-sm text-graphite font-sans mt-1 max-w-2xl leading-relaxed">
          File an incident report under the Noise Pollution (Regulation and Control) Rules 2000. Submissions are stored securely with private street addresses visible only to authorised officers and your active session.
        </p>
      </div>

      {submitError && (
        <div className="p-4 border border-loud bg-loud/10 text-loud flex items-center gap-3 text-xs font-mono">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
          <span>{submitError}</span>
        </div>
      )}

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
            <span className="text-[10px] font-mono uppercase text-graphite block">Form IV · Rule 7</span>
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  <span>Incident Time (Local)</span>
                </label>
                <input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Specific Landmark / Sector Address
              </label>
              <input
                type="text"
                required
                minLength={2}
                placeholder="e.g. Near Community Center, Sector 14"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full p-2 border border-sand bg-paper text-ink font-mono text-xs focus:border-ink outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase text-graphite mb-1">
                Optional SHA-256 Audio Evidence Hash (from Check Noise)
              </label>
              <input
                type="text"
                maxLength={64}
                placeholder="Paste 64-char SHA-256 hash receipt if you screened an audio clip"
                value={form.evidence_hash}
                onChange={(e) => setForm({ ...form, evidence_hash: e.target.value })}
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
              disabled={submitting}
              className="w-full py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>{submitting ? 'Submitting Grievance...' : 'Submit Grievance to Pollution Control Cell'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: Ticket Lookup + My Complaints (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Public Redacted Ticket Tracker */}
          <div className="p-5 border border-sand bg-paper-light space-y-3">
            <div className="border-b border-sand pb-2 flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Track Ticket Status</span>
              </span>
            </div>
            <form onSubmit={handleTrackSearch} className="flex gap-2 text-xs font-mono">
              <input
                type="text"
                placeholder="CPCB-NOISE-2026-..."
                value={trackInput}
                onChange={(e) => setTrackInput(e.target.value)}
                className="flex-1 px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink outline-none"
              />
              <button
                type="submit"
                disabled={tracking}
                className="px-3 py-1.5 border border-ink bg-ink text-paper uppercase disabled:opacity-50"
              >
                {tracking ? '...' : 'Track'}
              </button>
            </form>
            {trackError && <div className="text-[11px] font-mono text-loud">{trackError}</div>}
            {trackResult && (
              <div className="p-3 border border-ink bg-paper space-y-1 text-xs font-mono">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-ink">{trackResult.id}</span>
                  <span className="px-1.5 py-0.5 border border-sand bg-sand-light text-ink">{trackResult.status}</span>
                </div>
                <div className="font-serif font-semibold text-ink">{trackResult.category}</div>
                <div className="text-[11px] text-graphite">{trackResult.location} • {trackResult.timestamp}</div>
                {trackResult.officerNotes && (
                  <div className="text-[11px] text-quiet pt-1 border-t border-sand/60">
                    Officer Note: {trackResult.officerNotes}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Scoped Session / Account Grievances */}
          <div className="p-5 border border-sand bg-paper-light space-y-3">
            <div className="border-b border-sand pb-2 flex items-center justify-between">
              <span className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Your Tracked Grievances</span>
              </span>
              <span className="text-[10px] font-mono text-graphite uppercase">Privacy Scoped</span>
            </div>

            <div className="space-y-2.5">
              {loadingList ? (
                <div className="text-[11px] font-mono text-graphite">Loading your tracked tickets...</div>
              ) : complaints.length === 0 ? (
                <div className="text-[11px] font-mono text-graphite">
                  No tickets filed in this account or browser session yet. Public listings are hidden to protect reporter privacy.
                </div>
              ) : (
                complaints.map((item) => (
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
                    {item.evidenceHash && (
                      <div className="text-[10px] font-mono text-quiet flex items-center gap-1">
                        <FileCheck className="w-3 h-3" />
                        <span>Audio SHA-256: {item.evidenceHash.slice(0, 16)}…</span>
                      </div>
                    )}
                    {item.officerNotes && (
                      <div className="text-[11px] font-mono text-ink pt-1 border-t border-sand/60">
                        Officer Review: {item.officerNotes}
                      </div>
                    )}
                  </div>
                ))
              )}
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
