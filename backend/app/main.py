import json
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.api.v1.router import api_router
from app.database.connection import engine
from seed_data import seed_database

logger = logging.getLogger("sonic_census")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

if settings.SENTRY_DSN:
    try:
        import sentry_sdk  # type: ignore

        sentry_sdk.init(dsn=settings.SENTRY_DSN, environment=settings.ENVIRONMENT, traces_sample_rate=0.1)
    except Exception as exc:
        logger.warning(json.dumps({"event": "sentry_init_skipped", "error": str(exc)}))


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup directories
    os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
    os.makedirs(settings.REPORTS_DIRECTORY, exist_ok=True)
    os.makedirs(settings.SPECTROGRAMS_DIRECTORY, exist_ok=True)
    os.makedirs("models", exist_ok=True)

    # Initialize DB & Seed
    print("[Sonic Census] Initializing database and verifying CPCB standard tables...")
    seed_database()
    print("[Sonic Census] System ready.")
    yield


app = FastAPI(
    title="Sonic Census",
    description="AI-Powered Urban Acoustic Soundscape Mapper & Environmental Compliance Engine",
    version="1.1.0",
    lifespan=lifespan,
)

# CORS Middleware
cors_origins = list(dict.fromkeys([settings.FRONTEND_ORIGIN, *settings.ALLOWED_ORIGINS]))
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https://([a-z0-9-]+--)?sonic-census\.netlify\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-Audio-SHA256", "X-Entry-SHA256", "X-Content-Source", "X-Request-ID"],
)


@app.middleware("http")
async def request_observability_middleware(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or str(uuid.uuid4())
    started = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        logger.error(json.dumps({
            "event": "unhandled_exception",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "duration_ms": duration_ms,
            "error": str(exc),
        }))
        raise
    duration_ms = round((time.perf_counter() - started) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    if request.url.path.startswith(settings.API_V1_STR):
        logger.info(json.dumps({
            "event": "http_request",
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        }))
    return response


# Mount static asset directories
os.makedirs(settings.UPLOAD_DIRECTORY, exist_ok=True)
os.makedirs(settings.REPORTS_DIRECTORY, exist_ok=True)
os.makedirs(settings.SPECTROGRAMS_DIRECTORY, exist_ok=True)

app.mount("/static/spectrograms", StaticFiles(directory=settings.SPECTROGRAMS_DIRECTORY), name="spectrograms")
app.mount("/static/reports", StaticFiles(directory=settings.REPORTS_DIRECTORY), name="reports")
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIRECTORY), name="uploads")

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "project": "Sonic Census",
        "description": "AI-Powered Urban Acoustic Soundscape Mapper",
        "version": "1.1.0",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online",
    }


@app.get("/api/v1/health")
def health_check():
    db_status = "connected"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "storage": "postgresql-blob" if not str(engine.url).startswith("sqlite") else "sqlite-blob",
        "ai_engine": "SonicCensus-DSP-v2",
        "compliance_rules": "CPCB India 2000 active",
    }
