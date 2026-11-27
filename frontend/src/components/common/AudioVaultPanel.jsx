import React, { useState, useEffect, useCallback } from 'react';
import {
  Database,
  Download,
  Archive,
  FileJson,
  FileSpreadsheet,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../../api';

function formatBytes(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

export const AudioVaultPanel = ({ refreshKey = null }) => {
  const [vault, setVault] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [copiedHash, setCopiedHash] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadVault = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.getAudioVault(200);
      setVault(data);
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Unable to load audio vault entries.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVault();
  }, [loadVault, refreshKey]);

  const handleCopyHash = (hashStr) => {
    if (!hashStr) return;
    navigator.clipboard?.writeText(hashStr).catch(() => {});
    setCopiedHash(hashStr);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleDownloadRow = async (entry) => {
    setDownloadingId(entry.id);
    setErrorMsg(null);
    try {
      await api.downloadAudioFromDb({
        id: entry.id,
        fileHash: entry.file_hash,
        filename: entry.original_filename,
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to download audio binary from database.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportArchive = async (format, includeBase64 = false) => {
    const opKey = `${format}-${includeBase64 ? 'b64' : 'std'}`;
    setExporting(opKey);
    setErrorMsg(null);
    try {
      await api.exportAudioVault(format, includeBase64);
    } catch (err) {
      setErrorMsg(err?.response?.data?.detail || 'Failed to export hashed database archive.');
    } finally {
      setExporting(null);
    }
  };

  const entries = vault?.entries || [];

  return (
    <div className="p-5 border border-sand bg-paper space-y-4 antialiased">
      {/* Header & Download All Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-sand pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-ink" strokeWidth={1.5} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
              {vault?.is_demo_vault
                ? 'Demo Browser Audio Vault · SHA-256 Local Session'
                : 'Hashed SQLite Audio Vault · SHA-256 Content-Addressed BLOBs'}
            </span>
          </div>
          <h2 className="font-serif text-lg font-bold text-ink mt-0.5">
            Stored Audio Database & Hash Ledger
          </h2>
          <p className="text-xs font-mono text-graphite mt-0.5">
            {vault?.is_demo_vault
              ? 'Demo mode active (no hosted backend attached yet): uploads are SHA-256 hashed in browser memory for test downloads.'
              : 'Every uploaded clip is hashed with SHA-256 and stored in the database for verified download.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleExportArchive('zip', false)}
            disabled={Boolean(exporting) || entries.length === 0}
            className="px-3 py-1.5 border border-ink bg-ink text-paper text-xs font-mono uppercase tracking-wider hover:bg-ink-light transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <Archive className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{exporting === 'zip-std' ? 'Packing ZIP...' : 'Download DB Archive (.ZIP)'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportArchive('json', true)}
            disabled={Boolean(exporting) || entries.length === 0}
            className="px-2.5 py-1.5 border border-sand bg-paper-light text-ink hover:border-ink text-xs font-mono transition-colors flex items-center gap-1.5 disabled:opacity-50"
            title="Download complete database entries with SHA-256 hashes and Base64 audio payloads"
          >
            <FileJson className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{exporting === 'json-b64' ? 'Exporting...' : 'JSON + Audio'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleExportArchive('csv', false)}
            disabled={Boolean(exporting) || entries.length === 0}
            className="px-2.5 py-1.5 border border-sand bg-paper-light text-ink hover:border-ink text-xs font-mono transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{exporting === 'csv-std' ? 'Exporting...' : 'CSV Hashes'}</span>
          </button>

          <button
            type="button"
            onClick={loadVault}
            disabled={loading}
            className="px-2 py-1.5 border border-sand bg-paper-light text-graphite hover:text-ink hover:border-ink text-xs font-mono transition-colors"
            title="Refresh Database Vault"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* Vault Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
        <div className="p-2.5 border border-sand bg-paper-light">
          <span className="text-[10px] uppercase text-graphite block">DB Audio Entries</span>
          <span className="text-base font-bold text-ink tabular-nums">{vault?.total_entries ?? 0}</span>
        </div>
        <div className="p-2.5 border border-sand bg-paper-light">
          <span className="text-[10px] uppercase text-graphite block">Unique Hash BLOBs</span>
          <span className="text-base font-bold text-ink tabular-nums">{vault?.unique_blobs ?? 0}</span>
        </div>
        <div className="p-2.5 border border-sand bg-paper-light">
          <span className="text-[10px] uppercase text-graphite block">DB Storage Used</span>
          <span className="text-base font-bold text-ink tabular-nums">{formatBytes(vault?.total_blob_bytes || 0)}</span>
        </div>
        <div className="p-2.5 border border-sand bg-paper-light">
          <span className="text-[10px] uppercase text-graphite block">Digest Integrity</span>
          <span className="text-xs font-bold text-quiet flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{vault?.hash_algorithm || 'SHA-256'} Verified</span>
          </span>
        </div>
      </div>

      {errorMsg && (
        <div className="p-2.5 border border-loud/40 bg-loud/10 text-loud text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Vault Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-sand text-[10px] text-graphite uppercase tracking-wider">
              <th className="py-2 pr-3">Audio Clip & Spec</th>
              <th className="py-2 pr-3">File Hash (SHA-256)</th>
              <th className="py-2 pr-3">Entry Hash</th>
              <th className="py-2 pr-3">Sound & LAeq</th>
              <th className="py-2 text-right">DB Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand">
            {loading && entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-graphite">
                  Loading hashed database entries...
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-graphite">
                  No audio recordings stored in the vault yet. Upload an audio clip above to hash and store it.
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-sand-light/60 transition-colors">
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink">{entry.original_filename}</span>
                      {entry.stored_in_db && (
                        <span className="text-[9px] px-1.5 py-0.5 border border-quiet/40 bg-quiet/10 text-quiet font-bold uppercase">
                          DB BLOB
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-graphite block mt-0.5 tabular-nums">
                      {entry.file_format} · {formatBytes(entry.file_size)} · {Number(entry.duration || 0).toFixed(1)}s · {entry.uploaded_at ? entry.uploaded_at.slice(0, 19).replace('T', ' ') : ''}
                    </span>
                  </td>

                  <td className="py-2.5 pr-3">
                    {entry.file_hash ? (
                      <button
                        type="button"
                        onClick={() => handleCopyHash(entry.file_hash)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-sand bg-paper-light hover:border-ink text-[10px] text-ink"
                        title={`Copy full SHA-256: ${entry.file_hash}`}
                      >
                        <span>{entry.file_hash.slice(0, 14)}...{entry.file_hash.slice(-6)}</span>
                        {copiedHash === entry.file_hash ? (
                          <Check className="w-3 h-3 text-quiet" />
                        ) : (
                          <Copy className="w-3 h-3 text-graphite" />
                        )}
                      </button>
                    ) : (
                      <span className="text-graphite">—</span>
                    )}
                  </td>

                  <td className="py-2.5 pr-3">
                    {entry.entry_hash ? (
                      <button
                        type="button"
                        onClick={() => handleCopyHash(entry.entry_hash)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 border border-sand bg-paper-light hover:border-ink text-[10px] text-graphite"
                        title={`Copy full Entry SHA-256: ${entry.entry_hash}`}
                      >
                        <span>{entry.entry_hash.slice(0, 10)}...</span>
                        {copiedHash === entry.entry_hash ? (
                          <Check className="w-3 h-3 text-quiet" />
                        ) : (
                          <Copy className="w-3 h-3 text-graphite" />
                        )}
                      </button>
                    ) : (
                      <span className="text-graphite">—</span>
                    )}
                  </td>

                  <td className="py-2.5 pr-3">
                    <span className="text-ink font-semibold block">{entry.primary_category}</span>
                    <span className="text-[10px] text-graphite tabular-nums">
                      {entry.laeq != null ? `${entry.laeq} dB(A)` : 'Unmeasured'} · {entry.zone_type}
                    </span>
                  </td>

                  <td className="py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleDownloadRow(entry)}
                      disabled={downloadingId === entry.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-ink border border-sand px-2.5 py-1 bg-paper-light hover:border-ink hover:bg-ink hover:text-paper transition-colors disabled:opacity-50"
                    >
                      <Download className="w-3 h-3" strokeWidth={1.5} />
                      <span>{downloadingId === entry.id ? 'Fetching...' : 'Audio'}</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
