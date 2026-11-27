import os
import io
import json
import base64
import urllib.request
from typing import Dict, Any, Optional
from app.config import settings

class GeminiAudioService:
    @staticmethod
    def is_available() -> bool:
        key = settings.GEMINI_API_KEY
        return bool(key and len(key.strip()) > 10)

    @staticmethod
    def analyze_audio(
        file_bytes: bytes = b"",
        filename: str = "audio.wav",
        zone_type: str = "Residential",
        dsp_features: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Uses Google Gemini Multimodal Audio API to classify environmental sounds,
        identify specific tools (e.g. drills, hammer, sirens), and check CPCB compliance.
        """
        if not GeminiAudioService.is_available():
            return None

        # Build prompt
        prompt = f"""You are a senior acoustic scientist and environmental noise inspector for the Indian CPCB (Central Pollution Control Board).
Analyze this environmental audio sample.

File details:
- Filename: {filename}
- Target statutory zone: {zone_type} Zone

Indian CPCB statutory limits (Leq dB(A)):
- Residential: Day 55 dB / Night 45 dB
- Silence (Hospitals/Schools/Colleges): Day 50 dB / Night 40 dB
- Commercial: Day 65 dB / Night 55 dB
- Industrial: Day 75 dB / Night 70 dB

Identify:
1. Primary environmental noise category (must be one of: Construction, Traffic, Emergency, Industrial, Human activity, Nature, Aviation, Other).
2. Exact acoustic source & tool (e.g. "Rotary Hammer Drill & Masonry Impact", "Pneumatic Breaker", "Ambulance Siren", "Diesel Truck Engine", "Birdsong").
3. Confidence score between 0.70 and 0.99.
4. Estimated sound pressure level in dB(A) (e.g. 84 dB for drills, 65 dB for traffic, 88 dB for sirens, 48 dB for birds).
5. Exceedance calculation against the {zone_type} limit.
6. Professional acoustic observation describing motor whine, impacts, or spectral characteristics.
7. Statutory compliance assessment under CPCB Rule 5 (Noise Rules 2000).

Respond ONLY with a valid JSON object matching this schema:
{{
  "category": "Construction",
  "sub_category": "Rotary Hammer Drill & Masonry Impact",
  "confidence": 0.96,
  "estimated_db": 84.5,
  "is_exceeded": true,
  "exceedance_amount": 29.5,
  "description": "High-RPM electric motor whine with persistent percussive masonry impacts in the 1kHz-4kHz range.",
  "compliance_summary": "Exceeds prescribed residential daytime limit (55 dB) by 29.5 dB. Actionable under Rule 5 of Noise Rules 2000.",
  "events": [
    {{
      "id": "ev-1",
      "category": "Construction",
      "label": "Rotary hammer drill surface penetration",
      "start_time": 0.2,
      "end_time": 4.5,
      "confidence": 0.96
    }}
  ],
  "secondary_categories": [
    {{ "category": "Industrial", "confidence": 0.74 }}
  ]
}}"""

        parts = [{"text": prompt}]

        # If audio bytes are provided, include a compact audio snippet (up to 500KB)
        if file_bytes and len(file_bytes) > 44:
            ext = os.path.splitext(filename)[1].lower()
            mime_map = {
                ".wav": "audio/wav",
                ".mp3": "audio/mp3",
                ".flac": "audio/flac",
                ".ogg": "audio/ogg",
                ".m4a": "audio/m4a"
            }
            mime_type = mime_map.get(ext, "audio/wav")

            # Slice up to 512 KB to ensure rapid network transfer
            snippet = file_bytes[:512 * 1024]
            audio_b64 = base64.b64encode(snippet).decode("utf-8")
            parts.append({"inlineData": {"mimeType": mime_type, "data": audio_b64}})

        api_key = settings.GEMINI_API_KEY.strip()
        models = ["gemini-2.0-flash", "gemini-1.5-flash"]

        for model in models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            payload = {
                "contents": [{"parts": parts}],
                "generationConfig": {
                    "responseMimeType": "application/json",
                    "temperature": 0.1
                }
            }

            try:
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
                with urllib.request.urlopen(req, timeout=8) as response:
                    res_body = json.loads(response.read().decode("utf-8"))
                    text = res_body["candidates"][0]["content"]["parts"][0]["text"]
                    parsed = json.loads(text)
                    parsed["ai_engine"] = f"Google Gemini ({model})"
                    return parsed
            except Exception as e:
                print(f"[Gemini Audio API Notice] {model}: {e}")
                continue

        return None
