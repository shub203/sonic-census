import React, { useEffect, useRef } from 'react';

/**
 * AsciiPalpitationBackground (Cyber-Acoustic Telemetry HUD)
 * ─────────────────────────────────────────────────────────────
 * Ultra-techy, tactical acoustic telemetry soundscape.
 * Combines:
 *  - 360° Sonar Radar Range Rings & Radial Scan Sweeps
 *  - Digital Oscilloscope Heartbeat Waveform (Favicon Pulse) with Laser Tracer
 *  - High-Tech HUD Crosshairs, Corner Reticles & Floating Sensor Node Chips
 *  - 48-Band ASCII FFT Audio Spectrum Equalizer (░▒▓█)
 *  - Hex / Sampling Data Stream Matrix ([48kHz], [SNR: +28dB], [FFT-2048])
 *  - Interactive Tactical Mouse Target Reticle with Live dBA Telemetry
 */
export const AsciiPalpitationBackground = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let width = (canvas.width = canvas.offsetWidth || window.innerWidth || 1200);
    let height = (canvas.height = canvas.offsetHeight || window.innerHeight || 800);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth || window.innerWidth || 1200;
      height = canvas.height = canvas.offsetHeight || window.innerHeight || 800;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
      mouseRef.current.active = true;
    };
    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Monospace cell dimensions
    const CHAR_W = 11;
    const CHAR_H = 17;
    const FONT = '12px "IBM Plex Mono", "Courier New", monospace';
    const FONT_SMALL = '10px "IBM Plex Mono", "Courier New", monospace';

    // Interactive Sonar shockwaves pool
    const sonarShockwaves = [];
    let lastShockwaveTime = 0;

    // IoT Sensor Nodes pinned across the field
    const NODES = [
      { id: 'NODE-01', code: 'DEL-CP', zone: 'COMMERCIAL', db: 63.8, normX: 0.16, normY: 0.28 },
      { id: 'NODE-02', code: 'DEL-AIIMS', zone: 'SILENCE', db: 42.4, normX: 0.82, normY: 0.30 },
      { id: 'NODE-03', code: 'MUM-BKC', zone: 'COMMERCIAL', db: 58.6, normX: 0.18, normY: 0.76 },
      { id: 'NODE-04', code: 'BLR-IND', zone: 'RESIDENTIAL', db: 52.1, normX: 0.84, normY: 0.78 }
    ];

    const startTime = performance.now();

    const render = () => {
      const now = performance.now();
      const time = (now - startTime) / 1000; // seconds

      ctx.clearRect(0, 0, width, height);

      const cols = Math.ceil(width / CHAR_W);
      const rows = Math.ceil(height / CHAR_H);
      const centerRow = Math.floor(rows * 0.48);
      const centerCol = Math.floor(cols * 0.5);

      // Heartbeat Palpitation cycle (~1.25s)
      const beatPeriod = 1.25;
      const beatPhase = (time % beatPeriod) / beatPeriod;

      // Systolic Palpitation Thump
      const thump = Math.exp(-Math.pow((beatPhase - 0.22) * 22, 2)) * 1.6;
      const palpitationScale = 1.0 + Math.max(0, thump) * 0.7;

      // Trigger high-tech sonar shockwave pulse on heartbeat thump
      if (beatPhase > 0.20 && beatPhase < 0.25 && now - lastShockwaveTime > 600) {
        sonarShockwaves.push({
          col: centerCol,
          row: centerRow,
          radius: 2,
          maxRadius: Math.max(cols, rows) * 1.35,
          speed: 1.1,
          alpha: 0.75
        });
        lastShockwaveTime = now;
      }

      ctx.font = FONT;
      ctx.textBaseline = 'top';

      // ── 1. TACTICAL HUD CORNER BRACKETS & CARTOGRAPHIC CROSSHAIRS ──
      // Top-Left Reticle
      ctx.fillStyle = 'rgba(74, 81, 87, 0.45)';
      ctx.fillText('┌──[ SYS: ACOUSTIC TELEMETRY ENGINE ]─────────────────┐', 18, 14);
      ctx.fillText('│ PROTOCOL: IEC-61672-1:2013 · CLASS 1 SOUND MONITOR  │', 18, 30);
      ctx.fillText('│ DSP MODE: HANN WINDOW 2048-PT FFT · 48.0 kHz 24-BIT │', 18, 46);
      ctx.fillText('└──[ STATUS: ONLINE · SYNC: LIVE IST · JITTER: 0.2ms ]┘', 18, 62);

      // Top-Right Reticle
      if (width > 750) {
        const rightX = width - 420;
        ctx.fillText('┌──[ CPCB STATUTORY REGISTRY · 2000 ]────────┐', rightX, 14);
        ctx.fillText('│ RESIDENTIAL DAY LIMIT : 55.0 dB(A) LEQ     │', rightX, 30);
        ctx.fillText('│ COMMERCIAL DAY LIMIT  : 65.0 dB(A) LEQ     │', rightX, 46);
        ctx.fillText('└──[ GRID REF: 28°36\'48"N 77°12\'32"E ]───────┘', rightX, 62);
      }

      // ── 2. TECHNICAL MILLIMETER GRID WITH DUAL-AXIS TICKS ──
      for (let r = 5; r < rows - 4; r += 2) {
        for (let c = 4; c < cols - 4; c += 4) {
          const isMajor = (c % 16 === 0) && (r % 6 === 0);
          const char = isMajor ? '+' : '·';
          const alpha = isMajor ? 0.20 : 0.08;

          const x = c * CHAR_W;
          const y = r * CHAR_H;

          // Mouse proximity HUD excitation
          const mDist = Math.hypot(x - mouseRef.current.x, y - mouseRef.current.y);
          const mouseGlow = mDist < 140 ? (1 - mDist / 140) * 0.25 : 0;

          ctx.fillStyle = `rgba(74, 81, 87, ${alpha + mouseGlow})`;
          ctx.fillText(char, x, y);
        }
      }

      // ── 3. 360° SONAR RADAR RANGE RINGS & ROTATING SWEEP BEAM ──
      const radarCenterX = centerCol * CHAR_W;
      const radarCenterY = centerRow * CHAR_H;
      const radarMaxRadius = Math.min(width, height) * 0.42;

      // Concentric Fixed Range Rings with Distance Markers
      const RANGE_RINGS = [0.25, 0.50, 0.75, 1.0];
      RANGE_RINGS.forEach((pct) => {
        const rad = radarMaxRadius * pct;
        const ringChars = Math.floor(rad * 0.35);

        for (let i = 0; i < ringChars; i++) {
          const angle = (i / ringChars) * Math.PI * 2;
          const rx = radarCenterX + Math.cos(angle) * rad;
          const ry = radarCenterY + Math.sin(angle) * (rad * 0.48); // oval perspective
          const c = Math.floor(rx / CHAR_W);
          const r = Math.floor(ry / CHAR_H);

          if (c >= 2 && c < cols - 2 && r >= 2 && r < rows - 2) {
            // Segmented technical dash
            const dashChar = (i % 8 === 0) ? '+' : (i % 4 === 0) ? '-' : '·';
            ctx.fillStyle = 'rgba(74, 81, 87, 0.14)';
            ctx.fillText(dashChar, c * CHAR_W, r * CHAR_H);
          }
        }

        // Radar Range Label
        const labelX = radarCenterX + rad * 0.707;
        const labelY = radarCenterY - (rad * 0.48) * 0.707;
        ctx.font = FONT_SMALL;
        ctx.fillStyle = 'rgba(74, 81, 87, 0.32)';
        ctx.fillText(`[RNG: ${Math.round(pct * 250)}m]`, labelX + 4, labelY);
        ctx.font = FONT;
      });

      // Rotating Sonar Radar Sweep Beam (Sweep period: 6 seconds)
      const sweepAngle = (time * 0.95) % (Math.PI * 2);
      const sweepSteps = 24;
      for (let s = 0; s < sweepSteps; s++) {
        const frac = s / sweepSteps;
        const bRad = radarMaxRadius * frac;
        const bx = radarCenterX + Math.cos(sweepAngle) * bRad;
        const by = radarCenterY + Math.sin(sweepAngle) * (bRad * 0.48);
        const c = Math.floor(bx / CHAR_W);
        const r = Math.floor(by / CHAR_H);

        if (c >= 0 && c < cols && r >= 0 && r < rows) {
          ctx.fillStyle = `rgba(47, 111, 99, ${0.45 * (1 - frac * 0.4)})`;
          ctx.fillText('█', c * CHAR_W, r * CHAR_H);
        }
      }

      // ── 4. EXPANDING SONAR SHOCKWAVES (RADAR HEARTBEAT RIPPLES) ──
      for (let i = sonarShockwaves.length - 1; i >= 0; i--) {
        const rip = sonarShockwaves[i];
        rip.radius += rip.speed;
        rip.alpha -= 0.0055;

        if (rip.alpha <= 0 || rip.radius > rip.maxRadius) {
          sonarShockwaves.splice(i, 1);
          continue;
        }

        const ringPoints = Math.floor(rip.radius * 3.6);
        const techRingChars = ['═', '─', '┌', '┐', '└', '┘', '┼', ':', '·'];

        for (let p = 0; p < ringPoints; p++) {
          const angle = (p / ringPoints) * Math.PI * 2;
          const c = Math.round(rip.col + Math.cos(angle) * rip.radius);
          const r = Math.round(rip.row + Math.sin(angle) * (rip.radius * 0.45));

          if (c >= 0 && c < cols && r >= 0 && r < rows) {
            const char = techRingChars[(c + r + p) % techRingChars.length];
            const isPulseSpike = Math.abs(angle - Math.PI / 2) < 0.25 || Math.abs(angle - 1.5 * Math.PI) < 0.25;
            const ringColor = isPulseSpike && rip.alpha > 0.35
              ? `rgba(233, 162, 59, ${rip.alpha * 0.85})`
              : `rgba(47, 111, 99, ${rip.alpha * 0.70})`;

            ctx.fillStyle = ringColor;
            ctx.fillText(char, c * CHAR_W, r * CHAR_H);
          }
        }
      }

      // ── 5. DIGITAL OSCILLOSCOPE HEARTBEAT WAVEFORM (FAVICON PULSE) ──
      const cycleCols = Math.max(50, Math.floor(cols * 0.44));
      const sweepSpeed = 0.32;
      const waveShift = (time * sweepSpeed) % 1;
      const maxAmpRows = Math.min(8.0, rows * 0.17);

      const getWaveY = (normX) => {
        const u = ((normX % 1) + 1) % 1;

        // P-wave
        const p = Math.exp(-Math.pow((u - 0.18) / 0.045, 2)) * 0.18;

        // Q-dip
        const q = -Math.exp(-Math.pow((u - 0.32) / 0.016, 2)) * 0.18;

        // R-PEAK: Favicon Giant Spike UP!
        const r = Math.exp(-Math.pow((u - 0.36) / 0.017, 2)) * 1.0 * palpitationScale;

        // S-DIP: Favicon Lightning Valley DOWN!
        const s = -Math.exp(-Math.pow((u - 0.40) / 0.019, 2)) * 0.42 * palpitationScale;

        // T-wave
        const t = Math.exp(-Math.pow((u - 0.58) / 0.068, 2)) * 0.28;

        // Acoustic carrier micro-jitter
        const jitter = Math.sin(normX * Math.PI * 18 + time * 4) * 0.018;

        return (p + q + r + s + t + jitter);
      };

      const waveRows = new Float32Array(cols);
      for (let c = 0; c < cols; c++) {
        const normX = (c / cycleCols) - waveShift;
        waveRows[c] = centerRow - getWaveY(normX) * maxAmpRows;
      }

      // Draw the techy continuous ASCII heartbeat waveform
      for (let c = 0; c < cols; c++) {
        const curRow = Math.round(waveRows[c]);
        const prevRow = c > 0 ? Math.round(waveRows[c - 1]) : curRow;
        const nextRow = c < cols - 1 ? Math.round(waveRows[c + 1]) : curRow;

        const deltaY = curRow - prevRow;
        const nextDeltaY = nextRow - curRow;
        const devFromCenter = centerRow - curRow;
        const isPeak = devFromCenter > maxAmpRows * 0.52;
        const isValley = devFromCenter < -maxAmpRows * 0.22;

        let char = '═';
        if (deltaY < -1 || nextDeltaY < -1) {
          char = '/';
        } else if (deltaY > 1 || nextDeltaY > 1) {
          char = '\\';
        } else if (isPeak) {
          char = '▲';
        } else if (isValley) {
          char = '▼';
        } else if (devFromCenter > 0.6) {
          char = '~';
        } else if (devFromCenter < -0.3) {
          char = '_';
        } else {
          char = (c % 2 === 0) ? '═' : '─';
        }

        let strokeColor = 'rgba(47, 111, 99, 0.78)';
        if (isPeak) {
          strokeColor = thump > 0.35 ? '#E4572E' : '#E9A23B';
        } else if (devFromCenter > 1.2 || isValley) {
          strokeColor = '#E9A23B';
        }

        const x = c * CHAR_W;
        const y = curRow * CHAR_H;

        if (curRow >= 0 && curRow < rows) {
          ctx.fillStyle = strokeColor;
          ctx.fillText(char, x, y);
        }

        // Bridge vertical slope jumps with techy connecting '|'
        if (c > 0) {
          const stepDiff = Math.abs(curRow - prevRow);
          if (stepDiff > 1) {
            const minR = Math.min(curRow, prevRow) + 1;
            const maxR = Math.max(curRow, prevRow) - 1;
            for (let r = minR; r <= maxR; r++) {
              if (r >= 0 && r < rows) {
                ctx.fillStyle = strokeColor;
                ctx.fillText('║', x - (CHAR_W * 0.40), r * CHAR_H);
              }
            }
          }
        }

        // Techy Decibel HUD Banner floating above R-peak
        if (isPeak && (c % 2 === 0)) {
          const liveDb = (54.8 + palpitationScale * 18.2).toFixed(1);
          const alertColor = thump > 0.35 ? '#E4572E' : '#2F6F63';
          ctx.fillStyle = alertColor;
          ctx.fillText(`▲ [LAeq: ${liveDb} dBA]`, x - 35, (curRow - 2) * CHAR_H);
        }
      }

      // ── 6. IOT TELEMETRY SENSOR NODE CHIPS PINNED TO FIELD ──
      NODES.forEach((node) => {
        const nx = Math.floor(cols * node.normX) * CHAR_W;
        const ny = Math.floor(rows * node.normY) * CHAR_H;

        // Subtle live jitter on decibel readings
        const dynamicDb = (node.db + Math.sin(time * 2 + nx) * 1.2).toFixed(1);

        ctx.font = FONT_SMALL;
        ctx.fillStyle = 'rgba(47, 111, 99, 0.85)';
        ctx.fillText(`┌─[${node.id}: ${node.code}]─┐`, nx, ny);
        ctx.fillStyle = 'rgba(20, 24, 27, 0.70)';
        ctx.fillText(`│ ${dynamicDb} dBA · ${node.zone} │`, nx, ny + 12);
        ctx.fillStyle = 'rgba(47, 111, 99, 0.85)';
        ctx.fillText(`└────────────────────┘`, nx, ny + 24);
        ctx.font = FONT;
      });

      // ── 7. 48-BAND ASCII FFT AUDIO SPECTRUM BARS ALONG BOTTOM ──
      const BANDS = 36;
      const spectrumW = Math.floor(cols / BANDS);
      const spectrumBaseRow = rows - 2;

      for (let b = 0; b < BANDS; b++) {
        // High-tech frequency distribution simulation
        const tFreq = b / BANDS;
        const bassBoost = Math.max(0, 1 - tFreq * 1.8) * 0.5;
        const beatSurge = palpitationScale > 1.2 ? 0.3 : 0;
        const amp = (Math.sin(time * 5 + b * 0.4) * 0.3 + 0.5 + bassBoost + beatSurge);
        const barRows = Math.min(6, Math.floor(amp * 4.5));

        const barChars = [' ', '░', '▒', '▓', '█'];
        const barCol = b * spectrumW + 2;

        for (let r = 0; r < barRows; r++) {
          const char = barChars[Math.min(barChars.length - 1, r + 1)];
          const isLoud = r >= 4;
          ctx.fillStyle = isLoud ? 'rgba(233, 162, 59, 0.55)' : 'rgba(47, 111, 99, 0.45)';
          ctx.fillText(char, barCol * CHAR_W, (spectrumBaseRow - r) * CHAR_H);
        }
      }

      ctx.font = FONT_SMALL;
      ctx.fillStyle = 'rgba(74, 81, 87, 0.45)';
      ctx.fillText('[SPECTRUM EQUALIZER · 20 Hz — 20 kHz]', 24, (rows - 2) * CHAR_H + 2);
      ctx.font = FONT;

      // ── 8. INTERACTIVE TACTICAL TARGETING RETICLE ON MOUSE HOVER ──
      if (mouseRef.current.active && mouseRef.current.x > 0 && mouseRef.current.y > 0) {
        const mx = mouseRef.current.x;
        const my = mouseRef.current.y;
        const mCol = Math.floor(mx / CHAR_W);
        const mRow = Math.floor(my / CHAR_H);

        // Tactical Corner Brackets
        ctx.fillStyle = '#2F6F63';
        ctx.fillText('┌   ┐', (mCol - 2) * CHAR_W, (mRow - 2) * CHAR_H);
        ctx.fillText('└   ┘', (mCol - 2) * CHAR_W, (mRow + 1) * CHAR_H);

        // Center reticle
        ctx.fillStyle = '#E9A23B';
        ctx.fillText('+', mCol * CHAR_W, (mRow - 0.5) * CHAR_H);

        // Target Coordinates & Live Sound Pressure Estimate
        const probeDb = (50 + Math.sin(time * 4) * 8 + (my / height) * 20).toFixed(1);
        ctx.font = FONT_SMALL;
        ctx.fillStyle = '#14181B';
        ctx.fillText(`[LOC: ${mCol},${mRow}]`, (mCol + 3) * CHAR_W, (mRow - 2) * CHAR_H);
        ctx.fillStyle = '#2F6F63';
        ctx.fillText(`[PROBE: ${probeDb} dBA]`, (mCol + 3) * CHAR_W, (mRow - 1) * CHAR_H);
        ctx.font = FONT;
      }

      animRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ opacity: 0.95 }}
    />
  );
};

export default AsciiPalpitationBackground;
