/**
 * Client-side SHA-256 Demo Audio Vault for standalone static frontend deployments
 * (when VITE_USE_REAL_BACKEND is false / before a hosted backend is attached).
 */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function sha256HexFromBuffer(buffer) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', u8);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic 64-hex fingerprint when WebCrypto is unavailable
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < u8.length; i++) {
    h1 = Math.imul(h1 ^ u8[i], 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ (u8[i] + i), 0x85ebca6b) >>> 0;
  }
  return `${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`.repeat(4);
}

export async function sha256HexFromString(text) {
  return sha256HexFromBuffer(new TextEncoder().encode(text));
}

function buildSynthesizedWavBytes(freq = 620, durationSec = 1.5, sampleRate = 16000) {
  const numSamples = Math.floor(durationSec * sampleRate);
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);
  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, numSamples * 2, true);
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const val = 0.35 * Math.sin(2 * Math.PI * freq * t) + 0.15 * Math.sin(2 * Math.PI * (freq * 1.9) * t);
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, val)) * 32767, true);
  }
  return new Uint8Array(buffer);
}

export function buildStoredZipBlob(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const item of files) {
    const nameBytes = encoder.encode(item.name);
    const data = item.bytes instanceof Uint8Array ? item.bytes : new Uint8Array(item.bytes);
    const sum = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0x5421, true);
    lv.setUint32(14, sum, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    localParts.push(local, data);

    const central = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0x5421, true);
    cv.setUint32(16, sum, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);

    offset += local.length + data.length;
  }

  let centralSize = 0;
  for (const c of centralParts) centralSize += c.length;

  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, eocd], { type: 'application/zip' });
}

const demoEntries = [];
const demoBlobs = new Map();
let demoInitialized = false;

async function ensureDemoSeeded() {
  if (demoInitialized) return;
  demoInitialized = true;

  const seeds = [
    {
      id: 'demo-audio-drill-01',
      filename: 'construction_hammer_sample.wav',
      freq: 1850,
      duration: 2.0,
      category: 'Construction',
      confidence: 0.94,
      laeq: 77.1,
      lmax: 86.4,
      zone: 'Silence',
      outcome: 'potential_exceedance',
      uploadedAt: '2026-11-26T09:30:00Z',
    },
    {
      id: 'demo-audio-traffic-02',
      filename: 'traffic_horn_sample.wav',
      freq: 420,
      duration: 2.0,
      category: 'Traffic',
      confidence: 0.91,
      laeq: 68.4,
      lmax: 78.2,
      zone: 'Commercial',
      outcome: 'potential_exceedance',
      uploadedAt: '2026-11-26T09:15:00Z',
    },
  ];

  for (const s of seeds) {
    const wavBytes = buildSynthesizedWavBytes(s.freq, s.duration, 16000);
    const fileHash = await sha256HexFromBuffer(wavBytes);
    const entryHash = await sha256HexFromString(`${s.id}|${fileHash}|${s.filename}|${s.laeq}`);
    demoBlobs.set(fileHash, {
      bytes: wavBytes,
      filename: s.filename,
      mimeType: 'audio/wav',
      fileFormat: 'WAV',
    });
    demoEntries.push({
      id: s.id,
      original_filename: s.filename,
      file_format: 'WAV',
      mime_type: 'audio/wav',
      file_size: wavBytes.length,
      duration: s.duration,
      sample_rate: 16000,
      file_hash: fileHash,
      entry_hash: entryHash,
      hash_algorithm: 'SHA-256',
      stored_in_db: true,
      primary_category: s.category,
      primary_confidence: s.confidence,
      laeq: s.laeq,
      lmax: s.lmax,
      calibration_status: 'uncalibrated',
      zone_type: s.zone,
      outcome: s.outcome,
      uploaded_at: s.uploadedAt,
      download_url: `#demo-audio-${s.id}`,
      vault_download_url: `#demo-hash-${fileHash}`,
    });
  }
}

export async function recordDemoAudioUpload(file, {
  id,
  zone_type = 'Residential',
  duration = 8.0,
  laeq = null,
  lmax = null,
  primary_category = 'Construction',
  primary_confidence = 0.92,
  is_calibrated = false,
} = {}) {
  await ensureDemoSeeded();
  const ab = await file.arrayBuffer();
  const u8 = new Uint8Array(ab);
  const fileHash = await sha256HexFromBuffer(u8);
  const entryId = id || `demo-${Date.now().toString(36)}`;
  const uploadedAt = new Date().toISOString();
  const ext = (file.name?.split('.').pop() || 'WAV').toUpperCase();
  const entryHash = await sha256HexFromString(`${entryId}|${fileHash}|${file.name}|${laeq ?? ''}|${uploadedAt}`);

  if (!demoBlobs.has(fileHash)) {
    demoBlobs.set(fileHash, {
      bytes: u8,
      filename: file.name || `${entryId}.wav`,
      mimeType: file.type || 'audio/wav',
      fileFormat: ext,
    });
  }

  const entry = {
    id: entryId,
    original_filename: file.name || 'recording.wav',
    file_format: ext,
    mime_type: file.type || 'audio/wav',
    file_size: u8.length,
    duration,
    sample_rate: 16000,
    file_hash: fileHash,
    entry_hash: entryHash,
    hash_algorithm: 'SHA-256',
    stored_in_db: true,
    primary_category,
    primary_confidence,
    laeq,
    lmax,
    calibration_status: is_calibrated ? 'calibrated' : 'uncalibrated',
    zone_type,
    outcome: laeq && laeq > 55 ? 'potential_exceedance' : 'within_limit',
    uploaded_at: uploadedAt,
    download_url: `#demo-audio-${entryId}`,
    vault_download_url: `#demo-hash-${fileHash}`,
  };
  demoEntries.unshift(entry);
  return entry;
}

export async function getDemoVaultManifest(limit = 200) {
  await ensureDemoSeeded();
  const sliced = demoEntries.slice(0, limit);
  let totalBlobBytes = 0;
  for (const item of demoBlobs.values()) {
    totalBlobBytes += item.bytes.length;
  }
  return {
    hash_algorithm: 'SHA-256',
    is_demo_vault: true,
    total_entries: sliced.length,
    unique_blobs: demoBlobs.size,
    total_blob_bytes: totalBlobBytes,
    entries: sliced,
  };
}

export async function getDemoAudioDownload({ id, fileHash, filename = 'recording.wav' }) {
  await ensureDemoSeeded();
  let targetHash = fileHash;
  let resolvedName = filename;
  if (!targetHash && id) {
    const match = demoEntries.find((e) => e.id === id);
    if (match) {
      targetHash = match.file_hash;
      resolvedName = match.original_filename;
    }
  }
  const stored = targetHash ? demoBlobs.get(targetHash) : null;
  if (stored) {
    return {
      blob: new Blob([stored.bytes], { type: stored.mimeType }),
      filename: resolvedName || stored.filename,
      sha256: targetHash,
    };
  }
  const fallback = buildSynthesizedWavBytes(740, 2.0, 16000);
  const hash = await sha256HexFromBuffer(fallback);
  return {
    blob: new Blob([fallback], { type: 'audio/wav' }),
    filename: resolvedName,
    sha256: hash,
  };
}

function uint8ToBase64(u8) {
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < u8.length; i += chunk) {
    bin += String.fromCharCode(...u8.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export async function exportDemoVault(format = 'zip', includeBase64 = false) {
  const manifest = await getDemoVaultManifest(1000);
  const fmt = format.toLowerCase();

  const csvRows = [
    ['audio_id', 'file_hash_sha256', 'entry_hash_sha256', 'original_filename', 'file_format', 'file_size_bytes', 'laeq_dba', 'primary_category', 'zone_type', 'uploaded_at'].join(','),
    ...manifest.entries.map((e) => [
      e.id,
      e.file_hash,
      e.entry_hash,
      `"${(e.original_filename || '').replace(/"/g, '""')}"`,
      e.file_format,
      e.file_size,
      e.laeq ?? '',
      `"${e.primary_category || ''}"`,
      e.zone_type,
      e.uploaded_at || '',
    ].join(',')),
  ];
  const csvBytes = new TextEncoder().encode(csvRows.join('\n'));

  if (fmt === 'csv') {
    return {
      blob: new Blob([csvBytes], { type: 'text/csv;charset=utf-8' }),
      filename: 'sonic_census_audio_vault.csv',
    };
  }

  const jsonPayload = {
    ...manifest,
    exported_at: new Date().toISOString(),
    includes_base64_audio: includeBase64,
    entries: manifest.entries.map((e) => {
      const stored = demoBlobs.get(e.file_hash);
      return {
        ...e,
        vault_archive_path: `audio/${e.file_hash}.${(e.file_format || 'wav').toLowerCase()}`,
        ...(includeBase64 && stored ? { audio_base64: uint8ToBase64(stored.bytes) } : {}),
      };
    }),
  };
  const jsonBytes = new TextEncoder().encode(JSON.stringify(jsonPayload, null, 2));

  if (fmt === 'json') {
    return {
      blob: new Blob([jsonBytes], { type: 'application/json' }),
      filename: 'sonic_census_audio_vault.json',
    };
  }

  const files = [
    { name: 'hash_ledger.json', bytes: jsonBytes },
    { name: 'hash_ledger.csv', bytes: csvBytes },
  ];
  for (const [hash, stored] of demoBlobs.entries()) {
    const ext = (stored.fileFormat || 'wav').toLowerCase();
    files.push({ name: `audio/${hash}.${ext}`, bytes: stored.bytes });
  }
  return {
    blob: buildStoredZipBlob(files),
    filename: 'sonic_census_audio_vault.zip',
  };
}
