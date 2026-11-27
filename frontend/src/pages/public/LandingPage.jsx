import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ArrowRight, 
  Activity,
  Volume2,
  Shield,
  ShieldCheck,
  MapPin,
  BarChart2,
  FileText,
  ChevronDown,
  Book,
  X,
  CheckCircle2,
  Mic2,
  Lock
} from 'lucide-react';
import { AsciiPalpitationBackground } from '../../components/common/AsciiPalpitationBackground';
import { ScrollReveal } from '../../components/common/ScrollReveal';
import { HowItWorks } from './HowItWorks';
import { Features } from './Features';
import { Research } from './Research';
import { About } from './About';

// ── WALKTHROUGH / GUIDE OVERLAY MODAL ──
const GuideOverlay = ({ onClose }) => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: <Activity className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'Welcome to Sonic Census',
      desc: 'A nationwide urban acoustic monitoring platform that classifies environmental sounds, maps noise across cities, and checks compliance with Indian CPCB noise regulations.',
    },
    {
      icon: <Mic2 className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'Upload & Analyze Audio',
      desc: 'Go to Analyze Audio and upload a WAV, MP3, or FLAC recording. The AI engine (PANNs CNN14) will identify sound sources like traffic, construction, sirens, or nature within seconds.',
    },
    {
      icon: <MapPin className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'View the Sound Map',
      desc: 'The Survey Map shows real-time sensor readings across Indian cities — Delhi, Mumbai, Bengaluru, Hyderabad, and Chennai. Click any sensor to see its noise trend and compliance status.',
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'Check CPCB Compliance',
      desc: 'The Compliance Engine compares measured sound levels against Indian statutory limits (Day 55 dB / Night 45 dB for Residential). It instantly flags exceedances.',
    },
    {
      icon: <BarChart2 className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'Two Portals: Admin & Citizen',
      desc: 'Officers & Admins get full access — analytics, sensor registry, PDF/CSV audit reports. Citizens get a simplified portal to check local noise, file noise grievances, and read guidelines.',
    },
    {
      icon: <FileText className="w-8 h-8 text-quiet" strokeWidth={1.5} />,
      title: 'Generate Statutory Reports',
      desc: 'Officers can generate official compliance certificates in PDF or CSV format, complete with CPCB schedule references, calibration logs, and exceedance summaries.',
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(20,24,27,0.72)' }}>
      <div className="relative bg-paper border border-sand w-full max-w-lg shadow-2xl" style={{ borderRadius: 2 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-sand">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono uppercase tracking-widest text-graphite">
              Platform Walkthrough
            </span>
            <span className="text-[9px] font-mono text-graphite">
              {step + 1} / {steps.length}
            </span>
          </div>
          <button onClick={onClose} className="text-graphite hover:text-ink">
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 py-8 space-y-4 text-center">
          <div className="flex justify-center">{current.icon}</div>
          <h2 className="font-serif text-xl font-bold text-ink">{current.title}</h2>
          <p className="text-sm text-graphite font-sans leading-relaxed max-w-sm mx-auto">
            {current.desc}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pb-4">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-1.5 h-1.5 rounded-full transition-all ${i === step ? 'bg-ink w-4' : 'bg-sand-dark'}`}
            />
          ))}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-sand">
          <button
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
            className="text-xs font-mono text-graphite hover:text-ink disabled:opacity-30 transition-opacity"
          >
            ← Previous
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-1.5"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 border border-quiet bg-quiet text-paper text-xs font-mono uppercase tracking-wider hover:opacity-90 transition-opacity flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Got it</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── MAIN LANDING PAGE ──
export const LandingPage = () => {
  const [showGuide, setShowGuide] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const hashId = location.hash ? location.hash.replace('#', '') : '';
    if (!hashId) return undefined;
    const timer = setTimeout(() => {
      const target = document.getElementById(hashId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [location.hash]);

  return (
    <>
      {showGuide && <GuideOverlay onClose={() => setShowGuide(false)} />}

      <div className="relative min-h-screen bg-paper text-ink antialiased overflow-x-hidden flex flex-col animate-fadein">
        {/* Animated ASCII art palpitation background modeled on platform favicon */}
        <div className="absolute inset-x-0 top-0 h-[100vh] overflow-hidden pointer-events-none">
          <AsciiPalpitationBackground />
        </div>

        {/* ── HERO ── */}
        <section id="top" className="relative min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center text-center px-4 py-20 sm:py-28 z-10">
          <ScrollReveal className="flex flex-col items-center">
            {/* Logo mark */}
            <div className="mb-8 flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-graphite select-none bg-paper/80 backdrop-blur-sm px-3 py-1 border border-sand">
              <div className="w-4 h-4 border border-ink flex items-center justify-center">
                <Activity className="w-2.5 h-2.5 text-ink" strokeWidth={1.5} />
              </div>
              <span>Sonic Census</span>
              <span className="text-sand-dark">·</span>
              <span>Urban Acoustic Census Platform</span>
            </div>

            {/* Headline */}
            <h1
              className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold text-ink leading-tight tracking-tight max-w-3xl mb-6"
              style={{ letterSpacing: '-0.02em' }}
            >
              Understand what's
              <br />
              <span style={{ color: 'var(--quiet)' }}>making the noise.</span>
            </h1>

            <p className="font-sans text-base sm:text-lg text-graphite max-w-xl mb-10 leading-relaxed bg-paper/60 backdrop-blur-xs p-2">
              AI sound classification, real-time acoustic mapping, and statutory CPCB compliance — tailored for environmental officers and citizens alike.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link
                to="/login"
                className="px-6 py-3 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>Enter Platform</span>
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
              </Link>

              <button
                onClick={() => setShowGuide(true)}
                className="px-6 py-3 border border-sand bg-paper text-ink text-xs font-mono uppercase tracking-wider hover:border-ink transition-colors flex items-center gap-2 shadow-sm"
              >
                <Book className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Platform Guide</span>
              </button>
            </div>

            {/* Trust note */}
            <p className="text-[11px] font-mono text-graphite opacity-80">
              Noise Pollution (Regulation & Control) Rules, 2000 · Environment (Protection) Act, 1986
            </p>
          </ScrollReveal>

          {/* Clickable Scroll hint */}
          <button
            type="button"
            onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Scroll to explore platform sections"
          >
            <span className="text-[9px] font-mono uppercase tracking-wider text-graphite">Scroll</span>
            <ChevronDown className="w-4 h-4 text-graphite animate-bounce" strokeWidth={1.5} />
          </button>
        </section>

        {/* ── TWO-ROLE SPLIT ── */}
        <section id="portals" className="scroll-mt-16 relative bg-paper/95 border-t border-sand py-16 px-4 sm:px-8 z-10 backdrop-blur-sm">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center mb-10">
              <span className="text-[9px] font-mono uppercase tracking-widest text-graphite block mb-2">
                Role-Based Access
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
                Choose your portal
              </h2>
              <p className="text-xs text-graphite font-sans mt-2">
                Each portal provides tools tailored to your operational requirements.
              </p>
            </div>
          </ScrollReveal>

          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Admin Card */}
            <ScrollReveal delay={40}>
              <div className="p-8 border border-ink bg-paper h-full space-y-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center gap-2.5">
                  <Shield className="w-5 h-5 text-ink" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-graphite">
                    Admin & Officer Portal
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">CPCB Environmental Officer</h3>
                <p className="text-xs text-graphite font-sans">
                  For regulatory inspectors, acoustic analysts, and municipal authorities with statutory responsibilities.
                </p>
                <ul className="space-y-2 text-xs font-sans text-graphite pt-2">
                  {[
                    'Full audio analysis & multi-band spectrograms',
                    'Live sensor registry & calibration tracking',
                    'CPCB Schedule A–D compliance engine',
                    'Official PDF/CSV statutory audit certificates',
                    'Hashed SQLite audio vault & ZIP/JSON exports'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-quiet rounded-full flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2">
                  <Link
                    to="/login"
                    state={{ hint: 'officer' }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5" strokeWidth={1.5} />
                    <span>Officer Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            {/* Citizen Card */}
            <ScrollReveal delay={110}>
              <div className="p-8 border border-sand bg-paper h-full space-y-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-5 h-5 text-graphite" strokeWidth={1.5} />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-graphite">
                    Public Citizen Portal
                  </span>
                </div>
                <h3 className="font-serif text-xl font-bold text-ink">Public Citizen & Resident</h3>
                <p className="text-xs text-graphite font-sans">
                  For neighborhood residents wanting to assess local sound levels and protect their hearing health.
                </p>
                <ul className="space-y-2 text-xs font-sans text-graphite pt-2">
                  {[
                    'Check local noise levels via audio upload',
                    'Understand residential day/night dB limits',
                    'File official noise grievance tickets',
                    'Explore public metro soundscape map',
                    'Learn statutory noise rights under Rule 5'
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-sand-dark rounded-full flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2">
                  <Link
                    to="/login"
                    state={{ hint: 'citizen' }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 border border-sand bg-paper-light text-ink text-xs font-mono uppercase tracking-wider hover:border-ink transition-colors"
                  >
                    <span>Citizen Access</span>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>

        {/* ── EMBEDDED PUBLIC SECTIONS WITH FADE IN/OUT SCROLL ANIMATIONS ── */}
        <HowItWorks embedded={true} />
        <Features embedded={true} />
        <Research embedded={true} />
        <About embedded={true} />
      </div>
    </>
  );
};
