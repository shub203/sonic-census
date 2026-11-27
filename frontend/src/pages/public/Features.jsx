import React from 'react';
import { Link } from 'react-router-dom';
import { Mic2, ShieldCheck, MapPin, BarChart3, FileText, Database } from 'lucide-react';
import { ScrollReveal } from '../../components/common/ScrollReveal';

export const Features = ({ embedded = false }) => {
  const features = [
    {
      icon: <Mic2 className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: 'Hybrid DSP & PANNs Classification',
      desc: 'Identifies 10 primary environmental sound categories (Traffic, Construction, Emergency Siren, Human activity, Industrial, Nature, Aviation, etc.) with real-time confidence scoring.'
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: 'IEC 61672:2013 A-Weighting & LAeq',
      desc: 'Computes true logarithmic Equivalent Continuous Sound Pressure Levels (LAeq) using acoustic energy summation and distinguishes Class 1 monitors from uncalibrated phone clips.'
    },
    {
      icon: <MapPin className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: 'Muted Cartographic Survey Map',
      desc: 'Renders live metropolitan IoT stations across Delhi, Mumbai, Bengaluru, Hyderabad, and Chennai on desaturated OSM maps with color-coded SVG compliance dials.'
    },
    {
      icon: <BarChart3 className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: '24-Hour Diurnal Clock & CPCB Rules',
      desc: 'Polar diurnal visualizations and automated Day (06:00–22:00) / Night (22:00–06:00) audits across Industrial, Commercial, Residential, and Silence zones.'
    },
    {
      icon: <FileText className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: 'Statutory PDF, CSV & Grievance Portals',
      desc: 'Officers compile ReportLab PDF/CSV compliance certificates while citizens run local sound checks and submit persistent Form-IV grievance tickets.'
    },
    {
      icon: <Database className="w-4 h-4 text-ink" strokeWidth={1.5} />,
      title: 'Hashed SQLite Audio Vault (SHA-256)',
      desc: 'Every uploaded recording is fingerprinted with SHA-256 hashes, persisted inside the database blob vault, and exportable as verified audio clips or ZIP/JSON archives.'
    }
  ];

  return (
    <section
      id="features"
      className={`scroll-mt-16 relative ${embedded ? 'bg-paper-light/60 border-t border-sand py-20 px-4 sm:px-8 z-10' : 'py-12 md:py-16 px-4 sm:px-6 lg:px-8'}`}
    >
      <div className="max-w-4xl mx-auto space-y-10 antialiased">
        <ScrollReveal>
          <div className="border-b border-sand pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Platform Capabilities
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
              Technical Specifications & Features
            </h2>
            <p className="text-xs sm:text-sm text-graphite font-sans mt-2 max-w-2xl leading-relaxed">
              Comprehensive survey capabilities engineered for environmental officers, acoustic consultants, and citizens.
            </p>
          </div>
        </ScrollReveal>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((f, i) => (
            <ScrollReveal key={i} delay={Math.min((i % 2) * 80 + Math.floor(i / 2) * 40, 220)}>
              <div className="p-5 border border-sand bg-paper h-full space-y-2 hover:border-ink transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-ink">SPEC 0{i + 1}</span>
                  {f.icon}
                </div>
                <h3 className="font-serif text-base font-bold text-ink">{f.title}</h3>
                <p className="text-xs text-graphite font-sans leading-relaxed">{f.desc}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={80}>
          <div className="p-6 border border-sand bg-paper flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="font-serif font-bold text-sm text-ink block">Ready to evaluate field data?</span>
              <span className="text-xs text-graphite font-sans">Access the operational field station or test audio files.</span>
            </div>
            <Link
              to="/app/dashboard"
              className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors self-start sm:self-auto"
            >
              Open Field Station
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
