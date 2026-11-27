import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-sand bg-paper text-graphite py-12 px-4 sm:px-6 lg:px-8 text-xs font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Col (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          <span className="font-serif font-bold text-base text-ink block">
            Sonic Census
          </span>
          <p className="text-xs text-graphite max-w-sm leading-relaxed">
            A nationwide urban acoustic soundscape monitoring platform combining PANNs deep learning audio source classification with IEC 61672 sound level standards and CPCB regulatory compliance mapping.
          </p>
          <div className="text-[10px] font-mono text-graphite-light">
            Instrument Protocol: CPCB Rules 2000 (Schedule A–D)
          </div>
        </div>

        {/* Links Col 1 (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink font-semibold block">
            Field Modules
          </span>
          <ul className="space-y-1.5 text-xs">
            <li><Link to="/app/analyze" className="hover:text-ink">Signal Analyzer & PANNs</Link></li>
            <li><Link to="/app/map" className="hover:text-ink">Metropolitan Sound Map</Link></li>
            <li><Link to="/app/compliance" className="hover:text-ink">CPCB Compliance Engine</Link></li>
            <li><Link to="/app/analytics" className="hover:text-ink">Diurnal Analytics & Trends</Link></li>
            <li><Link to="/app/reports" className="hover:text-ink">Statutory Report Generator</Link></li>
          </ul>
        </div>

        {/* Links Col 2 (4 cols) */}
        <div className="md:col-span-4 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink font-semibold block">
            Technical Governance
          </span>
          <p className="text-[11px] text-graphite leading-relaxed">
            Statutory notice: Field readings and automated multi-label classifications provide environmental decision support. Statutory sanctions require physical verification by authorized pollution control inspectors.
          </p>
          <div className="pt-2 text-[10px] font-mono text-graphite">
            © 2026 Sonic Census. Indian Environmental Standards.
          </div>
        </div>
      </div>
    </footer>
  );
};
