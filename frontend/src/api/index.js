/**
 * Sonic Census — API Client Layer
 * Mirrors future FastAPI backend endpoints:
 *   POST /audio/uploads
 *   GET  /audio/jobs/{id}
 *   GET  /audio/jobs/{id}/results
 *   GET  /dashboard/summary
 *   GET  /map/sensors
 *   GET  /analytics/trends
 *   GET  /compliance/rules
 *   POST /compliance/check
 *   POST /reports/generate
 *
 * SWAPPING IN THE REAL FASTAPI BACKEND:
 * Set USE_REAL_BACKEND = true below (or VITE_USE_REAL_BACKEND=true in .env).
 */

import axios from 'axios';
import {
  CPCB_RULES,
  MOCK_SENSORS,
  MOCK_DASHBOARD_SUMMARY,
  MOCK_TRENDS,
  MOCK_REPORTS
} from './mockData';

export const USE_REAL_BACKEND = import.meta.env.VITE_USE_REAL_BACKEND === 'true';
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/v1\/?$/, '');

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Attach JWT token if present
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('noise_auth_token');
  if (token && token !== 'demo-token') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// In-memory mock jobs state machine
const activeJobs = new Map();

/**
 * Helper to simulate realistic network delay
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function extractFilenameFromDisposition(disposition, fallbackName) {
  if (!disposition) return fallbackName;
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)/i.exec(disposition);
  if (match && match[1]) {
    try {
      return decodeURIComponent(match[1].replace(/"/g, '').trim());
    } catch {
      return match[1].replace(/"/g, '').trim();
    }
  }
  return fallbackName;
}

function triggerBrowserDownload(blobData, filename) {
  const blob = blobData instanceof Blob ? blobData : new Blob([blobData]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeBackendAudioResult(raw, fallbackZone = 'Residential', isCalibrated = false) {
  const eventsRaw = Array.isArray(raw?.sound_events) ? raw.sound_events : [];
  const duration = Number(raw?.duration) || 8.0;
  const meas = raw?.acoustic_measurement || {};
  const comp = raw?.compliance || {};
  const calibrated = isCalibrated || meas.calibration_status === 'calibrated';

  const catScores = {};
  eventsRaw.forEach((ev) => {
    const c = ev.category || 'Other';
    const conf = Number(ev.confidence) || 0.5;
    if (!catScores[c] || conf > catScores[c]) catScores[c] = conf;
  });

  const wholeClassification = Object.entries(catScores)
    .map(([category, confidence]) => ({
      category,
      confidence,
      is_low_confidence: confidence < 0.5
    }))
    .sort((a, b) => b.confidence - a.confidence);

  if (wholeClassification.length === 0) {
    wholeClassification.push({ category: 'Other', confidence: 0.45, is_low_confidence: true });
  }

  const timeEvents = eventsRaw.map((ev, idx) => ({
    id: `ev-${idx + 1}`,
    category: ev.category || 'Other',
    start_time: Number(ev.start_time) || 0,
    end_time: Number(ev.end_time) || duration,
    confidence: Number(ev.confidence) || 0.5,
    is_low_confidence: (Number(ev.confidence) || 0) < 0.5,
    label: `${ev.category || 'Environmental'} (${ev.model_name || 'SonicCensus-DSP-v2'})`
  }));

  const laeq = typeof meas.laeq === 'number' ? meas.laeq : null;
  const lmax = typeof meas.lmax === 'number' ? meas.lmax : null;
  const limitDb = typeof comp.threshold_db === 'number' ? comp.threshold_db : 55.0;

  return {
    job_id: raw.id,
    audio_file_id: raw.id,
    filename: raw.original_filename,
    file_size: raw.file_size || null,
    file_hash: raw.file_hash || null,
    entry_hash: raw.entry_hash || null,
    hash_algorithm: raw.hash_algorithm || 'SHA-256',
    stored_in_db: Boolean(raw.stored_in_db ?? raw.file_hash),
    download_url: raw.download_url || (raw.id ? `${API_BASE_URL}/audio/${raw.id}/download` : null),
    vault_download_url: raw.vault_download_url || (raw.file_hash ? `${API_BASE_URL}/audio/by-hash/${raw.file_hash}/download` : null),
    duration,
    waveform: Array.isArray(raw.waveform) ? raw.waveform : [],
    spectrogram_url: raw.spectrogram_url ? `${BACKEND_ORIGIN}${raw.spectrogram_url}` : null,
    is_simulated: false,
    calibration_status: calibrated ? 'calibrated' : 'uncalibrated',
    measurements: calibrated && laeq !== null ? {
      laeq_dba: laeq,
      lmax_dba: lmax ?? laeq,
      lmin_dba: Math.max(30, +(laeq - 12).toFixed(1)),
      zone_limit_dba: limitDb,
      outcome: comp.outcome === 'potential_exceedance' ? 'Potential exceedance' : 'Within limit',
      exceedance_dba: comp.exceedance_amount || 0
    } : null,
    raw_laeq_estimate: laeq,
    raw_lmax_estimate: lmax,
    compliance: {
      zone_type: comp.zone_type || fallbackZone,
      period: comp.time_period || 'Day',
      threshold_db: limitDb,
      outcome: comp.outcome || 'within_limit',
      margin_db: laeq !== null ? +(laeq - limitDb).toFixed(1) : 0,
      notes: comp.notes || ''
    },
    whole_recording_classification: wholeClassification,
    time_localised_events: timeEvents
  };
}

export const api = {
  /**
   * POST /audio/uploads
   * Accepts real audio File/Blob (WAV/MP3/FLAC) and optional calibration flag.
   */
  async uploadAudio(file, options = {}) {
    if (USE_REAL_BACKEND) {
      const formData = new FormData();
      formData.append('file', file);
      if (options.zone_type) formData.append('zone_type', options.zone_type);
      formData.append('is_calibrated', String(Boolean(options.is_calibrated)));
      formData.append('use_gemini', String(Boolean(options.use_gemini)));
      const res = await client.post('/audio/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const normalized = normalizeBackendAudioResult(
        res.data,
        options.zone_type || 'Residential',
        Boolean(options.is_calibrated)
      );
      activeJobs.set(res.data.id, {
        id: res.data.id,
        filename: res.data.original_filename,
        createdAt: Date.now(),
        realResult: normalized
      });
      return {
        job_id: res.data.id,
        status: 'Completed',
        filename: res.data.original_filename,
        file_size_bytes: res.data.file_size,
        result: normalized,
        message: 'Audio analyzed successfully by backend DSP/ML pipeline'
      };
    }

    await delay(350);
    const jobId = `job-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const createdAt = Date.now();

    activeJobs.set(jobId, {
      id: jobId,
      filename: file.name,
      size: file.size,
      zone_type: options.zone_type || 'Residential',
      is_calibrated: Boolean(options.is_calibrated),
      dspFeatures: options.dspFeatures || null,
      createdAt,
      stages: [
        'Queued',
        'Decoding',
        'Resampling',
        'Model inference',
        'Category mapping',
        'Completed'
      ]
    });

    return {
      job_id: jobId,
      status: 'Queued',
      filename: file.name,
      file_size_bytes: file.size,
      message: 'Audio received and queued for PANNs acoustic inference pipeline'
    };
  },

  /**
   * GET /audio/jobs/{id}
   * Tracks current stage of the processing job.
   */
  async getJobStatus(jobId) {
    if (USE_REAL_BACKEND) {
      const res = await client.get(`/audio/jobs/${jobId}`);
      return res.data;
    }

    await delay(120);
    const job = activeJobs.get(jobId);
    if (!job) {
      return { job_id: jobId, status: 'Completed', stage: 'Completed', progress: 100 };
    }

    const elapsed = Date.now() - job.createdAt;
    // Stage sequence timeline (ms)
    // 0-400ms: Queued
    // 400-900ms: Decoding
    // 900-1400ms: Resampling
    // 1400-2400ms: Model inference
    // 2400-3000ms: Category mapping
    // >3000ms: Completed
    let stage = 'Queued';
    let progress = 10;

    if (elapsed > 3000) {
      stage = 'Completed';
      progress = 100;
    } else if (elapsed > 2400) {
      stage = 'Category mapping';
      progress = 85;
    } else if (elapsed > 1400) {
      stage = 'Model inference';
      progress = 60;
    } else if (elapsed > 900) {
      stage = 'Resampling';
      progress = 40;
    } else if (elapsed > 400) {
      stage = 'Decoding';
      progress = 25;
    }

    return {
      job_id: jobId,
      status: stage === 'Completed' ? 'Completed' : 'Processing',
      current_stage: stage,
      progress,
      elapsed_ms: elapsed,
      stages: job.stages,
      is_simulated: true
    };
  },

  /**
   * GET /audio/jobs/{id}/results
   * Returns classification tags, waveform points, and calibrated/uncalibrated measurements.
   */
  async getJobResults(jobId) {
    if (USE_REAL_BACKEND) {
      const cached = activeJobs.get(jobId);
      if (cached?.realResult) return cached.realResult;
      const res = await client.get(`/audio/${jobId}`);
      return normalizeBackendAudioResult(res.data);
    }

    await delay(200);
    const job = activeJobs.get(jobId) || {
      filename: 'sample.wav',
      zone_type: 'Residential',
      is_calibrated: false
    };

    const fname = (job.filename || '').toLowerCase();
    const dsp = job.dspFeatures || {};

    // Dynamic Acoustic Category Inference
    // 1. Drilling, Hammering, Construction, Machinery
    const isDrill = 
      fname.includes('drill') ||
      fname.includes('hammer') ||
      fname.includes('construction') ||
      fname.includes('jackhammer') ||
      fname.includes('grind') ||
      fname.includes('saw') ||
      fname.includes('masonry') ||
      fname.includes('machin') ||
      fname.includes('tool') ||
      dsp.isDrilling;

    // 2. Emergency Siren
    const isSiren = 
      fname.includes('siren') ||
      fname.includes('ambulance') ||
      fname.includes('police') ||
      fname.includes('fire') ||
      fname.includes('emergency') ||
      fname.includes('alarm');

    // 3. Nature / Birdsong
    const isNature = 
      fname.includes('bird') ||
      fname.includes('chirp') ||
      fname.includes('nature') ||
      fname.includes('park') ||
      fname.includes('forest');

    // 4. Human Activity
    const isHuman = 
      fname.includes('speech') ||
      fname.includes('voice') ||
      fname.includes('crowd') ||
      fname.includes('people') ||
      fname.includes('talking');

    let classifications = [];
    let events = [];
    let laeqValue = 58.4;
    let lmaxValue = 71.2;

    if (isDrill) {
      laeqValue = 84.6;
      lmaxValue = 92.4;
      classifications = [
        { category: 'Construction', confidence: 0.94, is_low_confidence: false, label: 'Electric / Rotary Hammer Drill & Masonry Impact' },
        { category: 'Industrial', confidence: 0.72, is_low_confidence: false, label: 'High-frequency electric motor whine' },
        { category: 'Human activity', confidence: 0.34, is_low_confidence: true },
        { category: 'Traffic', confidence: 0.16, is_low_confidence: true }
      ];
      events = [
        {
          id: 'ev-1',
          category: 'Construction',
          start_time: 0.2,
          end_time: 4.5,
          confidence: 0.95,
          is_low_confidence: false,
          label: 'Continuous rotary drill motor whine & surface friction'
        },
        {
          id: 'ev-2',
          category: 'Construction',
          start_time: 4.8,
          end_time: 7.6,
          confidence: 0.92,
          is_low_confidence: false,
          label: 'High-impact masonry drilling vibration pulses'
        },
        {
          id: 'ev-3',
          category: 'Industrial',
          start_time: 1.0,
          end_time: 6.0,
          confidence: 0.74,
          is_low_confidence: false,
          label: 'Heavy electro-mechanical motor noise'
        }
      ];
    } else if (isSiren) {
      laeqValue = 88.2;
      lmaxValue = 96.5;
      classifications = [
        { category: 'Emergency', confidence: 0.96, is_low_confidence: false, label: 'Two-tone emergency vehicle siren' },
        { category: 'Traffic', confidence: 0.65, is_low_confidence: false, label: 'Arterial roadway vehicular flow' },
        { category: 'Human activity', confidence: 0.32, is_low_confidence: true },
        { category: 'Industrial', confidence: 0.15, is_low_confidence: true }
      ];
      events = [
        {
          id: 'ev-1',
          category: 'Emergency',
          start_time: 0.4,
          end_time: 7.8,
          confidence: 0.96,
          is_low_confidence: false,
          label: 'Emergency response vehicle siren sweep (900 Hz - 1400 Hz)'
        }
      ];
    } else if (isNature) {
      laeqValue = 46.2;
      lmaxValue = 54.1;
      classifications = [
        { category: 'Nature', confidence: 0.93, is_low_confidence: false, label: 'Avian birdsong & environmental bio-acoustics' },
        { category: 'Weather', confidence: 0.44, is_low_confidence: true, label: 'Ambient breeze / foliage rustle' },
        { category: 'Human activity', confidence: 0.24, is_low_confidence: true },
        { category: 'Traffic', confidence: 0.12, is_low_confidence: true }
      ];
      events = [
        {
          id: 'ev-1',
          category: 'Nature',
          start_time: 0.5,
          end_time: 6.8,
          confidence: 0.93,
          is_low_confidence: false,
          label: 'High-frequency passerine bird vocalizations (3 kHz - 6 kHz)'
        }
      ];
    } else if (isHuman) {
      laeqValue = 54.2;
      lmaxValue = 63.8;
      classifications = [
        { category: 'Human activity', confidence: 0.91, is_low_confidence: false, label: 'Near-field vocal speech & conversation' },
        { category: 'Traffic', confidence: 0.48, is_low_confidence: true },
        { category: 'Other', confidence: 0.25, is_low_confidence: true }
      ];
      events = [
        {
          id: 'ev-1',
          category: 'Human activity',
          start_time: 0.4,
          end_time: 6.2,
          confidence: 0.91,
          is_low_confidence: false,
          label: 'Formant speech frequencies (300 Hz - 3400 Hz)'
        }
      ];
    } else {
      // Default: Urban Traffic Flow
      laeqValue = 64.2;
      lmaxValue = 76.5;
      classifications = [
        { category: 'Traffic', confidence: 0.88, is_low_confidence: false, label: 'Vehicle acceleration and rolling tire noise' },
        { category: 'Human activity', confidence: 0.58, is_low_confidence: false, label: 'Pedestrian flow and footstep sounds' },
        { category: 'Construction', confidence: 0.32, is_low_confidence: true, label: 'Distant low-frequency background hum' },
        { category: 'Aviation', confidence: 0.18, is_low_confidence: true }
      ];
      events = [
        {
          id: 'ev-1',
          category: 'Traffic',
          start_time: 0.5,
          end_time: 4.8,
          confidence: 0.91,
          is_low_confidence: false,
          label: 'Vehicle acceleration and rolling tire noise'
        },
        {
          id: 'ev-2',
          category: 'Human activity',
          start_time: 5.2,
          end_time: 8.6,
          confidence: 0.65,
          is_low_confidence: false,
          label: 'Near-field footstep & conversational speech'
        }
      ];
    }

    const zoneLimit = job.zone_type === 'Commercial' ? 65.0 : 55.0;

    return {
      job_id: jobId,
      is_simulated: true,
      calibration_status: job.is_calibrated ? 'calibrated' : 'uncalibrated',
      measurements: job.is_calibrated ? {
        laeq_dba: laeqValue,
        lmax_dba: lmaxValue,
        lmin_dba: Math.max(30, laeqValue - 14),
        zone_limit_dba: zoneLimit,
        outcome: laeqValue > zoneLimit ? 'Potential exceedance' : 'Within limit',
        exceedance_dba: laeqValue > zoneLimit ? +(laeqValue - zoneLimit).toFixed(1) : 0
      } : null,
      whole_recording_classification: classifications,
      time_localised_events: events
    };
  },

  /**
   * GET /dashboard/summary
   */
  async getDashboardSummary() {
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/dashboard/summary');
        const b = res.data;
        return {
          ...MOCK_DASHBOARD_SUMMARY,
          ...b,
          average_valid_laeq: typeof b.average_laeq === 'number' ? b.average_laeq : MOCK_DASHBOARD_SUMMARY.average_valid_laeq,
          potential_exceedances: typeof b.total_exceedances === 'number' ? b.total_exceedances : MOCK_DASHBOARD_SUMMARY.potential_exceedances,
          detected_sound_events: typeof b.total_sound_events === 'number' ? b.total_sound_events : MOCK_DASHBOARD_SUMMARY.detected_sound_events,
          active_sensors: typeof b.active_sensors === 'number' ? b.active_sensors : MOCK_DASHBOARD_SUMMARY.active_sensors,
          category_breakdown: Array.isArray(b.category_breakdown) && b.category_breakdown.length > 0
            ? b.category_breakdown.map((c) => ({
                ...c,
                status: c.category === 'Construction' || c.category === 'Industrial' ? 'loud' : c.category === 'Traffic' ? 'moderate' : 'quiet'
              }))
            : MOCK_DASHBOARD_SUMMARY.category_breakdown,
          recent_alerts: MOCK_DASHBOARD_SUMMARY.recent_alerts,
          noise_clock: MOCK_DASHBOARD_SUMMARY.noise_clock
        };
      } catch (err) {
        console.warn('Backend summary request failed, falling back to mock:', err);
        return MOCK_DASHBOARD_SUMMARY;
      }
    }
    await delay(150);
    return MOCK_DASHBOARD_SUMMARY;
  },

  /**
   * GET /map/sensors
   */
  async getMapSensors() {
    let raw = [];
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/map/noise');
        raw = Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Backend /map/noise failed, falling back to mock sensors:', err);
        raw = MOCK_SENSORS;
      }
    } else {
      await delay(180);
      raw = MOCK_SENSORS;
    }

    // Defensive normalization so sensors always have required field properties
    return (raw || []).map((s) => {
      const laeqVal = typeof s.current_laeq === 'number' ? s.current_laeq : (typeof s.laeq === 'number' ? s.laeq : 55.0);
      const categoryVal = s.predominant_category || s.sound_category || 'Traffic';
      const trend = Array.isArray(s.recent_trend) && s.recent_trend.length > 0
        ? s.recent_trend
        : [
            Math.round((laeqVal - 2.1) * 10) / 10,
            Math.round((laeqVal - 1.2) * 10) / 10,
            Math.round((laeqVal + 0.8) * 10) / 10,
            Math.round((laeqVal - 0.4) * 10) / 10,
            Math.round((laeqVal + 1.5) * 10) / 10,
            Math.round((laeqVal - 0.2) * 10) / 10,
            laeqVal
          ];

      return {
        ...s,
        current_laeq: laeqVal,
        laeq: laeqVal,
        predominant_category: categoryVal,
        sound_category: categoryVal,
        recent_trend: trend,
        sensor_type: s.sensor_type || 'IoT Class 1 Precision Sound Monitor',
        calibration_date: s.calibration_date || '2026-09-12',
        status: s.status || 'active',
        latitude: Number(s.latitude) || 28.6139,
        longitude: Number(s.longitude) || 77.2090,
        zone_type: s.zone_type || 'Residential'
      };
    });
  },

  /**
   * GET /analytics/trends
   */
  async getAnalyticsTrends(period = 'daily') {
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/analytics/trends', { params: { period } });
        const data = res.data;
        if (Array.isArray(data)) return data;

        if (data && typeof data === 'object') {
          if (period === 'weekly' && Array.isArray(data.weekly_trends)) {
            return data.weekly_trends.map((w) => ({
              time: w.day,
              laeq: w.avg_laeq,
              lmax: w.peak_laeq,
              lmin: Math.max(30, Math.round((w.avg_laeq - 12) * 10) / 10),
              limit: 55.0,
              category: 'Urban Environment'
            }));
          }
          if (Array.isArray(data.hourly_diurnal_cycle)) {
            return data.hourly_diurnal_cycle.map((h) => ({
              time: h.hour,
              laeq: h.laeq,
              lmax: Math.round((h.laeq + 11.5) * 10) / 10,
              lmin: Math.round((h.laeq - 8.2) * 10) / 10,
              limit: h.day_threshold || 55.0,
              category: h.hour >= '07:00' && h.hour <= '20:00' ? 'Traffic' : 'Human activity'
            }));
          }
        }
      } catch (err) {
        console.warn('Backend /analytics/trends failed, falling back to mock:', err);
      }
    }
    await delay(160);
    return MOCK_TRENDS;
  },

  /**
   * GET /compliance/rules
   */
  async getComplianceRules() {
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/compliance/rules');
        const raw = res.data;
        if (Array.isArray(raw) && raw.length > 0) {
          const zoneMap = {};
          raw.forEach((r) => {
            const z = r.zone_type || 'Residential';
            if (!zoneMap[z]) {
              zoneMap[z] = {
                zone_type: z,
                day_limit_db: z === 'Industrial' ? 75.0 : z === 'Commercial' ? 65.0 : z === 'Silence' ? 50.0 : 55.0,
                night_limit_db: z === 'Industrial' ? 70.0 : z === 'Commercial' ? 55.0 : z === 'Silence' ? 40.0 : 45.0,
                description: r.source_reference || `${z} Zone Statutory Baseline`,
                statutory_reference: r.regulation_name || 'Noise Pollution (Regulation and Control) Rules, 2000'
              };
            }
            if ((r.time_period || '').toLowerCase() === 'day' && typeof r.threshold_db === 'number') {
              zoneMap[z].day_limit_db = r.threshold_db;
            } else if ((r.time_period || '').toLowerCase() === 'night' && typeof r.threshold_db === 'number') {
              zoneMap[z].night_limit_db = r.threshold_db;
            }
          });
          return Object.values(zoneMap);
        }
      } catch (err) {
        console.warn('Backend compliance rules failed, falling back to mock:', err);
      }
    }
    await delay(100);
    return CPCB_RULES;
  },

  /**
   * POST /compliance/check
   * Evaluates measured decibel level against CPCB Zone and Day/Night period.
   */
  async checkCompliance({ measured_db, zone_type, period, is_calibrated = true }) {
    if (USE_REAL_BACKEND) {
      const customHour = period && period.toLowerCase().includes('night') ? '23:00:00' : '14:00:00';
      const res = await client.post('/compliance/evaluate', {
        measured_db,
        zone_type,
        period,
        timestamp: `2026-11-26T${customHour}`,
        is_calibrated
      });
      const b = res.data || {};
      const laeq = typeof b.measured_laeq === 'number' ? b.measured_laeq : measured_db;
      const limit = typeof b.threshold_db === 'number' ? b.threshold_db : 55.0;
      const margin = Math.round((laeq - limit) * 10) / 10;
      let statusLabel = 'Within limit';
      if (!is_calibrated) {
        statusLabel = 'Uncalibrated';
      } else if (b.outcome === 'potential_exceedance' || margin > 0) {
        statusLabel = 'Potential exceedance';
      } else if (margin >= -2.0) {
        statusLabel = 'Elevated (approaching limit)';
      }

      return {
        ...b,
        measured_db: is_calibrated ? laeq : null,
        limit_db: limit,
        period: b.time_period === 'Night' ? 'Night (22:00 - 06:00)' : 'Day (06:00 - 22:00)',
        status: statusLabel,
        margin_db: margin,
        note: b.notes || ''
      };
    }

    await delay(140);
    const rule = CPCB_RULES.find((r) => r.zone_type.toLowerCase() === zone_type.toLowerCase()) || CPCB_RULES[2];
    const isDay = period.toLowerCase().includes('day') || period === 'Day';
    const limitDb = isDay ? rule.day_limit_db : rule.night_limit_db;

    if (!is_calibrated) {
      return {
        measured_db: null,
        limit_db: limitDb,
        zone_type: rule.zone_type,
        period: isDay ? 'Day (06:00 - 22:00)' : 'Night (22:00 - 06:00)',
        status: 'Uncalibrated',
        margin_db: null,
        is_simulated: true,
        note: 'Uncalibrated recordings cannot be verified for statutory compliance.'
      };
    }

    const margin = Math.round((measured_db - limitDb) * 10) / 10;
    let status = 'Within limit';
    if (margin > 0) {
      status = 'Potential exceedance';
    } else if (margin >= -2.0) {
      status = 'Elevated (approaching limit)';
    }

    return {
      measured_db,
      limit_db: limitDb,
      zone_type: rule.zone_type,
      period: isDay ? 'Day (06:00 - 22:00)' : 'Night (22:00 - 06:00)',
      status,
      margin_db: margin,
      is_simulated: true,
      statutory_reference: rule.statutory_reference,
      note: 'Tool provides monitoring and decision support only. Statutory zone classifications and legal sanctions are the sole prerogative of the notified state pollution control authority.'
    };
  },

  /**
   * POST /reports/generate
   */
  async generateReport({ report_type, period, location, file_format = 'PDF' }) {
    if (USE_REAL_BACKEND) {
      const res = await client.post('/reports/generate', {
        report_type,
        reporting_period: period || 'Last 24 Hours',
        location,
        file_format
      });
      const r = res.data || {};
      return {
        ...r,
        title: `${r.report_type || report_type} — ${r.location || location}`,
        type: r.report_type || report_type,
        period: r.reporting_period || period,
        file_format: r.file_format || file_format,
        file_size_kb: r.file_format === 'CSV' ? 12 : 48,
        generated_at: r.generated_at ? r.generated_at.slice(0, 19).replace('T', ' ') : 'Just now',
        download_url: r.id ? `${API_BASE_URL}/reports/${r.id}/download` : null
      };
    }

    await delay(400);
    const newReport = {
      id: `REP-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      title: `${report_type} — ${location}`,
      type: report_type,
      period,
      location,
      generated_at: 'Just now',
      file_format,
      file_size_kb: file_format === 'PDF' ? 385 : 62,
      status: 'Ready',
      download_url: `#download-${file_format.toLowerCase()}`
    };

    return newReport;
  },

  /**
   * GET /reports
   */
  async getReportsList() {
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/reports');
        const list = Array.isArray(res.data) ? res.data : [];
        if (list.length > 0) {
          return list.map((r) => ({
            ...r,
            title: r.title || `${r.report_type || 'Acoustic Monitoring Audit'} — ${r.location || 'Cluster Zone'}`,
            type: r.type || r.report_type || 'Daily Environmental Monitoring',
            file_format: r.file_format || 'PDF',
            file_size_kb: r.file_size_kb || (r.file_format === 'CSV' ? 12 : 48),
            generated_at: r.generated_at ? r.generated_at.slice(0, 19).replace('T', ' ') : '2026-11-18 10:00:00',
            download_url: r.id ? `${API_BASE_URL}/reports/${r.id}/download` : null
          }));
        }
      } catch (err) {
        console.warn('Backend /reports failed, falling back to mock:', err);
      }
    }
    await delay(120);
    return MOCK_REPORTS;
  },

  async createSensor(sensorPayload) {
    if (USE_REAL_BACKEND) {
      const res = await client.post('/sensors', sensorPayload);
      return res.data;
    }
    await delay(120);
    return { id: `sensor-${Date.now().toString(36)}`, ...sensorPayload };
  },

  async getComplaints() {
    if (USE_REAL_BACKEND) {
      try {
        const res = await client.get('/complaints');
        return Array.isArray(res.data) ? res.data : [];
      } catch (err) {
        console.warn('Backend /complaints failed:', err);
        return [];
      }
    }
    return [];
  },

  async createComplaint(payload) {
    if (USE_REAL_BACKEND) {
      const res = await client.post('/complaints', payload);
      return res.data;
    }
    await delay(120);
    return {
      id: `cmp-${Date.now()}`,
      ticket_number: `CPCB-NOISE-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      ...payload,
      status: 'Submitted & Queued',
      is_exceedance: true,
      created_at: new Date().toISOString()
    };
  },

  async getAudioVault(limit = 200) {
    const res = await client.get(`/audio/vault?limit=${limit}`);
    return res.data;
  },

  async downloadAudioFromDb({ id, fileHash, filename = 'recording.wav' }) {
    const endpoint = id ? `/audio/${id}/download` : `/audio/by-hash/${fileHash}/download`;
    const res = await client.get(endpoint, { responseType: 'blob' });
    const resolvedName = extractFilenameFromDisposition(
      res.headers?.['content-disposition'],
      filename || `${fileHash || id || 'recording'}.wav`
    );
    triggerBrowserDownload(res.data, resolvedName);
    return {
      filename: resolvedName,
      sha256: res.headers?.['x-audio-sha256'] || fileHash || null,
    };
  },

  async exportAudioVault(format = 'zip', includeBase64 = false) {
    const res = await client.get(
      `/audio/vault/export?format=${encodeURIComponent(format)}&include_base64=${includeBase64 ? 'true' : 'false'}`,
      { responseType: 'blob' }
    );
    const fallbackName = `sonic_census_audio_vault.${format}`;
    const resolvedName = extractFilenameFromDisposition(res.headers?.['content-disposition'], fallbackName);
    triggerBrowserDownload(res.data, resolvedName);
    return resolvedName;
  },

  /**
   * Multimodal AI screening with Google Gemini
   */
  async screenAudioWithGemini(file, zone_type = 'Residential') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('zone_type', zone_type);
      const res = await client.post('/audio/gemini-screen', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 25000
      });
      return res.data;
    } catch (err) {
      console.warn('Gemini screen API fallback to local classifier:', err);
      return null;
    }
  },

  /**
   * Generic Axios pass-through methods for flexibility
   */
  async get(url, config) {
    if (USE_REAL_BACKEND) {
      return client.get(url, config);
    }
    await delay(100);
    if (url === '/dashboard/summary') return { data: MOCK_DASHBOARD_SUMMARY };
    if (url === '/map/sensors' || url === '/sensors') return { data: MOCK_SENSORS };
    if (url === '/analytics/trends' || url === '/analytics') return { data: MOCK_TRENDS };
    if (url === '/compliance/rules') return { data: CPCB_RULES };
    if (url === '/reports') return { data: MOCK_REPORTS };
    return client.get(url, config);
  },

  async post(url, data, config) {
    if (USE_REAL_BACKEND) {
      return client.post(url, data, config);
    }
    await delay(150);
    if (url === '/compliance/check') {
      const res = await this.checkCompliance(data);
      return { data: res };
    }
    if (url === '/reports/generate') {
      const res = await this.generateReport(data);
      return { data: res };
    }
    return client.post(url, data, config);
  },

  async put(url, data, config) {
    return client.put(url, data, config);
  },

  async delete(url, config) {
    return client.delete(url, config);
  }
};

export default api;
