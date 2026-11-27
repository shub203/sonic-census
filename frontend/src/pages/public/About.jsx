import React from 'react';
import { ScrollReveal } from '../../components/common/ScrollReveal';

export const About = ({ embedded = false }) => {
  return (
    <section
      id="about"
      className={`scroll-mt-16 relative ${embedded ? 'bg-paper-light/60 border-t border-sand py-20 px-4 sm:px-8 z-10' : 'py-12 md:py-16 px-4 sm:px-6 lg:px-8'}`}
    >
      <div className="max-w-4xl mx-auto space-y-10 antialiased">
        <ScrollReveal>
          <div className="border-b border-sand pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Institutional Monograph
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
              About Sonic Census
            </h2>
            <p className="text-xs sm:text-sm text-graphite font-sans mt-2 max-w-2xl leading-relaxed">
              Bridging the gap between raw physical sound level measurements and environmental source accountability.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-6 text-xs sm:text-sm text-graphite leading-relaxed font-sans">
          <ScrollReveal delay={40}>
            <div className="p-6 border border-sand bg-paper space-y-3">
              <h3 className="font-serif text-base font-bold text-ink">The Urban Sound Problem</h3>
              <p>
                In rapidly urbanizing centers across India, acoustic pollution is among the most pervasive yet least understood environmental stressors. Metropolitan areas routinely endure sound pressure levels exceeding statutory thresholds, contributing to cardiovascular stress, sleep disruption, and irreversible hearing loss.
              </p>
              <p>
                Conventional continuous noise monitoring stations measure only aggregate sound pressure levels. A continuous readout of 68 dB(A) provides zero insight into whether the disturbance stems from emergency ambulances, commercial generator exhausts, construction machinery, or automotive traffic. Without source attribution, municipal authorities cannot formulate actionable mitigation policies.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={70}>
            <div className="p-6 border border-sand bg-paper space-y-3">
              <h3 className="font-serif text-base font-bold text-ink">Our Solution Philosophy</h3>
              <p>
                Sonic Census combines artificial intelligence classification with calibrated acoustic measurements. By applying spectral DSP descriptors and convolutional neural architectures trained on millions of environmental audio patterns, our system disaggregates overlapping noise sources and vaults verifiable audio records.
              </p>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={100}>
            <div className="p-6 border border-sand bg-sand-light/60 space-y-2">
              <span className="font-mono text-[10px] uppercase text-ink font-bold block">
                Statutory Alignment & Legal Authority
              </span>
              <p className="text-xs">
                All limits, schedules, and period calculations within this platform strictly adhere to the Noise Pollution (Regulation and Control) Rules, 2000 framed under the Environment (Protection) Act, 1986. This software serves as an environmental monitoring and decision-support system for pollution control authorities, urban planners, and acoustic researchers.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
