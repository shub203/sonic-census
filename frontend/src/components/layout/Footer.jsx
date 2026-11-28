import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="border-t border-sand bg-paper text-graphite pt-12 pb-24 md:pb-16 px-4 sm:px-6 lg:px-8 text-xs font-sans">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Col (5 cols) */}
        <div className="md:col-span-5 space-y-3">
          <span className="font-serif font-bold text-base text-ink block">
            Sonic Census
          </span>
          <p className="text-xs text-graphite max-w-sm leading-relaxed">
            A nationwide urban acoustic soundscape monitoring platform combining acoustic source classification with IEC 61672 sound level standards and CPCB regulatory compliance mapping.
          </p>
          <div className="text-[10px] font-mono text-graphite-light">
            Instrument Protocol: CPCB Rules 2000 (Schedule A–D)
          </div>
          <div className="pt-1 flex flex-wrap items-center gap-3 text-[10px] font-mono text-graphite">
            <span>© 2026 Sonic Census. Indian Environmental Standards.</span>
            <Link to="/privacy" className="underline hover:text-ink">Privacy Policy</Link>
            <Link to="/terms" className="underline hover:text-ink">Terms of Service</Link>
          </div>
        </div>

        {/* Links Col 1 (3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-ink font-semibold block">
            Public & Field Modules
          </span>
          <ul className="space-y-1.5 text-xs">
            <li><Link to="/app/check-noise" className="hover:text-ink">Citizen Sound Safety Check</Link></li>
            <li><Link to="/app/map" className="hover:text-ink">Metropolitan Sound Map</Link></li>
            <li><Link to="/app/complaint" className="hover:text-ink">File Noise Grievance</Link></li>
            <li><Link to="/app/guidelines" className="hover:text-ink">CPCB 2000 Guidelines</Link></li>
            <li><Link to="/contact" className="hover:text-ink">Contact Engineering Cell</Link></li>
            <li><Link to="/login" className="hover:text-ink">Officer / Citizen Portal Login</Link></li>
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
        </div>
      </div>
    </footer>
  );
};
