from fastapi import APIRouter

from app.api.endpoints.analytics import router as analytics_router
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.comparisons import router as comparisons_router
from app.api.endpoints.family_members import router as family_members_router
from app.api.endpoints.favourites import router as favourites_router
from app.api.endpoints.health import router as health_router
from app.api.endpoints.me import router as me_router
from app.api.endpoints.scanner import router as scanner_router
from app.api.endpoints.scans import router as scans_router
from app.api.endpoints.storage import router as storage_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(auth_router)
api_router.include_router(me_router)
api_router.include_router(scanner_router)
api_router.include_router(scans_router)
api_router.include_router(comparisons_router)
api_router.include_router(favourites_router)
api_router.include_router(family_members_router)
api_router.include_router(analytics_router)
api_router.include_router(storage_router)
