import os
import io
import csv
import json
import uuid
import base64
import hashlib
import zipfile
import asyncio
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from fastapi import UploadFile, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import (
    AudioVaultEntry,
    AudioFile,
    SoundEvent,
    Measurement,
    ProcessingJob,
    ComplianceAssessment,
)
from app.audio.validation import validate_audio_file
from app.audio.decoder import decode_audio
from app.audio.waveform import generate_waveform_peaks
from app.audio.spectrogram import generate_spectrogram_image
from app.audio.measurement import calculate_acoustic_metrics
from app.ml.inference import classify_audio_recording
from app.compliance.rule_engine import ComplianceEngine
from app.services.gemini_service import GeminiAudioService

AUDIO_MIME_TYPES: Dict[str, str] = {
    "WAV": "audio/wav",
    "MP3": "audio/mpeg",
    "FLAC": "audio/flac",
    "OGG": "audio/ogg",
    "M4A": "audio/mp4",
    "WEBM": "audio/webm",
}


def resolve_audio_mime(file_format: str) -> str:
    """Map an uppercase audio format tag to its MIME content type."""
    return AUDIO_MIME_TYPES.get((file_format or "").upper(), "application/octet-stream")


def compute_file_sha256(contents: bytes) -> str:
    """Compute the SHA-256 hex digest for raw audio bytes."""
    return hashlib.sha256(contents).hexdigest()


def compute_entry_hash(payload: Dict) -> str:
    """Compute a deterministic SHA-256 digest over canonical audio entry metadata."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class AudioService:
    @staticmethod
    def build_audio_entry_hash(
        audio_record: AudioFile,
        primary_category: str = "Other",
        laeq: Optional[float] = None,
        zone_type: str = "Residential",
    ) -> str:
        """Build a tamper-evident SHA-256 hash representing the audio record and its audit output."""
        uploaded_iso = audio_record.uploaded_at.isoformat() if audio_record.uploaded_at else ""
        return compute_entry_hash(
            {
                "id": audio_record.id,
                "file_hash": audio_record.file_hash,
                "original_filename": audio_record.original_filename,
                "file_format": audio_record.file_format,
                "file_size": audio_record.file_size,
                "duration": audio_record.duration,
                "sample_rate": audio_record.sample_rate,
                "laeq": laeq,
                "zone_type": zone_type,
                "primary_category": primary_category,
                "uploaded_at": uploaded_iso,
            }
        )

    @staticmethod
    def store_audio_in_vault(
        db: Session,
        contents: bytes,
        filename: str,
        file_format: str,
        file_size: int,
    ) -> AudioVaultEntry:
        """Persist raw audio bytes into the content-addressed audio_vault table keyed by SHA-256."""
        sha256_hash = compute_file_sha256(contents)
        existing = db.query(AudioVaultEntry).filter(AudioVaultEntry.sha256_hash == sha256_hash).first()
        if existing:
            existing.upload_count = (existing.upload_count or 1) + 1
            existing.last_seen_at = datetime.utcnow()
            return existing

        max_vault_bytes = max(1, settings.MAX_VAULT_STORAGE_MB) * 1024 * 1024
        used_bytes = db.query(func.coalesce(func.sum(AudioVaultEntry.file_size), 0)).scalar() or 0
        if used_bytes + file_size > max_vault_bytes:
            raise HTTPException(
                status_code=507,
                detail=f"Audio vault storage quota ({settings.MAX_VAULT_STORAGE_MB} MB) reached. Purge legacy entries or upgrade storage.",
            )

        entry = AudioVaultEntry(
            sha256_hash=sha256_hash,
            original_filename=filename,
            file_format=file_format,
            mime_type=resolve_audio_mime(file_format),
            file_size=file_size,
            audio_blob=contents,
            upload_count=1,
        )
        db.add(entry)
        db.flush()
        return entry

    @staticmethod
    def backfill_audio_vault(db: Session) -> int:
        """Hash and vault any legacy AudioFile entries present on disk that predate audio_vault."""
        legacy_files = (
            db.query(AudioFile)
            .filter((AudioFile.file_hash.is_(None)) | (AudioFile.entry_hash.is_(None)))
            .all()
        )
        if not legacy_files:
            return 0

        ids = [a.id for a in legacy_files]
        events_by_id: Dict[str, SoundEvent] = {}
        for ev in db.query(SoundEvent).filter(SoundEvent.audio_file_id.in_(ids)).all():
            events_by_id.setdefault(ev.audio_file_id, ev)

        meas_by_id: Dict[str, Measurement] = {}
        for m in db.query(Measurement).filter(Measurement.audio_file_id.in_(ids)).all():
            meas_by_id.setdefault(m.audio_file_id, m)

        meas_ids = [m.id for m in meas_by_id.values()]
        assess_by_meas: Dict[str, ComplianceAssessment] = {}
        if meas_ids:
            for a in db.query(ComplianceAssessment).filter(ComplianceAssessment.measurement_id.in_(meas_ids)).all():
                assess_by_meas.setdefault(a.measurement_id, a)

        updated = 0
        for audio in legacy_files:
            if not audio.file_hash and audio.storage_path and os.path.exists(audio.storage_path):
                with open(audio.storage_path, "rb") as f:
                    raw_bytes = f.read()
                vault_entry = AudioService.store_audio_in_vault(
                    db=db,
                    contents=raw_bytes,
                    filename=audio.original_filename,
                    file_format=audio.file_format,
                    file_size=len(raw_bytes),
                )
                audio.file_hash = vault_entry.sha256_hash
                updated += 1

            if not audio.entry_hash:
                ev = events_by_id.get(audio.id)
                meas = meas_by_id.get(audio.id)
                assess = assess_by_meas.get(meas.id) if meas else None
                audio.entry_hash = AudioService.build_audio_entry_hash(
                    audio,
                    primary_category=ev.category if ev else "Other",
                    laeq=meas.laeq if meas else None,
                    zone_type=assess.zone_type if assess else "Residential",
                )
                updated += 1

        if updated:
            db.commit()
        return updated

    @staticmethod
    async def process_uploaded_audio(
        file: UploadFile,
        db: Session,
        user_id: str = None,
        zone_type: str = "Residential",
        is_calibrated: bool = False,
        use_gemini: bool = False,
    ) -> AudioFile:
        """
        Complete end-to-end processing pipeline:
        1. Validates upload
        2. Saves audio file to uploads/ and prepares SHA-256 hash
        3. Decodes audio signal & checks max duration
        4. Stores full audio binary inside SQLite audio_vault keyed by SHA-256 hash
        5. Generates waveform envelope & spectrogram
        6. Calculates LAeq and Lmax metrics with logarithmic energy averaging
        7. Runs AI / DSP environmental sound classification
        8. Evaluates CPCB compliance & persists records with entry_hash digest
        """
        contents = await file.read()
        file_size = len(contents)

        # 1. Validation
        is_valid, error_msg = validate_audio_file(file.filename, file_size)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)

        # 2. Save temporary/static disk copy
        os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1].lower()
        file_format = ext.replace(".", "").upper() or "WAV"
        saved_filename = f"{file_id}{ext}"
        storage_path = os.path.join(settings.UPLOAD_DIRECTORY, saved_filename)

        with open(storage_path, "wb") as f:
            f.write(contents)

        job = ProcessingJob(
            id=str(uuid.uuid4()),
            audio_file_id=file_id,
            status="processing",
            progress=20,
        )

        try:
            # 3. Decode audio
            audio_data, sample_rate, duration, channels = decode_audio(storage_path)

            if duration > settings.MAX_AUDIO_DURATION_SECONDS:
                raise HTTPException(
                    status_code=400,
                    detail=f"Audio duration ({round(duration, 1)}s) exceeds max limit of {settings.MAX_AUDIO_DURATION_SECONDS}s.",
                )

            # 4. Vault raw audio binary in database keyed by SHA-256 hash
            vault_entry = AudioService.store_audio_in_vault(
                db=db,
                contents=contents,
                filename=file.filename,
                file_format=file_format,
                file_size=file_size,
            )

            # 5. Generate waveform envelope & spectrogram
            waveform_peaks = generate_waveform_peaks(audio_data, num_points=120)
            spectrogram_filename = f"{file_id}_spec.png"
            spectrogram_rel_path = generate_spectrogram_image(audio_data, sample_rate, spectrogram_filename)
            spectrogram_blob = None
            spec_disk_path = os.path.join(settings.SPECTROGRAMS_DIRECTORY, spectrogram_filename)
            if os.path.exists(spec_disk_path):
                with open(spec_disk_path, "rb") as sf:
                    spectrogram_blob = sf.read()

            # 6. Acoustic measurements
            acoustic = calculate_acoustic_metrics(
                audio_data,
                sample_rate,
                is_calibrated=is_calibrated,
            )

            # 7. AI sound event classification
            gemini_res = None
            if use_gemini and GeminiAudioService.is_available():
                try:
                    gemini_res = await asyncio.to_thread(
                        GeminiAudioService.analyze_audio,
                        file_bytes=contents,
                        filename=file.filename,
                        zone_type=zone_type,
                    )
                except Exception as e:
                    print(f"[Gemini Audio Warning]: {e}")

            ai_results = classify_audio_recording(audio_data, sample_rate)
            if gemini_res:
                ai_results["top_category"] = gemini_res.get("category", ai_results.get("top_category"))
                ai_results["top_confidence"] = gemini_res.get("confidence", ai_results.get("top_confidence"))
                ai_results["sub_category"] = gemini_res.get("sub_category")
                ai_results["description"] = gemini_res.get("description")
                ai_results["model"] = gemini_res.get("ai_engine", "Google Gemini")
                if gemini_res.get("events"):
                    ai_results["detections"] = gemini_res.get("events")

            uploaded_at = datetime.utcnow()

            # 8. Create AudioFile in DB with SHA-256 references
            audio_record = AudioFile(
                id=file_id,
                original_filename=file.filename,
                storage_path=storage_path,
                file_format=file_format,
                file_size=file_size,
                file_hash=vault_entry.sha256_hash,
                duration=round(duration, 2),
                sample_rate=sample_rate,
                channels=channels,
                source_type="manual_upload",
                processing_status="completed",
                waveform_data=json.dumps(waveform_peaks),
                spectrogram_path=spectrogram_rel_path,
                spectrogram_blob=spectrogram_blob,
                uploaded_by=user_id,
                uploaded_at=uploaded_at,
            )

            detections = ai_results.get("detections", [])
            primary_cat = (
                detections[0].get("category", "Other")
                if detections
                else ai_results.get("top_category", "Other")
            )
            audio_record.entry_hash = AudioService.build_audio_entry_hash(
                audio_record,
                primary_category=primary_cat,
                laeq=acoustic["laeq"],
                zone_type=zone_type,
            )
            db.add(audio_record)

            # 9. Store Sound Events
            for detection in detections:
                sound_evt = SoundEvent(
                    audio_file_id=file_id,
                    category=detection["category"],
                    confidence_score=detection["confidence"],
                    start_time=detection["start_time"],
                    end_time=detection["end_time"],
                    model_name=ai_results.get("model", "PANNs-CNN14"),
                )
                db.add(sound_evt)

            # 10. Store Measurement
            meas = Measurement(
                audio_file_id=file_id,
                timestamp=uploaded_at,
                laeq=acoustic["laeq"],
                lmax=acoustic["lmax"],
                measurement_duration=acoustic["duration"],
                frequency_weighting=acoustic["frequency_weighting"],
                time_weighting=acoustic["time_weighting"],
                calibration_status=acoustic["calibration_status"],
                measurement_uncertainty=acoustic["uncertainty"],
            )
            db.add(meas)
            db.flush()

            # 11. Run Compliance Assessment
            ComplianceEngine.evaluate_measurement(
                db=db,
                measurement=meas,
                zone_type=zone_type,
            )

            job.status = "completed"
            job.progress = 100
            job.completed_at = datetime.utcnow()
            db.add(job)

            db.commit()
            db.refresh(audio_record)
            return audio_record

        except HTTPException:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            job.status = "failed"
            job.error_message = str(e)
            db.add(job)
            db.commit()
            raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}")

    @staticmethod
    def list_vault_entries(db: Session, limit: int = 200) -> Dict:
        """Return lightweight DB vault manifest (hashes + acoustic metadata, omitting raw BLOBs)."""
        audio_rows = db.query(AudioFile).order_by(AudioFile.uploaded_at.desc()).limit(limit).all()
        ids = [a.id for a in audio_rows]

        events_by_id: Dict[str, SoundEvent] = {}
        meas_by_id: Dict[str, Measurement] = {}
        assess_by_meas: Dict[str, ComplianceAssessment] = {}
        vault_hashes = set()

        if ids:
            for ev in db.query(SoundEvent).filter(SoundEvent.audio_file_id.in_(ids)).all():
                events_by_id.setdefault(ev.audio_file_id, ev)
            for m in db.query(Measurement).filter(Measurement.audio_file_id.in_(ids)).all():
                meas_by_id.setdefault(m.audio_file_id, m)
            meas_ids = [m.id for m in meas_by_id.values()]
            if meas_ids:
                for a in db.query(ComplianceAssessment).filter(ComplianceAssessment.measurement_id.in_(meas_ids)).all():
                    assess_by_meas.setdefault(a.measurement_id, a)

        vault_meta_rows = db.query(
            AudioVaultEntry.sha256_hash,
            AudioVaultEntry.file_size,
            AudioVaultEntry.mime_type,
            AudioVaultEntry.upload_count,
        ).all()
        vault_meta = {r[0]: {"file_size": r[1], "mime_type": r[2], "upload_count": r[3]} for r in vault_meta_rows}
        vault_hashes = set(vault_meta.keys())

        entries = []
        for f in audio_rows:
            ev = events_by_id.get(f.id)
            meas = meas_by_id.get(f.id)
            assess = assess_by_meas.get(meas.id) if meas else None
            stored_in_db = bool(f.file_hash and f.file_hash in vault_hashes)
            entries.append(
                {
                    "id": f.id,
                    "original_filename": f.original_filename,
                    "file_format": f.file_format,
                    "mime_type": vault_meta[f.file_hash]["mime_type"] if stored_in_db else resolve_audio_mime(f.file_format),
                    "file_size": f.file_size,
                    "duration": f.duration,
                    "sample_rate": f.sample_rate,
                    "file_hash": f.file_hash,
                    "entry_hash": f.entry_hash,
                    "hash_algorithm": "SHA-256",
                    "stored_in_db": stored_in_db,
                    "primary_category": ev.category if ev else "Other",
                    "primary_confidence": ev.confidence_score if ev else 0.0,
                    "laeq": meas.laeq if meas else None,
                    "lmax": meas.lmax if meas else None,
                    "calibration_status": meas.calibration_status if meas else "uncalibrated",
                    "zone_type": assess.zone_type if assess else "Residential",
                    "outcome": assess.outcome if assess else "within_limit",
                    "uploaded_at": f.uploaded_at.isoformat() if f.uploaded_at else None,
                    "download_url": f"{settings.API_V1_STR}/audio/{f.id}/download",
                    "vault_download_url": (
                        f"{settings.API_V1_STR}/audio/by-hash/{f.file_hash}/download"
                        if f.file_hash
                        else None
                    ),
                }
            )

        total_blob_bytes = sum(int(v["file_size"] or 0) for v in vault_meta.values())
        return {
            "hash_algorithm": "SHA-256",
            "total_entries": len(entries),
            "unique_blobs": len(vault_meta),
            "total_blob_bytes": total_blob_bytes,
            "entries": entries,
        }

    @staticmethod
    def get_audio_binary(
        db: Session,
        audio_id: Optional[str] = None,
        file_hash: Optional[str] = None,
    ) -> Tuple[bytes, str, str, str, Optional[str]]:
        """
        Retrieve raw audio bytes directly from audio_vault (or legacy disk fallback),
        verifying SHA-256 integrity before returning.
        """
        audio_row: Optional[AudioFile] = None
        if audio_id:
            audio_row = db.query(AudioFile).filter(AudioFile.id == audio_id).first()
            if not audio_row:
                raise HTTPException(status_code=404, detail="Audio recording not found")
            target_hash = audio_row.file_hash
        else:
            target_hash = (file_hash or "").strip().lower()
            audio_row = db.query(AudioFile).filter(AudioFile.file_hash == target_hash).first()

        vault_entry = None
        if target_hash:
            vault_entry = db.query(AudioVaultEntry).filter(AudioVaultEntry.sha256_hash == target_hash).first()

        if vault_entry and vault_entry.audio_blob is not None:
            blob = bytes(vault_entry.audio_blob)
            actual_hash = compute_file_sha256(blob)
            if actual_hash != vault_entry.sha256_hash:
                raise HTTPException(status_code=500, detail="Stored database audio failed SHA-256 integrity check")
            filename = audio_row.original_filename if audio_row else vault_entry.original_filename
            return blob, filename, vault_entry.mime_type, vault_entry.sha256_hash, (audio_row.entry_hash if audio_row else None)

        if audio_row and audio_row.storage_path and os.path.exists(audio_row.storage_path):
            with open(audio_row.storage_path, "rb") as f:
                blob = f.read()
            actual_hash = compute_file_sha256(blob)
            return blob, audio_row.original_filename, resolve_audio_mime(audio_row.file_format), actual_hash, audio_row.entry_hash

        raise HTTPException(status_code=404, detail="Audio binary not found in database vault")

    @staticmethod
    def export_vault_csv(db: Session) -> bytes:
        """Render the database audio vault hash ledger as UTF-8 CSV bytes."""
        manifest = AudioService.list_vault_entries(db, limit=1000)
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow([
            "audio_id",
            "file_hash_sha256",
            "entry_hash_sha256",
            "original_filename",
            "file_format",
            "file_size_bytes",
            "duration_sec",
            "sample_rate_hz",
            "laeq_dba",
            "lmax_dba",
            "primary_category",
            "zone_type",
            "compliance_outcome",
            "stored_in_db",
            "uploaded_at",
        ])
        for e in manifest["entries"]:
            writer.writerow([
                e["id"],
                e["file_hash"] or "",
                e["entry_hash"] or "",
                e["original_filename"],
                e["file_format"],
                e["file_size"],
                e["duration"],
                e["sample_rate"],
                e["laeq"] if e["laeq"] is not None else "",
                e["lmax"] if e["lmax"] is not None else "",
                e["primary_category"],
                e["zone_type"],
                e["outcome"],
                e["stored_in_db"],
                e["uploaded_at"] or "",
            ])
        return buf.getvalue().encode("utf-8")

    @staticmethod
    def export_vault_json(db: Session, include_base64: bool = False) -> bytes:
        """Render the audio vault registry (and optional Base64 audio payloads) as JSON bytes."""
        manifest = AudioService.list_vault_entries(db, limit=1000)
        blob_b64_by_hash: Dict[str, str] = {}
        if include_base64:
            for vault_row in db.query(AudioVaultEntry).all():
                blob_b64_by_hash[vault_row.sha256_hash] = base64.b64encode(bytes(vault_row.audio_blob)).decode("ascii")

        for item in manifest["entries"]:
            h = item.get("file_hash")
            item["vault_archive_path"] = f"audio/{h}.{(item.get('file_format') or 'wav').lower()}" if h else None
            if include_base64 and h and h in blob_b64_by_hash:
                item["audio_base64"] = blob_b64_by_hash[h]

        manifest["exported_at"] = datetime.utcnow().isoformat() + "Z"
        manifest["includes_base64_audio"] = include_base64
        return json.dumps(manifest, indent=2).encode("utf-8")

    @staticmethod
    def export_vault_zip(db: Session) -> bytes:
        """Build a ZIP archive containing hash manifests (JSON + CSV) and all raw DB audio blobs keyed by SHA-256."""
        buf = io.BytesIO()
        json_bytes = AudioService.export_vault_json(db, include_base64=False)
        csv_bytes = AudioService.export_vault_csv(db)

        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            zf.writestr("hash_ledger.json", json_bytes)
            zf.writestr("hash_ledger.csv", csv_bytes)
            for vault_row in db.query(AudioVaultEntry).yield_per(10):
                ext = (vault_row.file_format or "wav").lower()
                zf.writestr(f"audio/{vault_row.sha256_hash}.{ext}", bytes(vault_row.audio_blob))

        return buf.getvalue()

    @staticmethod
    def delete_audio_record(db: Session, audio: AudioFile) -> None:
        """Delete an AudioFile record plus disk file and unreferenced vault BLOB."""
        file_hash = audio.file_hash
        audio_id = audio.id

        if audio.storage_path and os.path.exists(audio.storage_path):
            try:
                os.remove(audio.storage_path)
            except Exception:
                pass

        db.delete(audio)
        db.flush()

        if file_hash:
            remaining = (
                db.query(AudioFile)
                .filter(AudioFile.file_hash == file_hash, AudioFile.id != audio_id)
                .count()
            )
            vault_row = db.query(AudioVaultEntry).filter(AudioVaultEntry.sha256_hash == file_hash).first()
            if vault_row:
                if remaining == 0:
                    db.delete(vault_row)
                else:
                    vault_row.upload_count = remaining

        db.commit()
