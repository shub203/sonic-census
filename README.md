# Sonic Census — Urban Acoustic Soundscape & CPCB Compliance Platform

**Sonic Census** is a full-stack environmental acoustic intelligence and regulatory compliance platform. It pairs **IEC 61672-1 logarithmic A-weighted sound measurement** and **multi-label DSP / PANNs CNN14 audio classification** with India's **Central Pollution Control Board (CPCB) Noise Pollution (Regulation and Control) Rules, 2000**, backed by a **SHA-256 content-addressed database audio vault**, interactive metropolitan sensor maps, certified PDF/CSV statutory reporting, and dedicated Officer & Citizen portals.

- **Live Frontend (Netlify Demo Mode):** https://sonic-census.netlify.app/
- **Repository:** https://github.com/shub203/sonic-census

---

## Key Capabilities

1. **Hybrid Acoustic Classification (`SonicCensus-DSP-v2` + `PANNs CNN14` Ready)**
   - Windowed (`3.0 s`, `25%` overlap) sub-band FFT spectral ratios, crest factor transient analysis, spectral flatness, and FM sweep detection across 10 core AudioSet environmental classes: *Traffic, Construction, Human activity, Industrial, Nature, Weather, Water, Emergency, Aviation, and Other*.
   - `100.0%` top-1 classification accuracy across 7 benchmark fixtures at `8.6–11.7 ms` per clip (`evaluate_accuracy.py`).
   - Built-in PyTorch `Cnn14` (`64-band Log-Mel`, `32 kHz` resampling) architecture plus optional non-blocking Google Gemini multimodal screening (`use_gemini=true`).

2. **Calibrated IEC 61672:2013 Measurement Engine**
   - Digital bilinear A-weighting frequency response filter with `Fast (125 ms)` time integration.
   - True logarithmic acoustic energy summation ($L_{Aeq}$) and peak level ($L_{max}$).
   - Strict separation between calibrated Class 1 station telemetry and uncalibrated smartphone/consumer uploads.

3. **SHA-256 Hashed Audio Vault (`audio_vault`)**
   - Every uploaded audio recording (WAV, MP3, FLAC, OGG, M4A) is hashed via `SHA-256` (`file_hash`), fingerprinted alongside its audit payload (`entry_hash`), and persisted directly inside SQL as a binary BLOB (`audio_vault.audio_blob`).
   - One-click **Download Audio from DB** receipts on **Analyze Audio** and **Citizen Check Noise**, plus an Officer **Stored Audio Database & Hash Ledger** supporting `.ZIP` bundles (raw audio files keyed by SHA-256 + JSON/CSV manifests), Base64 JSON archives, and CSV hash ledgers.

4. **CPCB Noise Rules, 2000 Statutory Compliance Engine**
   - Automatic Day (`06:00–22:00`) and Night (`22:00–06:00`) evaluations across all 4 schedules:
     - **Industrial:** `75 dB(A)` Day / `70 dB(A)` Night
     - **Commercial:** `65 dB(A)` Day / `55 dB(A)` Night
     - **Residential:** `55 dB(A)` Day / `45 dB(A)` Night
     - **Silence Zone (100m):** `50 dB(A)` Day / `40 dB(A)` Night

5. **Dual Portals, Interactive Mapping & Statutory Reports**
   - **Officer Portal (`/app/dashboard`, `/app/analyze`, `/app/compliance`, `/app/analytics`, `/app/reports`, `/app/sensors`, `/app/settings`):** JWT RBAC-protected administrative controls, synchronized waveform & spectrogram scrubber, live metro telemetry simulator, 24-hour diurnal noise clock, and **ReportLab PDF** / **RFC CSV** audit downloads.
   - **Citizen Portal (`/app/citizen`, `/app/check-noise`, `/app/complaint`, `/app/guidelines`, `/app/map`):** Public sound screening, interactive Leaflet metropolitan sensor map (Delhi, Mumbai, Bengaluru, Hyderabad, Chennai), statutory guidelines, and SQLite/Postgres-persisted grievance ticket filing (`CPCB-NOISE-YYYY-XXXX`).
   - **Unified Public Landing Page (`/`):** Single-page survey presentation with smooth navbar anchor scrolling (`#how-it-works`, `#features`, `#research`, `#about`) and bidirectional viewport fade animations.

---

## Architecture & Tech Stack

| Layer | Technologies | Responsibilities |
|---|---|---|
| **Frontend** | React 19, Vite 5, Tailwind CSS, React Router v7, Leaflet, Recharts, Lucide | Public survey landing page, Citizen & Officer portals, interactive waveform/spectrogram UI, Audio Vault explorer |
| **Backend** | Python 3.11, FastAPI, Uvicorn, Pydantic v2, PyJWT, bcrypt | REST v1 APIs, Role-Based Access Control (RBAC), SHA-256 audio vaulting, ZIP/JSON/CSV archive exports |
| **Database** | SQLite WAL (local default) / PostgreSQL (`psycopg` v3) | Content-addressed `audio_vault` BLOBs, `audio_files`, sensors, measurements, sound events, compliance audits, reports, grievances |
| **DSP & ML** | SciPy, NumPy, SoundFile, Matplotlib, PyTorch (`Cnn14`) | A-weighting filter, `LAeq` integration, STFT spectrograms, sub-band crest DSP classification |
| **Reporting** | ReportLab, Python `csv` & `zipfile` | Official statutory PDF certificates, CSV series, and hashed database archives |

---

## Repository Structure

```text
sonic-census/
├── backend/
│   ├── app/
│   │   ├── main.py                      # FastAPI entrypoint, CORS, static mounts & lifespan seeding
│   │   ├── config.py                    # Pydantic settings (DATABASE_URL, JWT, upload limits)
│   │   ├── dependencies.py              # bcrypt hashing, JWT auth, Officer RBAC guard
│   │   ├── api/v1/                      # auth, audio (+ /vault, /vault/export, /download), dashboard, sensors, compliance, map, analytics, reports, complaints
│   │   ├── audio/                       # validation, decoding, IEC 61672 LAeq, waveform, spectrogram
│   │   ├── ml/                          # SonicCensus-DSP-v2 classifier, PANNs Cnn14 loader, 527-class mapping
│   │   ├── compliance/                  # CPCB Noise Rules 2000 schedule & rule engine
│   │   ├── database/                    # SQLAlchemy engine, WAL pragmas, idempotent hash migrations & ORM models
│   │   └── services/                    # AudioService (SHA-256 vault & exports), SensorService, ReportService, GeminiAudioService
│   ├── tests/
│   │   ├── test_core.py                 # IEC 61672 math, waveform, CPCB rules, taxonomy, JWT unit tests
│   │   └── test_api_integration.py      # ASGI RBAC, audio vault hashing, download & ZIP/JSON/CSV export tests
│   ├── evaluate_accuracy.py             # Automated classifier accuracy benchmark
│   ├── seed_data.py                     # DB init, legacy audio vault backfill & metro cluster seeding
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── public/_redirects                # Netlify SPA fallback rewrite rule
│   ├── src/
│   │   ├── api/index.js                 # Unified API client (real FastAPI + mock fallback & blob downloads)
│   │   ├── components/
│   │   │   ├── common/                  # AudioVaultPanel, AudioHashReceipt, ScrollReveal, Waveform, Spectrogram, DbGauge
│   │   │   └── layout/                  # Navbar (anchor tracking), Footer, AppLayout (Portal Switcher & Admin Guard)
│   │   ├── context/                     # AuthContext (JWT auth + role switcher), ThemeContext
│   │   ├── pages/
│   │   │   ├── public/                  # LandingPage (unified HowItWorks, Features, Research, About), Contact, LoginPage
│   │   │   └── app/                     # Dashboard, Analyze, Map, Compliance, Analytics, Reports, Sensors, Settings, Citizen pages
│   │   └── utils/wavEncoder.js          # Client WAV PCM encoder & test clip synthesizer
│   ├── vercel.json                      # Vercel SPA rewrite configuration
│   ├── package.json
│   └── vite.config.js
├── netlify.toml                         # Netlify frontend monorepo build config
├── sample_audio/                        # Test WAV clips (traffic, construction)
├── test_e2e.py                          # 7-stage live full-stack E2E verification script
├── start.bat / start.ps1                # Windows 1-click launchers
└── Sonic_Census_Presentation.pptx       # Project technical presentation deck
```

---

## Local Development Setup

### Prerequisites
- **Python 3.11+**
- **Node.js 20+** and **npm**

### 1. Backend Setup (`http://localhost:8000`)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- Interactive OpenAPI Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/api/v1/health`

### 2. Frontend Setup (`http://localhost:5173`)
```powershell
cd frontend
npm install
# Create frontend/.env with:
# VITE_API_URL=http://localhost:8000/api/v1
# VITE_USE_REAL_BACKEND=true
npm run dev -- --host 0.0.0.0 --port 5173
```

### Demo Credentials (Seeded on Startup)
- **Officer / Admin:** `officer@soniccensus.ai` / `admin123`
- **Analyst:** `analyst@soniccensus.ai` / `analyst123`
- **Citizen:** `citizen@soniccensus.ai` / `citizen123`

---

## Testing & Verification

```powershell
# Backend unit & ASGI integration tests (10/10 tests)
cd backend
.\.venv\Scripts\python.exe -m pytest -v

# Classifier benchmark (7/7 = 100% on SonicCensus-DSP-v2)
.\.venv\Scripts\python.exe evaluate_accuracy.py

# Frontend production bundle check
cd ..\frontend
npm run build
```

---

## Split Cloud Deployment (Frontend & Backend Separately)

### 1. Deploy Backend (`backend/`) + PostgreSQL
1. Use the included [render.yaml](render.yaml) Blueprint (one-click Render Web Service + managed PostgreSQL) or point **Railway** / **Fly.io** to **Root Directory:** `backend` using [backend/Dockerfile](backend/Dockerfile) (`libsndfile1` + CPU-only PyTorch + dynamic `$PORT`).
2. `postgres://` and `postgresql://` connection strings automatically normalize to `postgresql+psycopg://` on startup, and CORS allows `https://sonic-census.netlify.app` + preview domains cleanly.
3. Required Environment Variables:
   - `DATABASE_URL` = *(injected automatically by Render Blueprint / Railway Postgres)*
   - `SECRET_KEY` = *(auto-generated by Render Blueprint or 32+ char random string)*
   - `FRONTEND_ORIGIN` = `https://sonic-census.netlify.app`
   - `DEVICE` = `cpu`

### 2. Deploy Frontend (`frontend/`) on Netlify or Vercel
1. Connect this repository with **Root Directory:** `frontend`, **Build Command:** `npm run build`, **Publish Directory:** `dist` (pre-configured via root [netlify.toml](netlify.toml), [frontend/public/_redirects](frontend/public/_redirects), and [frontend/vercel.json](frontend/vercel.json)).
2. Set Vite build environment variables:
   - Live API Mode: `VITE_USE_REAL_BACKEND=true` and `VITE_API_URL=https://<your-backend-domain>/api/v1`
   - Demo Showcase Mode (no live backend required): `VITE_USE_REAL_BACKEND=false`

---

## Regulatory & Calibration Notice
Automated audio classification and acoustic estimates from uncalibrated devices are provided strictly as environmental screening and decision-support tools. Legal enforcement under India's **Noise Pollution (Regulation and Control) Rules, 2000** requires calibrated Class 1 or Class 2 sound level meter inspection by authorized pollution control officers.
