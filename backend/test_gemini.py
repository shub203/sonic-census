import urllib.request
import json
import io
import wave
import math

# Generate 2 seconds of synthetic drill noise
buf = io.BytesIO()
with wave.open(buf, 'wb') as wf:
    wf.setnchannels(1)
    wf.setsampwidth(2)
    wf.setframerate(16000)
    for i in range(32000):
        t = i / 16000.0
        val = int(32767 * 0.4 * (math.sin(2 * math.pi * 1850 * t) + math.sin(2 * math.pi * 3700 * t) * 0.4))
        wf.writeframesraw(val.to_bytes(2, byteorder='little', signed=True))
audio_bytes = buf.getvalue()

boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW'
body = (
    b'--' + boundary.encode() + b'\r\n'
    b'Content-Disposition: form-data; name="file"; filename="rotary_hammer_drill.wav"\r\n'
    b'Content-Type: audio/wav\r\n\r\n' +
    audio_bytes +
    b'\r\n--' + boundary.encode() + b'\r\n'
    b'Content-Disposition: form-data; name="zone_type"\r\n\r\n'
    b'Residential\r\n--' + boundary.encode() + b'--\r\n'
)

req = urllib.request.Request(
    'http://localhost:8000/api/v1/audio/gemini-screen',
    data=body,
    headers={'Content-Type': f'multipart/form-data; boundary={boundary}'}
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        print('STATUS:', resp.status)
        data = json.loads(resp.read().decode())
        print('CATEGORY:', data.get('category'))
        print('SUBCATEGORY:', data.get('sub_category'))
        print('CONFIDENCE:', data.get('confidence'))
        print('ESTIMATED DB:', data.get('estimated_db'))
        print('AI ENGINE:', data.get('ai_engine'))
        print('DESCRIPTION:', data.get('description'))
except Exception as e:
    print('ERROR:', e)
    if hasattr(e, 'read'):
        print('BODY:', e.read().decode())
