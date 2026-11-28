import os
import json
import asyncio
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, Query, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database.connection import get_db
from app.database.models import (
    AudioVaultEntry,
    AudioFile,
    ProcessingJob,
    SoundEvent,
    Measurement,
    ComplianceAssessment,
)
from app.services.audio_service import AudioService
from app.services.gemini_service import GeminiAudioService
from app.services.audit_service import AuditService
from app.security.rate_limit import rate_limit, rate_limiter, get_client_ip
from app.dependencies import get_current_user, require_officer

router = APIRouter(prefix="/audio", tags=["Audio Analysis"])


def _audio_hash_metadata(audio: AudioFile, stored_in_db: bool) -> dict:
    """Return consistent hash and DB download metadata for audio responses."""
    return {
        "file_hash": audio.file_hash,
        "entry_hash": audio.entry_hash,
        "hash_algorithm": "SHA-256",
        "stored_in_db": stored_in_db,
        "download_url": f"{settings.API_V1_STR}/audio/{audio.id}/download",
        "vault_download_url": (
            f"{settings.API_V1_STR}/audio/by-hash/{audio.file_hash}/download"
            if audio.file_hash
            else None
        ),
    }


def _audio_binary_response(
    blob: bytes,
    filename: str,
    mime_type: str,
    file_hash: str,
    entry_hash: str | None = None,
) -> Response:
    """Construct an attachment Response for DB-stored audio bytes with SHA-256 integrity headers."""
    safe_name = (filename or f"{file_hash}.wav").replace('"', "")
    headers = {
        "Content-Disposition": f'attachment; filename="{safe_name}"',
        "X-Audio-SHA256": file_hash,
        "X-Content-Source": "database-blob",
        "Access-Control-Expose-Headers": "Content-Disposition, X-Audio-SHA256, X-Entry-SHA256, X-Content-Source",
    }
    if entry_hash:
        headers["X-Entry-SHA256"] = entry_hash
    return Response(content=blob, media_type=mime_type, headers=headers)


@router.post("/gemini-screen")
async def gemini_audio_screen(
    file: UploadFile = File(...),
    zone_type: str = Form("Residential"),
    is_calibrated: bool = Form(False),
):
    """
    Direct multimodal audio screening powered by Google Gemini AI.
    Analyzes raw audio waveform, identifies exact sound sources (e.g. rotary drill, siren),
    calculates CPCB statutory exceedance, and generates compliance narratives.
    """
    contents = await file.read()
    gemini_result = await asyncio.to_thread(
        GeminiAudioService.analyze_audio,
        file_bytes=contents,
        filename=file.filename,
        zone_type=zone_type,
    )
    if not gemini_result:
        raise HTTPException(
            status_code=503,
            detail="Gemini AI service unavailable. Falling back to local DSP engine.",
        )
    return gemini_result


@router.post("/uploads")
async def upload_audio(
    request: Request,
    file: UploadFile = File(...),
    zone_type: str = Form("Residential"),
    is_calibrated: bool = Form(False),
    use_gemini: bool = Form(False),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Receives WAV, MP3, FLAC recording, vaults its SHA-256 hash & raw binary in DB,
    and executes the full DSP + compliance pipeline.
    """
    if settings.RATE_LIMIT_ENABLED:
        client_ip = get_client_ip(request)
        limit = 60 if user else 15
        rate_limiter.check(f"audio_upload:{client_ip}", max_requests=limit, window_seconds=3600)

    user_id = user.id if user else None
    audio_record = await AudioService.process_uploaded_audio(
        file=file,
        db=db,
        user_id=user_id,
        zone_type=zone_type,
        is_calibrated=is_calibrated,
        use_gemini=use_gemini,
    )

    AuditService.log_event(
        db=db,
        action="audio.upload",
        resource_type="audio_file",
        resource_id=audio_record.id,
        actor=user,
        request=request,
        details={"filename": audio_record.original_filename, "file_hash": audio_record.file_hash},
    )

    events = db.query(SoundEvent).filter(SoundEvent.audio_file_id == audio_record.id).all()
    meas = db.query(Measurement).filter(Measurement.audio_file_id == audio_record.id).first()
    assessment = (
        db.query(ComplianceAssessment).filter(ComplianceAssessment.measurement_id == meas.id).first()
        if meas
        else None
    )

    waveform = []
    if audio_record.waveform_data:
        try:
            waveform = json.loads(audio_record.waveform_data)
        except Exception:
            waveform = []

    return {
        "id": audio_record.id,
        "original_filename": audio_record.original_filename,
        "file_format": audio_record.file_format,
        "file_size": audio_record.file_size,
        "duration": audio_record.duration,
        "sample_rate": audio_record.sample_rate,
        "processing_status": audio_record.processing_status,
        **_audio_hash_metadata(audio_record, stored_in_db=bool(audio_record.file_hash)),
        "waveform": waveform,
        "spectrogram_url": (
            f"{settings.API_V1_STR}/audio/{audio_record.id}/spectrogram"
            if (audio_record.spectrogram_blob or audio_record.spectrogram_path)
            else None
        ),
        "acoustic_measurement": {
            "laeq": meas.laeq if meas else None,
            "lmax": meas.lmax if meas else None,
            "duration": meas.measurement_duration if meas else None,
            "frequency_weighting": meas.frequency_weighting if meas else "A",
            "time_weighting": meas.time_weighting if meas else "Fast",
            "calibration_status": meas.calibration_status if meas else "uncalibrated",
        } if meas else None,
        "compliance": {
            "zone_type": assessment.zone_type if assessment else zone_type,
            "time_period": assessment.time_period if assessment else "Day",
            "threshold_db": assessment.threshold_db if assessment else 55.0,
            "outcome": assessment.outcome if assessment else "within_limit",
            "exceedance_amount": assessment.exceedance_amount if assessment else 0.0,
            "notes": assessment.notes if assessment else "",
        } if assessment else None,
        "sound_events": [
            {
                "category": e.category,
                "confidence": e.confidence_score,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "model_name": e.model_name,
            }
            for e in events
        ],
    }


@router.get("")
def list_audio_files(db: Session = Depends(get_db), user=Depends(require_officer)):
    manifest = AudioService.list_vault_entries(db, limit=50)
    return [
        {
            "id": e["id"],
            "original_filename": e["original_filename"],
            "file_format": e["file_format"],
            "file_size": e["file_size"],
            "duration": e["duration"],
            "uploaded_at": e["uploaded_at"],
            "processing_status": "completed",
            "primary_category": e["primary_category"],
            "primary_confidence": e["primary_confidence"],
            "laeq": e["laeq"],
            "calibration_status": e["calibration_status"],
            "file_hash": e["file_hash"],
            "entry_hash": e["entry_hash"],
            "hash_algorithm": e["hash_algorithm"],
            "stored_in_db": e["stored_in_db"],
            "download_url": e["download_url"],
            "vault_download_url": e["vault_download_url"],
        }
        for e in manifest["entries"]
    ]


@router.get("/vault")
def get_audio_vault(
    limit: int = Query(200, ge=1, le=1000),
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    """Officer endpoint listing all hashed audio database entries and vault statistics."""
    return AudioService.list_vault_entries(db, limit=limit)


@router.get(
    "/vault/export",
    dependencies=[Depends(rate_limit("vault_export", max_requests=15, window_seconds=60))],
)
def export_audio_vault(
    request: Request,
    format: str = Query("zip"),
    include_base64: bool = Query(False),
    db: Session = Depends(get_db),
    user=Depends(require_officer),
):
    """Officer endpoint to download the entire hashed audio database in ZIP, JSON, or CSV form."""
    fmt = format.strip().lower()
    if fmt == "zip":
        payload = AudioService.export_vault_zip(db)
        AuditService.log_event(db=db, action="audio.vault_export", resource_type="audio_vault", actor=user, request=request, details={"format": "zip"})
        return Response(
            content=payload,
            media_type="application/zip",
            headers={"Content-Disposition": 'attachment; filename="sonic_census_audio_vault.zip"'},
        )
    if fmt == "json":
        payload = AudioService.export_vault_json(db, include_base64=include_base64)
        AuditService.log_event(db=db, action="audio.vault_export", resource_type="audio_vault", actor=user, request=request, details={"format": "json"})
        return Response(
            content=payload,
            media_type="application/json",
            headers={"Content-Disposition": 'attachment; filename="sonic_census_audio_vault.json"'},
        )
    if fmt == "csv":
        payload = AudioService.export_vault_csv(db)
        AuditService.log_event(db=db, action="audio.vault_export", resource_type="audio_vault", actor=user, request=request, details={"format": "csv"})
        return Response(
            content=payload,
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="sonic_census_audio_vault.csv"'},
        )
    raise HTTPException(status_code=400, detail="Unsupported vault export format. Choose zip, json, or csv.")


@router.get("/by-hash/{sha256_hash}/download")
def download_audio_by_hash(sha256_hash: str, db: Session = Depends(get_db)):
    """Download a raw audio clip directly from SQLite audio_vault using its SHA-256 content hash."""
    blob, filename, mime_type, digest, entry_hash = AudioService.get_audio_binary(
        db=db, file_hash=sha256_hash
    )
    return _audio_binary_response(blob, filename, mime_type, digest, entry_hash)


@router.get("/jobs/{id}")
def get_job_status(id: str, db: Session = Depends(get_db)):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Processing job not found")
    return {
        "job_id": job.id,
        "audio_file_id": job.audio_file_id,
        "status": job.status,
        "progress": job.progress,
        "error_message": job.error_message,
        "created_at": job.created_at.isoformat() if job.created_at else None,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.get("/{id}/download")
def download_audio_by_id(id: str, db: Session = Depends(get_db)):
    """Download a stored audio clip directly from SQLite audio_vault by recording ID."""
    blob, filename, mime_type, digest, entry_hash = AudioService.get_audio_binary(
        db=db, audio_id=id
    )
    return _audio_binary_response(blob, filename, mime_type, digest, entry_hash)


@router.get("/{id}/spectrogram")
def get_audio_spectrogram(id: str, db: Session = Depends(get_db)):
    """Serve persisted spectrogram PNG from database blob (or disk fallback)."""
    audio = db.query(AudioFile).filter(AudioFile.id == id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio recording not found")
    if audio.spectrogram_blob:
        return Response(content=audio.spectrogram_blob, media_type="image/png")
    if audio.spectrogram_path:
        spec_name = os.path.basename(audio.spectrogram_path)
        spec_disk = os.path.join(settings.SPECTROGRAMS_DIRECTORY, spec_name)
        if os.path.exists(spec_disk):
            with open(spec_disk, "rb") as sf:
                return Response(content=sf.read(), media_type="image/png")
    raise HTTPException(status_code=404, detail="Spectrogram image not found")


@router.get("/{id}")
def get_audio_detail(id: str, db: Session = Depends(get_db)):
    audio = db.query(AudioFile).filter(AudioFile.id == id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio recording not found")

    events = db.query(SoundEvent).filter(SoundEvent.audio_file_id == audio.id).all()
    meas = db.query(Measurement).filter(Measurement.audio_file_id == audio.id).first()
    assessment = (
        db.query(ComplianceAssessment).filter(ComplianceAssessment.measurement_id == meas.id).first()
        if meas
        else None
    )
    stored_in_db = False
    if audio.file_hash:
        stored_in_db = (
            db.query(AudioVaultEntry.sha256_hash)
            .filter(AudioVaultEntry.sha256_hash == audio.file_hash)
            .first()
            is not None
        )

    waveform = []
    if audio.waveform_data:
        try:
            waveform = json.loads(audio.waveform_data)
        except Exception:
            waveform = []

    return {
        "id": audio.id,
        "original_filename": audio.original_filename,
        "file_format": audio.file_format,
        "file_size": audio.file_size,
        "duration": audio.duration,
        "sample_rate": audio.sample_rate,
        "processing_status": audio.processing_status,
        **_audio_hash_metadata(audio, stored_in_db=stored_in_db),
        "waveform": waveform,
        "spectrogram_url": (
            f"{settings.API_V1_STR}/audio/{audio.id}/spectrogram"
            if (audio.spectrogram_blob or audio.spectrogram_path)
            else None
        ),
        "acoustic_measurement": {
            "laeq": meas.laeq if meas else None,
            "lmax": meas.lmax if meas else None,
            "duration": meas.measurement_duration if meas else None,
            "frequency_weighting": meas.frequency_weighting if meas else "A",
            "time_weighting": meas.time_weighting if meas else "Fast",
            "calibration_status": meas.calibration_status if meas else "uncalibrated",
        } if meas else None,
        "compliance": {
            "zone_type": assessment.zone_type if assessment else "Residential",
            "time_period": assessment.time_period if assessment else "Day",
            "threshold_db": assessment.threshold_db if assessment else 55.0,
            "outcome": assessment.outcome if assessment else "within_limit",
            "exceedance_amount": assessment.exceedance_amount if assessment else 0.0,
            "notes": assessment.notes if assessment else "",
        } if assessment else None,
        "sound_events": [
            {
                "category": e.category,
                "confidence": e.confidence_score,
                "start_time": e.start_time,
                "end_time": e.end_time,
                "model_name": e.model_name,
            }
            for e in events
        ],
    }


@router.delete("/{id}")
def delete_audio(id: str, request: Request, db: Session = Depends(get_db), user=Depends(require_officer)):
    audio = db.query(AudioFile).filter(AudioFile.id == id).first()
    if not audio:
        raise HTTPException(status_code=404, detail="Audio file not found")

    AudioService.delete_audio_record(db, audio)
    AuditService.log_event(db=db, action="audio.delete", resource_type="audio_file", resource_id=id, actor=user, request=request)
    return {"message": "Audio recording and related analyses deleted successfully"}
