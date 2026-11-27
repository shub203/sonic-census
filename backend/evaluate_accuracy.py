import io
import os
import sys
import wave
import math
import time
import soundfile as sf

from app.audio.measurement import calculate_acoustic_metrics
from app.ml.inference import classify_audio_recording
from app.services.gemini_service import GeminiAudioService


def generate_tone_buffer(duration_sec=3.0, sr=16000, sound_type="drill"):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        num_samples = int(duration_sec * sr)
        for i in range(num_samples):
            t = i / float(sr)
            if sound_type == "drill":
                val = 0.4 * math.sin(2 * math.pi * 1850 * t) + 0.2 * math.sin(2 * math.pi * 3700 * t)
                if (t % 0.08) < 0.02:
                    val += 0.3 * (1.0 if (i % 2 == 0) else -1.0)
            elif sound_type == "siren":
                freq = 1100 + 350 * math.sin(2 * math.pi * 2.5 * t)
                val = 0.5 * math.sin(2 * math.pi * freq * t)
            elif sound_type == "birds":
                val = 0.4 * math.sin(2 * math.pi * 3800 * t) if (t % 1.2 < 0.3) else 0.02 * math.sin(2 * math.pi * 400 * t)
            elif sound_type == "traffic":
                val = 0.3 * math.sin(2 * math.pi * 120 * t) + 0.15 * math.sin(2 * math.pi * 80 * t)
            else:
                val = 0.1 * math.sin(2 * math.pi * 440 * t)

            sample = int(max(-1.0, min(1.0, val)) * 32767)
            wf.writeframesraw(sample.to_bytes(2, byteorder="little", signed=True))
    return buf.getvalue()


TEST_CASES = [
    {"name": "Rotary Hammer Drill on Concrete", "type": "drill", "expected": "Construction"},
    {"name": "Emergency Ambulance Siren", "type": "siren", "expected": "Emergency"},
    {"name": "Morning Passerine Birdsong", "type": "birds", "expected": "Nature"},
    {"name": "Arterial Highway Traffic Flow", "type": "traffic", "expected": "Traffic"},
    {"name": "Low Ambient Background (Ambiguous)", "type": "random", "expected": "Other"},
]


def run_benchmark(use_gemini: bool = False):
    print("=" * 70)
    print("ACCURACY & BENCHMARK EVALUATION TEST: SONIC CENSUS (REAL INFERENCE)")
    print("=" * 70)

    correct_top1 = 0
    for idx, tc in enumerate(TEST_CASES, 1):
        raw_wav = generate_tone_buffer(duration_sec=3.0, sr=16000, sound_type=tc["type"])
        t0 = time.perf_counter()

        gemini_out = None
        if use_gemini and GeminiAudioService.is_available():
            gemini_out = GeminiAudioService.analyze_audio(
                file_bytes=raw_wav,
                filename=f"{tc['type']}_sample.wav",
                zone_type="Residential",
            )

        audio_data, sr = sf.read(io.BytesIO(raw_wav), dtype="float32")
        dsp_out = classify_audio_recording(audio_data, sr)
        metrics = calculate_acoustic_metrics(audio_data, sr, is_calibrated=False)
        latency = round((time.perf_counter() - t0) * 1000.0, 2)

        if gemini_out:
            pred_cat = gemini_out.get("category", dsp_out["top_category"])
            confidence = gemini_out.get("confidence", dsp_out["top_confidence"])
            engine = gemini_out.get("ai_engine", "Gemini")
        else:
            pred_cat = dsp_out["top_category"]
            confidence = dsp_out["top_confidence"]
            engine = dsp_out["model"]

        is_match = pred_cat.lower() == tc["expected"].lower()
        if is_match:
            correct_top1 += 1

        print(f"\n[Test {idx}/{len(TEST_CASES)}] {tc['name']}")
        print(f"  * Expected Category:  {tc['expected']}")
        print(f"  * Predicted Category: {pred_cat} ({round(confidence * 100, 1)}%)")
        print(f"  * Acoustic LAeq:      {metrics['laeq']} dB(A)")
        print(f"  * Latency:            {latency} ms")
        print(f"  * Engine Active:      {engine}")
        print(f"  * Match Result:       {'PASS' if is_match else 'FAIL'}")

    # Also test repo sample_audio files if present
    sample_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "sample_audio")
    sample_checks = [
        ("traffic_horn_sample.wav", "Traffic"),
        ("construction_hammer_sample.wav", "Construction"),
    ]
    extra_total = 0
    extra_ok = 0
    for fname, exp in sample_checks:
        fpath = os.path.join(sample_dir, fname)
        if os.path.exists(fpath):
            extra_total += 1
            data, sr = sf.read(fpath, dtype="float32")
            out = classify_audio_recording(data, sr)
            ok = out["top_category"].lower() == exp.lower()
            if ok:
                extra_ok += 1
            print(f"\n[Sample WAV] {fname} -> expected={exp}, predicted={out['top_category']} ({round(out['top_confidence'] * 100, 1)}%) [{'PASS' if ok else 'FAIL'}]")

    tot = len(TEST_CASES) + extra_total
    ok_all = correct_top1 + extra_ok
    accuracy_pct = round((ok_all / tot) * 100, 1) if tot else 0.0
    print("\n" + "=" * 70)
    print(f"FINAL ACCURACY SUMMARY: {accuracy_pct}% Top-1 Match ({ok_all}/{tot})")
    print("=" * 70)


if __name__ == "__main__":
    run_benchmark(use_gemini="--gemini" in sys.argv)
