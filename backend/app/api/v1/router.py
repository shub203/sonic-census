from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.audio import router as audio_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.sensors import router as sensors_router
from app.api.v1.measurements import router as measurements_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.map import router as map_router
from app.api.v1.analytics import router as analytics_router
from app.api.v1.reports import router as reports_router
from app.api.v1.complaints import router as complaints_router
from app.api.v1.admin import router as admin_router
from app.api.v1.contact import router as contact_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(audio_router)
api_router.include_router(dashboard_router)
api_router.include_router(sensors_router)
api_router.include_router(measurements_router)
api_router.include_router(compliance_router)
api_router.include_router(map_router)
api_router.include_router(analytics_router)
api_router.include_router(reports_router)
api_router.include_router(complaints_router)
api_router.include_router(admin_router)
api_router.include_router(contact_router)
