import React from 'react';
import { ScrollReveal } from '../../components/common/ScrollReveal';

export const Research = ({ embedded = false }) => {
  return (
    <section
      id="research"
      className={`scroll-mt-16 relative ${embedded ? 'bg-paper border-t border-sand py-20 px-4 sm:px-8 z-10' : 'py-12 md:py-16 px-4 sm:px-6 lg:px-8'}`}
    >
      <div className="max-w-4xl mx-auto space-y-10 antialiased">
        <ScrollReveal>
          <div className="border-b border-sand pb-4">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Acoustic Formulations & References
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
              Acoustic Mathematics & Research Foundations
            </h2>
            <p className="text-xs sm:text-sm text-graphite font-sans mt-2 max-w-2xl leading-relaxed">
              The electroacoustic equations, spectral filter curves, and neural network specifications underpinning Sonic Census.
            </p>
          </div>
        </ScrollReveal>

        <div className="space-y-8">
          {/* 1. Equivalent Continuous Sound Pressure Level (LAeq) */}
          <ScrollReveal delay={40}>
            <div className="p-6 border border-sand bg-paper-light space-y-4">
              <div className="border-b border-sand pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">Section 1.0</span>
                <h3 className="font-serif text-lg font-bold text-ink">Equivalent Continuous Sound Pressure Level (LAeq)</h3>
              </div>
              <p className="text-xs sm:text-sm text-graphite font-sans leading-relaxed">
                Under IEC 61672:2013, ambient noise fluctuating over measurement interval T is represented by the equivalent continuous sound level possessing the identical total acoustic energy:
              </p>

              <div className="p-4 border border-sand bg-paper font-mono text-center text-sm text-ink my-3">
                L_Aeq,T = 10 · log₁₀ [ (1 / T) · ∫₀ᵀ ( p_A(t) / p₀ )² dt ]  dB(A)
              </div>

              <p className="text-xs text-graphite leading-relaxed">
                Where <span className="font-mono text-ink">p_A(t)</span> is the instantaneous A-weighted sound pressure and <span className="font-mono text-ink">p₀ = 20 µPa</span> (2 × 10⁻⁵ N/m²) is the international reference threshold of human hearing at 1000 Hz.
              </p>
            </div>
          </ScrollReveal>

          {/* 2. Logarithmic vs Arithmetic Decibel Averaging */}
          <ScrollReveal delay={60}>
            <div className="p-6 border border-sand bg-paper-light space-y-4">
              <div className="border-b border-sand pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">Section 2.0</span>
                <h3 className="font-serif text-lg font-bold text-ink">Discrete Energy Logarithmic Averaging</h3>
              </div>
              <p className="text-xs sm:text-sm text-graphite font-sans leading-relaxed">
                Because decibels are logarithmic ratios, averaging decibels arithmetically produces gross physical errors (underestimating loud intrusive sound by up to 15 dB). For N discrete measurement intervals, the exact energy sum is:
              </p>

              <div className="p-4 border border-sand bg-paper font-mono text-center text-sm text-ink my-3">
                L_Aeq = 10 · log₁₀ [ (1 / N) · ∑ᵢ₌₁ᴺ 10^(L_i / 10) ]
              </div>

              <p className="text-xs text-graphite leading-relaxed">
                A 60 dB sound and an 80 dB sound do not average to 70 dB; their energetic mean is 77.0 dB(A). Our backend and client analytics strictly enforce this logarithmic integration.
              </p>
            </div>
          </ScrollReveal>

          {/* 3. IEC 61672-1:2013 A-Weighting Filter Equation */}
          <ScrollReveal delay={80}>
            <div className="p-6 border border-sand bg-paper-light space-y-4">
              <div className="border-b border-sand pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">Section 3.0</span>
                <h3 className="font-serif text-lg font-bold text-ink">A-Weighting Frequency Weighting Filter Curve</h3>
              </div>
              <p className="text-xs sm:text-sm text-graphite font-sans leading-relaxed">
                Human hearing is substantially less sensitive to low frequencies (&lt;500 Hz) and ultra-high frequencies (&gt;10 kHz). The statutory A-weighting frequency response A(f) in dB relative to 1000 Hz is mathematically defined as:
              </p>

              <div className="p-4 border border-sand bg-paper font-mono text-xs sm:text-sm text-ink overflow-x-auto my-3 text-center">
                R_A(f) = [ 12194² · f⁴ ] / [ (f² + 20.6²) · √((f² + 107.7²)(f² + 737.9²)) · (f² + 12194²) ]
              </div>

              <div className="p-3 border border-sand bg-paper font-mono text-center text-xs text-ink">
                A(f) = 20 · log₁₀[ R_A(f) ] + 2.00 dB
              </div>
            </div>
          </ScrollReveal>

          {/* 4. PANNs CNN14 Architecture */}
          <ScrollReveal delay={100}>
            <div className="p-6 border border-sand bg-paper-light space-y-4">
              <div className="border-b border-sand pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">Section 4.0</span>
                <h3 className="font-serif text-lg font-bold text-ink">PANNs CNN14 Deep Convolutional Classifier</h3>
              </div>
              <p className="text-xs sm:text-sm text-graphite font-sans leading-relaxed">
                Pretrained Audio Neural Networks (PANNs) CNN14 employs 6 dual-convolutional blocks with batch normalization, ReLU non-linearities, and 2×2 average pooling. The 2048-dimensional feature embedding is mapped via a dense layer and sigmoid activation for multi-label environmental audio tagging across AudioSet 527 classes.
              </p>
              <div className="text-[10px] font-mono text-graphite border-t border-sand pt-2">
                Reference: Kong et al., "PANNs: Large-Scale Pretrained Audio Neural Networks for Audio Pattern Recognition", IEEE/ACM TASLP 2020.
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
