# Sonic Census — Frontend Field Instrument & Acoustic Soundscape Mapper

An environmental acoustic monitoring platform engineered to classify urban sound sources using deep learning (PANNs CNN14) and map sound pressure levels against Indian Central Pollution Control Board (CPCB) Noise Rules, 2000.

The design strictly follows a **field instrument / printed survey map** aesthetic (sound-level meter, field notebook, cartography), rather than a generic SaaS or "AI" dashboard.

---

## 1. Design Tokens & Visual Architecture

### Color Palette
- **Paper** (`#F3EFE6`): Primary light survey map background.
- **Ink** (`#14181B`): Primary body text, high-contrast headings, hairline outlines.
- **Graphite** (`#4A5157`): Metadata, axis labels, explanatory subtext.
- **Sand** (`#D9D3C4`): 1px hairline borders, dividers, subtle grid markings.
- **Instrument** (`#0F1315`): Dark canvas surface used **exclusively** inside instrument screens (waveforms, spectrograms, real-time audio monitors).
- **Noise Scale** (Universal across all gauges, markers, tags, and charts):
  - **Quiet** (`#2F6F63`): Deep teal-green (within safe residential thresholds).
  - **Moderate** (`#E9A23B`): Amber (elevated commercial/urban sound).
  - **Loud** (`#E4572E`): Vermilion. **Used strictly for loud readings or statutory exceedances, never as a decorative accent.**

### Typography
- **Headings & Monograph Titles:** `Fraunces` (Google Serif) for an authentic field report look.
- **UI & Prose:** `IBM Plex Sans` for legibility.
- **Readouts & Telemetry:** `IBM Plex Mono` with `font-variant-numeric: tabular-nums` to prevent numeric jitter during updates.

### Strict Visual Rules
- Page stays paper-light; dark surfaces are constrained to instrument displays.
- 1px hairline borders and generous spacing in place of drop shadows.
- Maximum border radius of 2–4px (`rounded-sm` or `rounded-none`).
- Thin line icons only (`lucide-react`, `strokeWidth={1.5}`). No emojis.
- All simulated data carries a distinct uppercase monospace `[SIMULATED]` tag.

---

## 2. Platform Routes & Role-Based Access

The platform provides dedicated public pages and separated role-based portals for **CPCB Environmental Officers / Administrators** and **Public Citizens**.

### Public Handbook & Survey Pages
- `/` — **Landing Page**: Asymmetric hero, 4-sample Web Audio API synthesis strip (Traffic, Drilling, Siren, Birds) with live Mel-spectrogram canvas and animated confidence bars, fixed scroll-linked dB ruler (30 to 110 dB with 55 Day / 45 Night ticks), 5-stage pipeline, and an honest "What this does NOT do" trust section.
- `/how-it-works` — 5-stage electroacoustic pipeline monograph (Acquisition → Mel-Filterbank → PANNs CNN14 → IEC 61672 $L_{Aeq}$ → CPCB Audit).
- `/features` — Technical capabilities and specifications.
- `/research` — Full acoustic formulations ($L_{Aeq}$ integration, logarithmic discrete energy averaging, A-weighting frequency curve, AudioSet taxonomy).
- `/about` — Environmental sound problem monograph and statutory authority.
- `/contact` — Field engineering inquiry form.
- `/login` — Access Gateway with 1-Click quick role switches (Officer / Admin vs Public Citizen) and credentialed authentication.

### CPCB Officer & Administrator Portal (`/app`)
- `/app/dashboard` — Metric strips, 24-hour circular polar diurnal noise clock with hover inspection, Recharts trend area chart with brushing, ruled exceedance list, mini survey map preview.
- `/app/analyze` — Audio dropzone (WAV/MP3/FLAC, 25MB, 60s), client-side decoding, synchronous waveform & Mel-spectrogram sharing one scrubber and playhead, spacebar play/pause, staged job tracker, detection chips with region highlighting and segment playback, hatched uncalibrated state.
- `/app/map` — Leaflet cartographic map with muted desaturated tiles (`grayscale(85%) contrast(105%) sepia(15%)`), custom SVG dial markers, 24-hr time slider, day/night toggle, right-hand sensor telemetry drawer.
- `/app/compliance` — Interactive CPCB limit evaluator, zone/period selector, sliding limit marker gauge, ruled assessment log.
- `/app/analytics` — Diurnal trend area chart with brush selector, horizontal AudioSet category distribution bars, inter-station comparison table.
- `/app/reports` — Statutory audit certificate generator, live document preview, PDF/CSV downloads with SHA-256 integrity hashes.
- `/app/sensors` — Stationary IoT microphone registry, calibration audit dates, hardware model specifications, "Add Sensor" modal.
- `/app/settings` — Field instrument profile, acoustic weighting (A/C/Z), integration time constants (Fast/Slow/Impulse).

### Public Citizen Portal
- `/app/citizen` — Citizen comfort score, neighborhood ambient levels, plain-language residential decibel standards, direct quick-action links.
- `/app/check-noise` — Consumer microphone upload screening with PANNs neural classification and non-calibrated advisory.
- `/app/complaint` — Statutory noise nuisance grievance filing under Rule 7 of Noise Rules 2000 with official ticket generation.
- `/app/guidelines` — Indian Environmental Standards (Schedule A–D) ambient noise table, nocturnal loudspeaker restriction details, and hearing health safety tips.

---

## 3. Switching from Mock to Real FastAPI Backend

The frontend contains a full API abstraction layer in `src/api/` that mirrors the future FastAPI endpoints:
- `POST /audio/uploads`
- `GET /audio/jobs/{id}`
- `GET /audio/jobs/{id}/results`
- `GET /dashboard/summary`
- `GET /map/sensors`
- `GET /analytics/trends`
- `GET /compliance/rules`
- `POST /compliance/check`
- `POST /reports/generate`

### One-Line Toggle to Connect Backend:
In `src/api/index.js` (line 27):
```javascript
// Toggle between mock field simulation and real FastAPI backend:
export const USE_REAL_BACKEND = true; // or set VITE_USE_REAL_BACKEND=true in .env
```
Or set in your `.env` / `.env.local` file:
```env
VITE_USE_REAL_BACKEND=true
VITE_API_URL=http://localhost:8000/api/v1
```

When `USE_REAL_BACKEND = false`, the in-memory state machine simulates realistic network latencies, timed job stage progressions (`Queued` → `Decoding` → `Resampling` → `Model inference` → `Category mapping` → `Completed`), and returns calibrated CPCB survey mock data.

---

## 4. Development & Build Commands

### Start Development Server
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

### Production Build
```bash
cd frontend
npm run build
# Compiles into frontend/dist with 0 warnings or errors
```
