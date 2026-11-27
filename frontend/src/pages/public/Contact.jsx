import React, { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

export const Contact = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: '',
    organization: '',
    email: '',
    inquiryType: 'Municipal Monitoring Deployment',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 space-y-12 antialiased">
      <div className="border-b border-sand pb-4">
        <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
          Field Inquiries & Support
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-ink tracking-tight mt-1">
          Contact Field Engineering Cell
        </h1>
        <p className="text-xs sm:text-sm text-graphite font-sans mt-2 max-w-2xl leading-relaxed">
          Inquiries regarding stationary IoT microphone array deployments, API access, municipal soundscape partnerships, and academic research collaborations.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Form (7 cols) */}
        <div className="lg:col-span-7 p-6 border border-sand bg-paper-light space-y-4">
          {submitted ? (
            <div className="p-6 border border-sand bg-paper text-center space-y-2">
              <CheckCircle2 className="w-6 h-6 text-quiet mx-auto" strokeWidth={1.5} />
              <span className="font-serif font-bold text-base text-ink block">Inquiry Logged Successfully</span>
              <p className="text-xs text-graphite font-sans">
                Our environmental engineering unit will review your operational requirements and respond within 24 business hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Full Name & Rank:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Rajesh Verma"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Organization / Authority:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi Pollution Control Committee / IIT Delhi"
                  value={form.organization}
                  onChange={(e) => setForm({ ...form, organization: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Official Email Address:</label>
                <input
                  type="email"
                  required
                  placeholder="name@organization.gov.in"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Nature of Inquiry:</label>
                <select
                  value={form.inquiryType}
                  onChange={(e) => setForm({ ...form, inquiryType: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none"
                >
                  <option value="Municipal Monitoring Deployment">Municipal / Smart City Sensor Deployment</option>
                  <option value="API Integration">Backend API & IoT Telemetry Ingestion</option>
                  <option value="CPCB Regulatory Audit">Regulatory Compliance & Exceedance Auditing</option>
                  <option value="Academic Research Collaboration">Academic Acoustic Research Collaboration</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase text-graphite mb-1">Field Query & Technical Scope:</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail your monitoring area, expected number of stationary sensor nodes, and statutory requirements..."
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-sand bg-paper text-ink focus:border-ink focus:outline-none font-sans"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" strokeWidth={1.5} />
                <span>Submit Technical Query</span>
              </button>
            </form>
          )}
        </div>

        {/* Right Info Box (5 cols) */}
        <div className="lg:col-span-5 p-6 border border-sand bg-sand-light/50 space-y-4 font-mono text-xs">
          <div className="border-b border-sand pb-2">
            <span className="text-[10px] uppercase text-graphite block">Field Secretariat</span>
            <span className="font-serif font-bold text-sm text-ink">Acoustic Engineering Bureau</span>
          </div>

          <div className="space-y-2 text-graphite leading-relaxed">
            <div>
              <span className="font-bold text-ink block">Secretariat:</span>
              <span>Central Acoustic Cell, National Environmental Monitoring Network, New Delhi, India</span>
            </div>
            <div>
              <span className="font-bold text-ink block">Direct Telemetry Link:</span>
              <span className="text-ink">telemetry@soniccensus.ai</span>
            </div>
            <div>
              <span className="font-bold text-ink block">Technical Standards:</span>
              <span>IEC 61672:2013 Class 1 • ISO 1996-2 Description and measurement of environmental noise</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
