import React from 'react';
import { 
  ShieldCheck, 
  HeartHandshake, 
  HelpCircle, 
  Volume2, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen,
  Scale
} from 'lucide-react';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';

export const CitizenGuidelinesPage = () => {
  return (
    <div className="space-y-8 antialiased max-w-5xl">
      {/* Header */}
      <div className="border-b border-sand pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
            Statutory Public Notice & Rights
          </span>
          <SimulatedBadge text="SCHEDULE A–D" />
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink tracking-tight mt-1">
          Noise Pollution (Regulation & Control) Rules 2000
        </h1>
        <p className="text-xs sm:text-sm text-graphite font-sans mt-1 max-w-2xl leading-relaxed">
          Statutory ambient air quality standards in respect of noise framed under the Environment (Protection) Act, 1986.
        </p>
      </div>

      {/* CPCB Statutory Table */}
      <div className="border border-sand bg-paper-light space-y-3">
        <div className="p-4 border-b border-sand flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-ink" strokeWidth={1.5} />
            <span className="font-serif font-bold text-sm text-ink">
              Central Pollution Control Board (CPCB) Ambient Noise Schedule
            </span>
          </div>
          <span className="text-[10px] font-mono text-graphite">Rule 3(1) and 4(1)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-sand bg-sand-light/50 text-[10px] font-mono uppercase text-graphite">
                <th className="py-2.5 px-4 font-semibold">Area Code</th>
                <th className="py-2.5 px-4 font-semibold">Category of Area / Zone</th>
                <th className="py-2.5 px-4 text-right font-semibold">Day (06:00 – 22:00)</th>
                <th className="py-2.5 px-4 text-right font-semibold">Night (22:00 – 06:00)</th>
                <th className="py-2.5 px-4 font-semibold">Scope & Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand text-xs font-mono">
              <tr className="hover:bg-sand-light/30">
                <td className="py-2.5 px-4 font-bold text-ink">Category A</td>
                <td className="py-2.5 px-4 font-sans font-medium text-ink">Industrial Area</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-ink">75 dB(A)</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-ink">70 dB(A)</td>
                <td className="py-2.5 px-4 font-sans text-graphite text-[11px]">Refineries, manufacturing zones, heavy engineering</td>
              </tr>
              <tr className="hover:bg-sand-light/30">
                <td className="py-2.5 px-4 font-bold text-ink">Category B</td>
                <td className="py-2.5 px-4 font-sans font-medium text-ink">Commercial Area</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-ink">65 dB(A)</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-ink">55 dB(A)</td>
                <td className="py-2.5 px-4 font-sans text-graphite text-[11px]">Markets, retail centers, business parks, restaurants</td>
              </tr>
              <tr className="hover:bg-sand-light/30 bg-sand-light/20">
                <td className="py-2.5 px-4 font-bold text-ink">Category C</td>
                <td className="py-2.5 px-4 font-sans font-semibold text-ink">Residential Area</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-quiet">55 dB(A)</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-quiet">45 dB(A)</td>
                <td className="py-2.5 px-4 font-sans text-graphite text-[11px]">Apartments, housing societies, residential suburbs</td>
              </tr>
              <tr className="hover:bg-sand-light/30">
                <td className="py-2.5 px-4 font-bold text-ink">Category D</td>
                <td className="py-2.5 px-4 font-sans font-medium text-ink">Silence Zone</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-quiet">50 dB(A)</td>
                <td className="py-2.5 px-4 text-right tabular-nums font-bold text-quiet">40 dB(A)</td>
                <td className="py-2.5 px-4 font-sans text-graphite text-[11px]">100m perimeter around hospitals, schools, courts</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Citizen Rights & Hearing Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Citizen Rights */}
        <div className="p-6 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-ink" strokeWidth={1.5} />
            <h2 className="font-serif text-sm font-bold text-ink">
              Statutory Citizen Rights
            </h2>
          </div>
          <ul className="space-y-3 text-xs text-graphite font-sans">
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">1.</span>
              <span>
                <strong className="text-ink">Nocturnal Loudspeaker Restriction:</strong> Under Rule 5(1), loudspeakers and public address systems are prohibited between 10:00 PM and 06:00 AM except in closed auditoriums or with explicit district magistrate permission.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">2.</span>
              <span>
                <strong className="text-ink">Silence Zone Protection:</strong> Honking, bursting firecrackers, or playing instruments within 100 meters of hospitals, nursing homes, and educational institutions is illegal.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">3.</span>
              <span>
                <strong className="text-ink">Formal Complaint Authority:</strong> Under Rule 7, any citizen aggrieved by persistent noise exceeding standards by 10 dB(A) or more has statutory standing to petition the local authority.
              </span>
            </li>
          </ul>
        </div>

        {/* Hearing Health Tips */}
        <div className="p-6 border border-sand bg-paper-light space-y-4">
          <div className="border-b border-sand pb-2 flex items-center gap-2">
            <HeartHandshake className="w-4 h-4 text-ink" strokeWidth={1.5} />
            <h2 className="font-serif text-sm font-bold text-ink">
              Auditory Health & Sleep Protection
            </h2>
          </div>
          <ul className="space-y-3 text-xs text-graphite font-sans">
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">1.</span>
              <span>
                <strong className="text-ink">The 60/60 Protocol:</strong> When using personal headphones or earbuds, limit sound level to 60% volume for no longer than 60 consecutive minutes.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">2.</span>
              <span>
                <strong className="text-ink">REM Sleep Architecture:</strong> Environmental sound levels exceeding 45 dB(A) at night elevate cortisol levels and disrupt deep sleep stages, even without conscious awakening.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-mono text-ink font-bold text-[10px] mt-0.5">3.</span>
              <span>
                <strong className="text-ink">Acoustic Isolation:</strong> In areas exceeding 65 dB(A) during daytime, consider double-glazed windows and heavy drapes to attenuate low-frequency automotive rumble.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};