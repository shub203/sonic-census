import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  FileCheck,
  ShieldAlert,
} from 'lucide-react';
import { api, USE_REAL_BACKEND } from '../../api';

const STATUS_OPTIONS = [
  'Submitted & Queued',
  'Under Review',
  'Notice Issued',
  'Resolved',
  'Dismissed',
];

export const GrievancesPage = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [notesDraft, setNotesDraft] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [banner, setBanner] = useState(null);

  const loadComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getComplaints();
      setComplaints(rows || []);
      const initialNotes = {};
      (rows || []).forEach((r) => {
        initialNotes[r.id] = r.officer_notes || '';
      });
      setNotesDraft(initialNotes);
    } catch (err) {
      setBanner({ ok: false, msg: err?.response?.data?.detail || 'Failed to load citizen grievances.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadComplaints();
  }, [loadComplaints]);

  const handleStatusSave = async (row, nextStatus) => {
    setBusyId(row.id);
    setBanner(null);
    try {
      const updated = await api.updateComplaintStatus(row.id, nextStatus, notesDraft[row.id] || '');
      setComplaints((prev) => prev.map((c) => (c.id === row.id ? updated : c)));
      setBanner({ ok: true, msg: `Updated ${row.ticket_number} to "${updated.status}".` });
    } catch (err) {
      setBanner({ ok: false, msg: err?.response?.data?.detail || 'Failed to update grievance status.' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (row) => {
    setBusyId(row.id);
    setBanner(null);
    try {
      await api.deleteComplaint(row.id);
      setComplaints((prev) => prev.filter((c) => c.id !== row.id));
      setBanner({ ok: true, msg: `Deleted ticket ${row.ticket_number} from PostgreSQL.` });
    } catch (err) {
      setBanner({ ok: false, msg: err?.response?.data?.detail || 'Failed to delete grievance.' });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = complaints.filter((c) => statusFilter === 'All' || c.status === statusFilter);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 antialiased">
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Citizen Grievance Queue & Enforcement
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Officer Review Portal · CPCB Rule 7 Complaints Stored in PostgreSQL
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-sand bg-paper-light text-ink"
          >
            <option value="All">All Statuses ({complaints.length})</option>
            {STATUS_OPTIONS.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={loadComplaints}
            className="px-3 py-1.5 border border-sand hover:border-ink bg-paper text-ink inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {banner && (
        <div className={`p-3 border text-xs font-mono flex items-center gap-2 ${banner.ok ? 'border-quiet text-quiet bg-quiet/5' : 'border-loud text-loud bg-loud/10'}`}>
          {banner.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{banner.msg}</span>
        </div>
      )}

      {!USE_REAL_BACKEND ? (
        <div className="p-6 border border-sand bg-paper-light text-xs font-mono text-graphite">
          Officer grievance review is active when connected to the live backend.
        </div>
      ) : loading ? (
        <div className="p-6 border border-sand bg-paper-light text-xs font-mono text-graphite">
          Loading citizen grievances from PostgreSQL...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-6 border border-sand bg-paper-light text-xs font-mono text-graphite">
          No citizen grievances match this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((row) => (
            <div key={row.id} className="p-5 border border-sand bg-paper-light space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sand pb-3">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <ShieldAlert className="w-4 h-4 text-ink" strokeWidth={1.5} />
                  <span className="font-bold text-ink">{row.ticket_number}</span>
                  <span className="px-2 py-0.5 border border-sand bg-paper text-[10px] text-ink">
                    {row.zone_type}
                  </span>
                  <span className="text-[11px] text-graphite">
                    {row.city} · {(row.created_at || '').slice(0, 19).replace('T', ' ')}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => handleDelete(row)}
                  className="self-start sm:self-auto px-2.5 py-1 border border-loud/40 text-loud hover:bg-loud hover:text-paper text-[11px] font-mono inline-flex items-center gap-1 disabled:opacity-50"
                  title="Delete complaint record"
                >
                  <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  <span>Delete</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-6 space-y-1.5">
                  <div className="font-serif font-bold text-base text-ink">{row.category}</div>
                  <div className="text-xs font-mono text-ink">
                    Location: {row.location}, {row.city} (Time: {row.incident_time || 'N/A'})
                  </div>
                  {row.description && (
                    <p className="text-xs font-sans text-graphite leading-relaxed">{row.description}</p>
                  )}
                  {row.evidence_hash && (
                    <div className="text-[11px] font-mono text-quiet flex items-center gap-1 pt-1">
                      <FileCheck className="w-3.5 h-3.5" />
                      <span>Evidence Audio SHA-256: {row.evidence_hash}</span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-6 space-y-2 text-xs font-mono">
                  <label className="block text-[10px] uppercase text-graphite">Officer Review Notes</label>
                  <input
                    type="text"
                    value={notesDraft[row.id] ?? ''}
                    onChange={(e) => setNotesDraft({ ...notesDraft, [row.id]: e.target.value })}
                    placeholder="Inspection outcome, notice reference, or action taken..."
                    className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink outline-none"
                  />
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={row.status}
                      disabled={busyId === row.id}
                      onChange={(e) => handleStatusSave(row, e.target.value)}
                      className="px-2.5 py-1.5 border border-ink bg-paper text-ink font-semibold"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => handleStatusSave(row, row.status)}
                      className="px-3 py-1.5 border border-ink bg-ink text-paper uppercase hover:bg-ink-light disabled:opacity-50"
                    >
                      {busyId === row.id ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
