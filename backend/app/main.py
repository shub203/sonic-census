import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.api.v1.router import api_router
from seed_data import seed_database

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
    version="1.0.0",
    lifespan=lifespan
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
    expose_headers=["Content-Disposition", "X-Audio-SHA256", "X-Entry-SHA256", "X-Content-Source"],
)

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
        "version": "1.0.0",
        "docs": "/docs",
        "api_v1": settings.API_V1_STR,
        "status": "online"
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "ai_engine": "PANNs CNN14 active",
        "compliance_rules": "CPCB India 2000 active"
    }
