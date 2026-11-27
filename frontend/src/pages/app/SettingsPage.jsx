import React, { useState } from 'react';
import { Settings, Save, CheckCircle2, User, Shield, Sliders } from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';

export const SettingsPage = () => {
  const [savedToast, setSavedToast] = useState(false);
  const defaultSettings = {
    officerName: 'Environmental Acoustic Officer',
    officerEmail: 'field.officer@cpcb.gov.in',
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

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-16 antialiased">
      {/* Header */}
      <div className="border-b border-sand pb-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Field Station Settings & Survey Units
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            Instrument Configuration, Jurisdictional Baselines & Acoustic Weighting Preferences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge />
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

      <form onSubmit={handleSave} className="space-y-6">
        {/* Officer Profile */}
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

        {/* Acoustic Units & Time Weighting */}
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
