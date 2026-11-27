/**
 * Synthesizes environmental acoustic test buffers and encodes Web Audio AudioBuffers
 * into valid 16-bit PCM RIFF/WAV File objects for backend upload and DSP analysis.
 */

export function encodeAudioBufferToWavFile(audioBuffer, filename = 'recording.wav') {
  const numChannels = 1;
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const numSamples = channelData.length;
  const dataBytes = numSamples * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true); // 16-bit samples
  writeString(36, 'data');
  view.setUint32(40, dataBytes, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new File([buffer], filename, { type: 'audio/wav' });
}

export function synthesizeSampleAudioBuffer(ctx, type = 'drill', durationSec = 4.0) {
  const sampleRate = ctx.sampleRate || 16000;
  const length = Math.floor(sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  let phase = 0;
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    if (type === 'drill' || type === 'construction') {
      const motorWhine =
        Math.sin(t * 1850 * Math.PI * 2) * 0.28 +
        Math.sin(t * 3700 * Math.PI * 2) * 0.14;
      const isImpact = t % 0.08 < 0.02;
      const impact = isImpact ? (i % 2 === 0 ? 0.3 : -0.3) : 0;
      data[i] = (motorWhine + impact) * 0.85;
    } else if (type === 'traffic') {
      data[i] =
        Math.sin(t * 120 * Math.PI * 2) * 0.32 +
        Math.sin(t * 80 * Math.PI * 2) * 0.18 +
        (Math.random() * 2 - 1) * 0.06;
    } else if (type === 'siren') {
      const freq = 1100 + Math.sin(t * 2.5 * Math.PI * 2) * 350;
      phase += (2 * Math.PI * freq) / sampleRate;
      data[i] = Math.sin(phase) * 0.48;
    } else if (type === 'birds') {
      data[i] =
        t % 1.2 < 0.3
          ? Math.sin(t * (3800 + Math.sin(t * 45) * 600) * Math.PI * 2) * 0.36
          : Math.sin(t * 400 * Math.PI * 2) * 0.02;
    } else {
      data[i] = Math.sin(t * 440 * Math.PI * 2) * 0.08;
    }
  }

  return buffer;
}
