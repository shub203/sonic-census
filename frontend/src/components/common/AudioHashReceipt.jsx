import React, { useState } from 'react';
import { Database, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { api, USE_REAL_BACKEND } from '../../api';

export const AudioHashReceipt = ({
  audioId,
  filename,
  fileHash,
  entryHash = null,
  storedInDb = true,
  compact = false,
}) => {
  const [copiedKey, setCopiedKey] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadErr, setDownloadErr] = useState(null);

  if (!fileHash && !audioId) return null;

  const handleCopy = (key, value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value).catch(() => {});
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleDownload = async () => {
    setDownloading(true);
    setDownloadErr(null);
    try {
      await api.downloadAudioFromDb({ id: audioId, fileHash, filename });
    } catch (err) {
      setDownloadErr(err?.response?.data?.detail || 'Download from database failed.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-3.5 border border-sand bg-paper-light space-y-2 text-xs font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Database className="w-3.5 h-3.5 text-ink flex-shrink-0" strokeWidth={1.5} />
          <span className="text-[10px] uppercase tracking-wider text-ink font-bold">
            {USE_REAL_BACKEND
              ? `Database Hash Vault Record ${storedInDb ? '· Stored in SQLite DB' : ''}`
              : 'Demo Hash Vault Record · Browser SHA-256'}
          </span>
        </div>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1 border border-ink bg-ink text-paper text-[11px] font-bold uppercase tracking-wider hover:bg-ink-light transition-colors disabled:opacity-50"
        >
          <Download className="w-3 h-3" strokeWidth={1.5} />
          <span>{downloading ? 'Downloading...' : (USE_REAL_BACKEND ? 'Download Audio from DB' : 'Download Audio (Demo)')}</span>
        </button>
      </div>

      <div className={`grid grid-cols-1 ${compact || !entryHash ? '' : 'md:grid-cols-2'} gap-2 pt-1`}>
        {fileHash && (
          <div className="flex items-center justify-between gap-2 px-2 py-1 border border-sand bg-paper">
            <div className="truncate">
              <span className="text-[10px] text-graphite mr-1.5">SHA-256:</span>
              <span className="text-[11px] text-ink" title={fileHash}>{fileHash}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('file', fileHash)}
              className="text-graphite hover:text-ink flex-shrink-0"
              title="Copy File SHA-256 Hash"
            >
              {copiedKey === 'file' ? <Check className="w-3.5 h-3.5 text-quiet" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {!compact && entryHash && (
          <div className="flex items-center justify-between gap-2 px-2 py-1 border border-sand bg-paper">
            <div className="truncate">
              <span className="text-[10px] text-graphite mr-1.5">Entry Hash:</span>
              <span className="text-[11px] text-ink" title={entryHash}>{entryHash}</span>
            </div>
            <button
              type="button"
              onClick={() => handleCopy('entry', entryHash)}
              className="text-graphite hover:text-ink flex-shrink-0"
              title="Copy Entry SHA-256 Hash"
            >
              {copiedKey === 'entry' ? <Check className="w-3.5 h-3.5 text-quiet" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {downloadErr && (
        <div className="flex items-center gap-1.5 text-[11px] text-loud">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{downloadErr}</span>
        </div>
      )}
    </div>
  );
};
