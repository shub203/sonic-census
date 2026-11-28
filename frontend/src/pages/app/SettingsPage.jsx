import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle2, KeyRound, Shield, Activity, Database, AlertTriangle } from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { api, USE_REAL_BACKEND } from '../../api';
import { useAuth } from '../../context/AuthContext';

export const SettingsPage = () => {
  const { user } = useAuth();
  const [savedToast, setSavedToast] = useState(false);
  const defaultSettings = {
    officerName: user?.name || 'Environmental Acoustic Officer',
    officerEmail: user?.email || 'officer@soniccensus.ai',
    jurisdiction: 'Central Pollution Control Board (CPCB) India Rules 2000',
    unitType: 'dB(A) Leq (A-Weighted)',
    timeWeighting: 'Fast (125 ms)',
    diurnalCutoffDay: '06:00',
    diurnalCutoffNight: '22:00',
    autoArchiveDays: 90
  };
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sonic_census_settings');
      return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  });

  // Password rotation state
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwdStatus, setPwdStatus] = useState(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Admin governance state (storage stats, users, audit logs)
  const [storageStats, setStorageStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [adminError, setAdminError] = useState(null);

  useEffect(() => {
    if (!USE_REAL_BACKEND) return;
    Promise.all([
      api.getStorageStats().catch(() => null),
      api.listUsers().catch(() => []),
      api.getAuditLogs(25).catch(() => []),
    ]).then(([stats, userList, logs]) => {
      if (stats) setStorageStats(stats);
      setUsers(userList || []);
      setAuditLogs(logs || []);
    });
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    try {
      localStorage.setItem('sonic_census_settings', JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  const handleRotatePassword = async (e) => {
    e.preventDefault();
    setPwdStatus(null);
    if (pwdForm.newPassword.length < 8) {
      setPwdStatus({ ok: false, msg: 'New password must be at least 8 characters.' });
      return;
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdStatus({ ok: false, msg: 'New password confirmation does not match.' });
      return;
    }
    setPwdLoading(true);
    try {
      await api.changePassword(pwdForm.currentPassword, pwdForm.newPassword);
      setPwdStatus({ ok: true, msg: 'Account password rotated in PostgreSQL.' });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdStatus({ ok: false, msg: err?.response?.data?.detail || 'Password update failed.' });
    } finally {
      setPwdLoading(false);
    }
  };

  const handleRoleUpdate = async (userId, nextRole) => {
    setAdminError(null);
    try {
      const updated = await api.updateUserRole(userId, nextRole);
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      const freshLogs = await api.getAuditLogs(25).catch(() => auditLogs);
      setAuditLogs(freshLogs);
    } catch (err) {
      setAdminError(err?.response?.data?.detail || 'Failed to update user role.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Field Station Settings & Security Governance
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Instrument Configuration, Password Rotation, RBAC Roles & Audit Ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge text={USE_REAL_BACKEND ? 'PRODUCTION RBAC' : 'DEMO'} />
        </div>
      </div>

      {savedToast && (
        <div className="p-3 border border-ink bg-paper-light text-xs font-mono flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-quiet flex-shrink-0" strokeWidth={1.5} />
            <span className="text-ink font-semibold">Settings preferences saved to local station memory.</span>
          </div>
          <button onClick={() => setSavedToast(false)} className="text-graphite hover:text-ink text-xs">✕</button>
        </div>
      )}

      {/* Storage Quota Overview */}
      {USE_REAL_BACKEND && storageStats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 border border-sand bg-paper-light">
            <span className="text-[10px] text-graphite uppercase block">Vault Entries</span>
            <span className="text-lg font-bold text-ink tabular-nums">{storageStats.vault_entries}</span>
          </div>
          <div className="p-3.5 border border-sand bg-paper-light">
            <span className="text-[10px] text-graphite uppercase block">Quota Used</span>
            <span className="text-lg font-bold text-ink tabular-nums">{storageStats.vault_utilization_pct}%</span>
            <span className="text-[10px] text-graphite block">of {storageStats.vault_quota_mb} MB limit</span>
          </div>
          <div className="p-3.5 border border-sand bg-paper-light">
            <span className="text-[10px] text-graphite uppercase block">DB Reports</span>
            <span className="text-lg font-bold text-ink tabular-nums">{storageStats.persisted_reports}</span>
          </div>
          <div className="p-3.5 border border-sand bg-paper-light">
            <span className="text-[10px] text-graphite uppercase block">Environment</span>
            <span className="text-sm font-bold text-quiet uppercase">{storageStats.environment}</span>
          </div>
        </div>
      )}

      {/* Password Rotation */}
      {USE_REAL_BACKEND && (
        <form onSubmit={handleRotatePassword} className="p-5 border border-ink bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                Account Hardening
              </span>
              <h2 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <KeyRound className="w-4 h-4" strokeWidth={1.5} />
                <span>Rotate Active Password</span>
              </h2>
            </div>
            <span className="text-[10px] font-mono text-graphite">{user?.email}</span>
          </div>

          {pwdStatus && (
            <div className={`p-3 border text-xs font-mono flex items-center gap-2 ${pwdStatus.ok ? 'border-quiet text-quiet bg-quiet/5' : 'border-loud text-loud bg-loud/10'}`}>
              {pwdStatus.ok ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{pwdStatus.msg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Current Password</label>
              <input
                type="password"
                required
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">New Password (8+ chars)</label>
              <input
                type="password"
                required
                minLength={8}
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                minLength={8}
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pwdLoading}
              className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light disabled:opacity-50"
            >
              {pwdLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      )}

      {/* User Role Management */}
      {USE_REAL_BACKEND && users.length > 0 && (
        <div className="p-5 border border-sand bg-paper space-y-3">
          <div className="border-b border-sand pb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                Access Control
              </span>
              <h2 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <Shield className="w-4 h-4" strokeWidth={1.5} />
                <span>Registered Users & Role Assignment</span>
              </h2>
            </div>
          </div>
          {adminError && (
            <div className="p-2.5 border border-loud text-loud text-xs font-mono">{adminError}</div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-sand text-[10px] text-graphite uppercase">
                  <th className="py-2 pr-3">Name</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2 pr-3 text-ink font-semibold">{u.name}</td>
                    <td className="py-2 pr-3 text-graphite">{u.email}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={u.role}
                        disabled={u.id === user?.id}
                        onChange={(e) => handleRoleUpdate(u.id, e.target.value)}
                        className="px-2 py-1 border border-sand bg-paper-light text-ink text-xs disabled:opacity-60"
                      >
                        <option value="citizen">citizen</option>
                        <option value="analyst">analyst</option>
                        <option value="officer">officer</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Security Audit Log Ledger */}
      {USE_REAL_BACKEND && auditLogs.length > 0 && (
        <div className="p-5 border border-sand bg-paper space-y-3">
          <div className="border-b border-sand pb-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                Observability & Compliance Trail
              </span>
              <h2 className="font-serif text-base font-bold text-ink flex items-center gap-2">
                <Activity className="w-4 h-4" strokeWidth={1.5} />
                <span>Recent Security Audit Events</span>
              </h2>
            </div>
          </div>
          <div className="overflow-x-auto max-h-64 overflow-y-auto">
            <table className="w-full text-left text-[11px] font-mono">
              <thead>
                <tr className="border-b border-sand text-[10px] text-graphite uppercase">
                  <th className="py-1.5 pr-3">Timestamp</th>
                  <th className="py-1.5 pr-3">Action</th>
                  <th className="py-1.5 pr-3">Actor</th>
                  <th className="py-1.5 pr-3">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-1.5 pr-3 text-graphite">{(log.created_at || '').slice(0, 19).replace('T', ' ')}</td>
                    <td className="py-1.5 pr-3 text-ink font-semibold">{log.action}</td>
                    <td className="py-1.5 pr-3 text-graphite">{log.actor_email || log.actor_role}</td>
                    <td className="py-1.5 pr-3 text-graphite">{log.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Field Station Acoustic Units Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Field Operator Credentials
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Inspector Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Officer Name:</label>
              <input
                type="text"
                value={settings.officerName}
                onChange={(e) => setSettings({ ...settings, officerName: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Official Email:</label>
              <input
                type="email"
                value={settings.officerEmail}
                onChange={(e) => setSettings({ ...settings, officerEmail: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="p-5 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Measurement Calibration
            </span>
            <h2 className="font-serif text-base font-bold text-ink">
              Acoustic Standards & Calculation Units
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Frequency Weighting:</label>
              <select
                value={settings.unitType}
                onChange={(e) => setSettings({ ...settings, unitType: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="dB(A) Leq (A-Weighted)">IEC 61672 A-Weighting dB(A)</option>
                <option value="dB(C) Peak (C-Weighted)">IEC 61672 C-Weighting dB(C)</option>
                <option value="dB(Z) Linear">Linear dB(Z) Unweighted</option>
              </select>
            </div>

            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Time Weighting Constant:</label>
              <select
                value={settings.timeWeighting}
                onChange={(e) => setSettings({ ...settings, timeWeighting: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
              >
                <option value="Fast (125 ms)">Fast Integration (125 ms)</option>
                <option value="Slow (1000 ms)">Slow Integration (1000 ms)</option>
                <option value="Impulse (35 ms)">Impulse Integration (35 ms)</option>
              </select>
            </div>

            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Day Period Start (CPCB):</label>
              <input
                type="text"
                value={settings.diurnalCutoffDay}
                disabled
                className="w-full px-2.5 py-1.5 border border-sand bg-sand-light text-graphite cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-graphite text-[10px] uppercase mb-1">Night Period Start (CPCB):</label>
              <input
                type="text"
                value={settings.diurnalCutoffNight}
                disabled
                className="w-full px-2.5 py-1.5 border border-sand bg-sand-light text-graphite cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
