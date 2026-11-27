import React from 'react';
import { Link } from 'react-router-dom';
import { ScrollReveal } from '../../components/common/ScrollReveal';

export const HowItWorks = ({ embedded = false }) => {
  const steps = [
    {
      num: '01',
      title: 'Acoustic Signal Acquisition & Decoding',
      subtitle: 'Audio Ingestion & Preprocessing',
      content: 'Environmental sound is captured through stationary precision sound level monitors or mobile field survey recordings. The audio stream is validated, decoded from WAV/MP3/FLAC formats, hashed via SHA-256 into SQLite DB, resampled to 32 kHz, and converted to monaural float arrays.'
    },
    {
      num: '02',
      title: 'Time-Frequency Mel-Filterbank Transformation',
      subtitle: 'Spectrogram Generation',
      content: 'Short-Time Fourier Transform (STFT) is computed using a 1024-sample Hanning window and 320-sample hop length. The resulting linear frequency spectrum is projected onto 64 log-spaced Mel filterbanks spanning 50 Hz to 14,000 Hz, approximating human auditory frequency sensitivity.'
    },
    {
      num: '03',
      title: 'PANNs CNN14 & DSP-v2 Inference',
      subtitle: 'Sound Event Classification',
      content: 'Multi-band spectral ratios, crest factor transients, pitch modulation, and 64-band log Mel-spectrograms classify overlapping urban sounds across 10 core AudioSet environmental categories with per-window confidence scoring.'
    },
    {
      num: '04',
      title: 'IEC 61672:2013 Acoustic Energy Integration',
      subtitle: 'Logarithmic Decibel Averaging',
      content: 'For calibrated hardware streams, instantaneous A-weighted Sound Pressure Levels are integrated logarithmically rather than arithmetically. Peak levels (Lmax), minimum levels (Lmin), and Equivalent Continuous Sound Pressure Levels (LAeq) are calculated according to international electroacoustic standards.'
    },
    {
      num: '05',
      title: 'Statutory CPCB Compliance Comparison',
      subtitle: 'The Noise Rules, 2000 Schedule Audit',
      content: 'Measured sound energy is evaluated against statutory Indian limits established by the Central Pollution Control Board. The rule engine applies diurnal day (06:00–22:00) and night (22:00–06:00) thresholds across Industrial (75/70 dB), Commercial (65/55 dB), Residential (55/45 dB), and Silence (50/40 dB) zones.'
    }
  ];

  return (
    <section
      id="how-it-works"
      className={`scroll-mt-16 relative ${embedded ? 'bg-paper border-t border-sand py-20 px-4 sm:px-8 z-10' : 'py-12 md:py-16 px-4 sm:px-6 lg:px-8'}`}
    >
      <div className="max-w-4xl mx-auto space-y-10 antialiased">
        <ScrollReveal>
          <div className="border-b border-sand pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Technical Survey Monograph
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
              How Sonic Census Works
            </h2>
            <p className="text-xs sm:text-sm text-graphite font-sans mt-2 max-w-2xl leading-relaxed">
              An engineering breakdown of the five-stage pipeline connecting raw microphone waveforms to statutory noise compliance audits.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-5">
          {steps.map((s, idx) => (
            <ScrollReveal key={s.num} delay={Math.min(idx * 55, 220)}>
              <div className="p-6 border border-sand bg-paper-light space-y-2 hover:border-ink transition-colors">
                <div className="flex items-center justify-between border-b border-sand pb-1.5 text-xs font-mono">
                  <span className="font-bold text-ink">STAGE {s.num}</span>
                  <span className="text-graphite uppercase">{s.subtitle}</span>
                </div>
                <h3 className="font-serif text-lg font-bold text-ink">{s.title}</h3>
                <p className="text-xs sm:text-sm text-graphite font-sans leading-relaxed">{s.content}</p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal delay={80}>
          <div className="pt-4 border-t border-sand flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <a
              href="#research"
              onClick={(e) => {
                if (embedded) {
                  e.preventDefault();
                  document.getElementById('research')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className="text-xs font-mono text-ink hover:underline"
            >
              Read Acoustic Math & Research Formulation →
            </a>
            <Link
              to="/app/analyze"
              className="px-4 py-2 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors self-start sm:self-auto"
            >
              Open Signal Analyzer
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};
