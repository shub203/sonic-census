import os
from typing import Tuple
from app.config import settings

ALLOWED_EXTENSIONS = {".wav", ".mp3", ".flac", ".ogg", ".m4a"}

def validate_audio_file(file_name: str, file_size: int) -> Tuple[bool, str]:
    """
    Validate audio file extension and size.
    """
    ext = os.path.splitext(file_name)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format '{ext}'. Allowed formats: WAV, MP3, FLAC, OGG, M4A."
    
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if file_size > max_bytes:
        return False, f"File size exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
    
    return True, "Valid"
