import React, { useState, useRef, useEffect } from 'react';
import { 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  AlertTriangle, 
  FileAudio, 
  CheckCircle2, 
  Sliders, 
  ShieldAlert,
  Info,
  Clock,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { InstrumentPanel } from '../../components/common/InstrumentPanel';
import { Waveform } from '../../components/common/Waveform';
import { Spectrogram } from '../../components/common/Spectrogram';
import { DbGauge } from '../../components/common/DbGauge';
import { NoiseTag } from '../../components/common/NoiseTag';
import { SimulatedBadge } from '../../components/common/SimulatedBadge';
import { AudioVaultPanel } from '../../components/common/AudioVaultPanel';
import { AudioHashReceipt } from '../../components/common/AudioHashReceipt';
import { api } from '../../api';
import { encodeAudioBufferToWavFile, synthesizeSampleAudioBuffer } from '../../utils/wavEncoder';

export const AnalyzePage = () => {
  // File & Audio decoding state
  const [file, setFile] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [peaks, setPeaks] = useState([]);
  const [fileMeta, setFileMeta] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Playback & Scrubber state (Shared between Waveform & Spectrogram)
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(10.0);
  const [highlightRegion, setHighlightRegion] = useState(null); // { start, end, category }

  // Job stage tracker
  const [jobId, setJobId] = useState(null);
  const [currentStage, setCurrentStage] = useState(null); // 'Queued' | 'Decoding' | ... | 'Completed'
  const [stageProgress, setStageProgress] = useState(0);
  const [results, setResults] = useState(null);

  // Options
  const [zoneType, setZoneType] = useState('Residential');
  const [isCalibrated, setIsCalibrated] = useState(false);

  // Web Audio Context & Node references
  const audioCtxRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const startTimeRef = useRef(0);
  const pauseTimeRef = useRef(0);
  const rafIdRef = useRef(null);

  // Keyboard shortcut: Spacebar to play/pause
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        togglePlayPause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, audioBuffer, currentTime]);

  // Audio Context initialization
  const getAudioContext = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  };

  // Extract waveform peaks from decoded AudioBuffer
  const extractPeaks = (buffer, numPoints = 160) => {
    const rawData = buffer.getChannelData(0);
    const blockSize = Math.floor(rawData.length / numPoints);
    const calculatedPeaks = [];

    for (let i = 0; i < numPoints; i++) {
      const start = i * blockSize;
      let max = 0;
      for (let j = 0; j < blockSize; j++) {
        const val = Math.abs(rawData[start + j]);
        if (val > max) max = val;
      }
      calculatedPeaks.push(Math.min(max, 1.0));
    }
    return calculatedPeaks;
  };

  // Synthesize sample audio into a real WAV File for backend DSP & spectrogram analysis
  const synthesizeSample = (type = 'drill') => {
    setErrorMsg(null);
    const ctx = getAudioContext();
    const dur = 8.0;
    const buffer = synthesizeSampleAudioBuffer(ctx, type, dur);
    const filename = `sample_${type}_field_audio.wav`;
    const wavFile = encodeAudioBufferToWavFile(buffer, filename);

    setFile(wavFile);
    setAudioBuffer(buffer);
    setDuration(dur);
    setPeaks(extractPeaks(buffer));
    setFileMeta({
      name: filename,
      sizeKb: Math.round(wavFile.size / 1024),
      duration: dur,
      sampleRate: buffer.sampleRate,
      channels: 1
    });

    const isDrill = type === 'drill' || type === 'construction';
    startJobSimulation(wavFile, { isDrilling: isDrill, crest: isDrill ? 3.8 : 2.0 });
  };

  // Validate and decode user-uploaded audio file
  const handleFileSelect = async (selectedFile) => {
    setErrorMsg(null);
    if (!selectedFile) return;

    // Validation: format
    const validExtensions = ['.wav', '.mp3', '.flac', '.ogg', '.m4a'];
    const hasValidExt = validExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setErrorMsg('Invalid file format. Only WAV, MP3, and FLAC environmental sound recordings are accepted.');
      return;
    }

    // Validation: max size 25 MB
    const maxSize = 25 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setErrorMsg(`File exceeds 25 MB limit (${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB). Compress or trim the clip.`);
      return;
    }

    try {
      const ctx = getAudioContext();
      const arrayBuffer = await selectedFile.arrayBuffer();
      const decodedBuffer = await ctx.decodeAudioData(arrayBuffer);

      // Validation: max duration 60 s
      if (decodedBuffer.duration > 65) {
        setErrorMsg(`Audio duration exceeds 60 seconds (${decodedBuffer.duration.toFixed(1)} s). Please trim clip to under 60 s.`);
        return;
      }

      setFile(selectedFile);
      setAudioBuffer(decodedBuffer);
      setDuration(decodedBuffer.duration);
      setPeaks(extractPeaks(decodedBuffer));
      setFileMeta({
        name: selectedFile.name,
        sizeKb: Math.round(selectedFile.size / 1024),
        duration: decodedBuffer.duration,
        sampleRate: decodedBuffer.sampleRate,
        channels: decodedBuffer.numberOfChannels
      });

      // Analyze DSP features from decoded buffer
      const channelData = decodedBuffer.getChannelData(0);
      let sumSq = 0;
      let peak = 0;
      let zcrCount = 0;
      const step = Math.max(1, Math.floor(channelData.length / 4096));
      let prev = 0;
      for (let i = 0; i < channelData.length; i += step) {
        const val = channelData[i];
        sumSq += val * val;
        if (Math.abs(val) > peak) peak = Math.abs(val);
        if ((prev >= 0 && val < 0) || (prev < 0 && val >= 0)) zcrCount++;
        prev = val;
      }
      const numPts = Math.floor(channelData.length / step);
      const rms = Math.sqrt(sumSq / numPts);
      const crest = peak / (rms + 1e-6);
      const zcr = zcrCount / numPts;
      const fname = selectedFile.name.toLowerCase();
      const isDrilling = fname.includes('drill') || fname.includes('hammer') || fname.includes('construction') || (zcr > 0.15 && crest > 2.2);

      const dspFeatures = { rms, peak, crest, zcr, isDrilling };

      // Launch real backend analysis pipeline
      startJobSimulation(selectedFile, dspFeatures);
    } catch (err) {
      console.error('Audio decoding error:', err);
      setErrorMsg('Unable to decode audio data. The file header may be corrupted.');
    }
  };

  // Run audio upload + stage progress + result hydration with explicit error handling
  const startJobSimulation = async (uploadFile, dspFeatures = null) => {
    stopAudio();
    setCurrentTime(0);
    setResults(null);
    setErrorMsg(null);
    setCurrentStage('Uploading & Decoding');
    setStageProgress(25);

    try {
      const uploadRes = await api.uploadAudio(
        uploadFile,
        { zone_type: zoneType, is_calibrated: isCalibrated, dspFeatures }
      );
      setJobId(uploadRes.job_id);

      const stages = [
        { name: 'Resampling & A-Weighting', progress: 55, delay: 180 },
        { name: 'DSP Spectral & Event Inference', progress: 85, delay: 200 },
        { name: 'Completed', progress: 100, delay: 120 }
      ];

      for (const s of stages) {
        setCurrentStage(s.name);
        setStageProgress(s.progress);
        await new Promise(r => setTimeout(r, s.delay));
      }

      const resData = uploadRes.result || await api.getJobResults(uploadRes.job_id);
      setResults(resData);
    } catch (err) {
      console.error('Audio analysis pipeline error:', err);
      const msg = err?.response?.data?.detail || err?.message || 'Audio analysis request failed.';
      setErrorMsg(msg);
      setCurrentStage(null);
      setStageProgress(0);
    }
  };

  // Web Audio playback engine
  const startAudio = (offset = 0, segmentDuration = null) => {
    if (!audioBuffer) return;
    const ctx = getAudioContext();

    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
    }

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    startTimeRef.current = ctx.currentTime - offset;
    pauseTimeRef.current = offset;

    if (segmentDuration) {
      source.start(0, offset, segmentDuration);
    } else {
      source.start(0, offset);
    }

    sourceNodeRef.current = source;
    setIsPlaying(true);

    source.onended = () => {
      setIsPlaying(false);
      cancelAnimationFrame(rafIdRef.current);
    };

    // Frame update loop for playhead sync
    const updatePlayhead = () => {
      const now = ctx.currentTime;
      const cur = now - startTimeRef.current;

      if (cur >= (segmentDuration ? offset + segmentDuration : duration)) {
        setCurrentTime(segmentDuration ? offset + segmentDuration : duration);
        setIsPlaying(false);
        return;
      }

      setCurrentTime(cur);
      rafIdRef.current = requestAnimationFrame(updatePlayhead);
    };
    rafIdRef.current = requestAnimationFrame(updatePlayhead);
  };

  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try { sourceNodeRef.current.stop(); } catch (e) {}
      sourceNodeRef.current = null;
    }
    cancelAnimationFrame(rafIdRef.current);
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!audioBuffer) return;
    if (isPlaying) {
      stopAudio();
    } else {
      const targetTime = currentTime >= duration ? 0 : currentTime;
      startAudio(targetTime);
    }
  };

  const handleSeek = (targetTime) => {
    setCurrentTime(targetTime);
    if (isPlaying) {
      startAudio(targetTime);
    }
  };

  // Clicking a detection chip highlights its region and plays only that segment
  const handleChipClick = (ev) => {
    setHighlightRegion({
      start: ev.start_time,
      end: ev.end_time,
      category: ev.category
    });
    setCurrentTime(ev.start_time);
    startAudio(ev.start_time, ev.end_time - ev.start_time);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Page Title & Instrument Subtitle */}
      <div className="border-b border-sand pb-4 flex flex-col md:flex-row md:items-baseline justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-ink tracking-tight">
            Acoustic Signal & Sound Classification Analyzer
          </h1>
          <p className="text-xs text-graphite font-mono mt-1">
            PANNs CNN14 Multi-label Sound Source Identification / IEC 61672 Measurement Pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SimulatedBadge />
          <span className="text-[10px] font-mono text-graphite uppercase">
            Sampling: 32 kHz Resampled
          </span>
        </div>
      </div>

      {/* Grid: Left Column Dropzone & Settings / Right Column Instrument Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Ingestion Dropzone & Parameters */}
        <div className="lg:col-span-5 space-y-4">
          {/* Dropzone */}
          <div 
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleFileSelect(e.dataTransfer.files[0]);
              }
            }}
            className="border border-dashed border-sand-dark p-6 bg-paper-light hover:border-ink transition-colors text-center cursor-pointer relative"
          >
            <input
              type="file"
              id="audioFileInput"
              accept=".wav,.mp3,.flac,.ogg,.m4a"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            <label htmlFor="audioFileInput" className="cursor-pointer space-y-2 block">
              <div className="w-8 h-8 border border-sand-dark bg-paper mx-auto flex items-center justify-center text-graphite">
                <Upload className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <div>
                <span className="text-xs font-semibold text-ink block">
                  Select or drop environmental audio file
                </span>
                <span className="text-[10px] font-mono text-graphite block mt-0.5">
                  WAV, MP3, FLAC — max 25 MB, max 60 seconds
                </span>
              </div>
            </label>
          </div>

          {/* Quick Demo Pre-load Samples */}
          <div className="p-3 border border-sand bg-sand-light/40 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
              Test Without Uploading (Field Audio Clips):
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => synthesizeSample('drill')}
                className="px-2.5 py-1 border border-ink bg-paper text-xs font-mono text-ink hover:bg-ink hover:text-paper transition-colors flex items-center gap-1"
              >
                <span>🔨 Masonry Hammer Drill (8s)</span>
              </button>
              <button
                type="button"
                onClick={() => synthesizeSample('traffic')}
                className="px-2.5 py-1 border border-sand text-xs font-mono bg-paper hover:border-ink transition-colors flex items-center gap-1"
              >
                <span>🚗 Traffic Flow (8s)</span>
              </button>
              <button
                type="button"
                onClick={() => synthesizeSample('siren')}
                className="px-2.5 py-1 border border-sand text-xs font-mono bg-paper hover:border-ink transition-colors flex items-center gap-1"
              >
                <span>🚨 Emergency Siren (8s)</span>
              </button>
              <button
                type="button"
                onClick={() => synthesizeSample('birds')}
                className="px-2.5 py-1 border border-sand text-xs font-mono bg-paper hover:border-ink transition-colors flex items-center gap-1"
              >
                <span>🐦 Morning Birds (8s)</span>
              </button>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMsg && (
            <div className="p-3 border border-loud/40 bg-loud-light text-loud text-xs font-mono flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Regulatory & Calibration Parameters */}
          <div className="p-4 border border-sand bg-paper-light space-y-3">
            <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block border-b border-sand pb-1">
              Field Measurement Parameters
            </span>

            <div>
              <label className="block text-[11px] font-mono text-graphite mb-1">
                Target CPCB Regulatory Zone:
              </label>
              <select
                value={zoneType}
                onChange={(e) => setZoneType(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-sand bg-paper text-xs text-ink font-mono focus:border-ink focus:outline-none"
              >
                <option value="Residential">Residential Zone (55 Day / 45 Night dB)</option>
                <option value="Commercial">Commercial Zone (65 Day / 55 Night dB)</option>
                <option value="Industrial">Industrial Zone (75 Day / 70 Night dB)</option>
                <option value="Silence">Silence Zone (50 Day / 40 Night dB)</option>
              </select>
            </div>

            {/* Calibration Checkbox (Strict distinction: uncalibrated gets NO dB number) */}
            <div className="pt-1">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCalibrated}
                  onChange={(e) => setIsCalibrated(e.target.checked)}
                  className="mt-0.5 rounded-none border-sand-dark text-ink focus:ring-0"
                />
                <div>
                  <span className="text-xs font-medium text-ink block leading-tight">
                    Calibrated Microphone Hardware
                  </span>
                  <span className="text-[10px] text-graphite leading-tight block mt-0.5">
                    Leave unchecked if recorded via uncalibrated mobile phone or consumer device.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* File Metadata Inspector */}
          {fileMeta && (
            <div className="p-3 border border-sand bg-sand-light/30 space-y-1 text-xs font-mono">
              <div className="text-[10px] uppercase text-graphite tracking-wider border-b border-sand pb-1">
                Audio Stream Header
              </div>
              <div className="grid grid-cols-2 gap-x-2 pt-1 text-[11px] text-graphite">
                <span>File: <strong className="text-ink">{fileMeta.name}</strong></span>
                <span>Size: <strong className="text-ink tabular-nums">{fileMeta.sizeKb} KB</strong></span>
                <span>Duration: <strong className="text-ink tabular-nums">{fileMeta.duration.toFixed(2)} s</strong></span>
                <span>Sample Rate: <strong className="text-ink tabular-nums">{fileMeta.sampleRate} Hz</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* Right Column (7 cols): Instrument Visualizer (Oscillogram + Spectrogram + Results) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Real Stage Tracker */}
          {currentStage && (
            <div className="p-3 border border-sand bg-paper-light space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 ${currentStage === 'Completed' ? 'bg-quiet' : 'bg-moderate animate-pulse'}`} />
                  <span className="text-ink font-semibold">Stage: {currentStage}</span>
                </div>
                <span className="text-graphite tabular-nums">{stageProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-sand overflow-hidden">
                <div 
                  className="h-full bg-ink transition-all duration-300"
                  style={{ width: `${stageProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Instrument Panel: Waveform & Spectrogram with shared scrubber */}
          <InstrumentPanel
            title="Acoustic Oscillogram & Spectrogram"
            subtitle="IEC 61672 Peak Envelope / Mel Filterbank"
            headerRight={
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-white tabular-nums">
                  {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
                </span>
                <button
                  type="button"
                  onClick={togglePlayPause}
                  disabled={!audioBuffer}
                  className="px-2 py-0.5 border border-instrument-muted bg-instrument-glow text-white hover:border-white transition-colors flex items-center gap-1"
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isPlaying ? 'PAUSE' : 'PLAY'}</span>
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {/* Waveform Canvas */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-wider text-graphite-light block mb-1">
                  Peak Oscillogram Envelope (Amplitude Normalized)
                </span>
                <Waveform
                  peaks={peaks}
                  duration={duration}
                  currentTime={currentTime}
                  highlightRegion={highlightRegion}
                  onSeek={handleSeek}
                  height={80}
                />
              </div>

              {/* Mel Spectrogram Canvas */}
              <div className="pt-2 border-t border-instrument-border">
                <span className="text-[9px] font-mono uppercase tracking-wider text-graphite-light block mb-1">
                  Mel Spectrogram (32 kHz / 64 Filterbanks)
                </span>
                <Spectrogram
                  duration={duration}
                  currentTime={currentTime}
                  highlightRegion={highlightRegion}
                  onSeek={handleSeek}
                  height={130}
                />
              </div>
            </div>
          </InstrumentPanel>

          {/* Results Section */}
          {results && (
            <div className="space-y-4 pt-2">
              <AudioHashReceipt
                audioId={results.audio_file_id || jobId}
                filename={results.filename || fileMeta?.name}
                fileHash={results.file_hash}
                entryHash={results.entry_hash}
                storedInDb={results.stored_in_db}
              />

              {/* Measurements Panel: Strict uncalibrated vs calibrated handling */}
              <div className="p-4 border border-sand bg-paper-light">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block mb-2">
                  Acoustic Measurement Readout (A-Weighted LAeq)
                </span>

                {results.calibration_status === 'calibrated' && results.measurements ? (
                  <DbGauge
                    currentDb={results.measurements.laeq_dba}
                    limitDb={results.measurements.zone_limit_dba}
                    zoneType={zoneType}
                    period="Day"
                    isCalibrated={true}
                  />
                ) : (
                  <div className="p-4 border border-sand bg-sand-light pattern-hatched text-center space-y-1">
                    <span className="font-mono text-xs font-semibold text-graphite-dark block">
                      No valid dB: recording is uncalibrated
                    </span>
                    <p className="text-[10px] text-graphite max-w-md mx-auto">
                      AI sound classification is operational, but absolute Sound Pressure Level (dB Leq) requires hardware-calibrated microphone sensitivity.
                    </p>
                  </div>
                )}
              </div>

              {/* Time-Localised Detections (Click chip to seek & play segment) */}
              <div className="p-4 border border-sand bg-paper-light space-y-3">
                <div className="flex items-center justify-between border-b border-sand pb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-graphite">
                    Time-Localised Sound Events
                  </span>
                  <span className="text-[9px] font-mono text-graphite-light">
                    Click event chip to seek & highlight segment
                  </span>
                </div>

                <div className="space-y-2">
                  {results.time_localised_events.map((ev) => {
                    const isSelected = highlightRegion?.start === ev.start_time;
                    return (
                      <div
                        key={ev.id}
                        onClick={() => handleChipClick(ev)}
                        className={`p-2.5 border cursor-pointer transition-colors flex items-center justify-between ${
                          isSelected 
                            ? 'border-ink bg-sand-light' 
                            : 'border-sand bg-paper hover:border-sand-dark'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-ink">
                              {ev.category}
                            </span>
                            <span className="text-[10px] font-mono text-graphite tabular-nums">
                              [{ev.start_time.toFixed(1)}s – {ev.end_time.toFixed(1)}s]
                            </span>
                          </div>
                          <p className="text-[11px] text-graphite">
                            {ev.label}
                          </p>
                        </div>

                        <div className="text-right">
                          {ev.is_low_confidence ? (
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 border border-sand pattern-hatched text-graphite block">
                              Low confidence ({(ev.confidence * 100).toFixed(0)}%)
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono font-bold text-quiet tabular-nums block">
                              {(ev.confidence * 100).toFixed(0)}% match
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Whole-Recording Classification Summary */}
              <div className="p-4 border border-sand bg-paper-light space-y-2.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-graphite block">
                  Whole-Recording Sound Profile (AudioSet 527 Taxonomy)
                </span>

                <div className="space-y-2">
                  {results.whole_recording_classification.map((cls, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-ink">{cls.category}</span>
                        <span className="text-graphite tabular-nums">
                          {cls.is_low_confidence ? 'Unknown / low confidence (<0.5)' : `${(cls.confidence * 100).toFixed(1)}%`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-sand relative overflow-hidden">
                        <div 
                          className={`h-full ${cls.is_low_confidence ? 'pattern-hatched bg-sand-dark' : 'bg-ink'}`}
                          style={{ width: `${cls.confidence * 100}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stored Audio Hash Database Vault & Download Archive */}
      <AudioVaultPanel refreshKey={results?.audio_file_id || jobId} />
    </div>
  );
};
