import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, FileText, ArrowLeft } from 'lucide-react';

export const PrivacyPage = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 font-sans text-ink antialiased">
    <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-graphite hover:text-ink">
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back to Sonic Census</span>
    </Link>
    <div className="border-b border-sand pb-4 flex items-center gap-3">
      <Shield className="w-5 h-5 text-ink" strokeWidth={1.5} />
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-graphite block">Legal & Data Governance</span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">Privacy Policy & Audio Data Handling</h1>
      </div>
    </div>
    <div className="space-y-4 text-sm text-graphite leading-relaxed">
      <p>
        <strong className="text-ink">1. Audio Processing & Vaulting:</strong> Audio clips uploaded via Signal Analyzer or Citizen Sound Safety Check are hashed using SHA-256 and stored in the encrypted PostgreSQL <code className="text-ink">audio_vault</code> solely for environmental decibel analysis, source classification, and regulatory audit traceability.
      </p>
      <p>
        <strong className="text-ink">2. Personal Data (DPDP Act Alignment):</strong> Account registration collects only your name, email address, and bcrypt-hashed password. Passwords are never stored in plaintext or logged. Citizen grievance submissions store location, zone classification, and complaint descriptions for municipal review.
      </p>
      <p>
        <strong className="text-ink">3. Audit Trails & Security:</strong> Administrative logins, role changes, vault exports, report generations, and IoT sensor key actions are recorded with timestamps and IP metadata for accountability.
      </p>
      <p>
        <strong className="text-ink">4. Data Retention & Deletion:</strong> Authorized officers may delete uploaded audio records via the dashboard, and free-tier evaluation environments may purge temporary artifacts upon service restarts.
      </p>
    </div>
  </div>
);

export const TermsPage = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 font-sans text-ink antialiased">
    <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-mono text-graphite hover:text-ink">
      <ArrowLeft className="w-3.5 h-3.5" />
      <span>Back to Sonic Census</span>
    </Link>
    <div className="border-b border-sand pb-4 flex items-center gap-3">
      <FileText className="w-5 h-5 text-ink" strokeWidth={1.5} />
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-graphite block">Regulatory & Usage Terms</span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">Terms of Service & Statutory Notice</h1>
      </div>
    </div>
    <div className="space-y-4 text-sm text-graphite leading-relaxed">
      <p>
        <strong className="text-ink">1. Decision-Support Tool Only:</strong> Acoustic classifications and estimated sound pressure levels from uncalibrated consumer microphones are advisory screening indicators only and do not constitute legally admissible evidence under the Noise Pollution (Regulation and Control) Rules, 2000.
      </p>
      <p>
        <strong className="text-ink">2. Calibrated Station Readings:</strong> Statutory enforcement requires calibrated IEC 61672 Class 1 sound level instrumentation operated by authorized pollution control officers.
      </p>
      <p>
        <strong className="text-ink">3. Acceptable Use:</strong> Users may not upload illegal audio, attempt automated abuse, bypass rate limits, or probe restricted administrative endpoints without authorization.
      </p>
    </div>
  </div>
);
