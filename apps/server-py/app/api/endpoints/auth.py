from fastapi import APIRouter

from app.api.deps import UnitOfWorkDep
from app.schemas.auth import (
    AppleAuthRequest,
    GoogleAuthRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])

_auth_service = AuthService()


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, uow: UnitOfWorkDep) -> TokenResponse:
    return await _auth_service.register(uow, email=body.email, password=body.password, name=body.name)


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, uow: UnitOfWorkDep) -> TokenResponse:
    return await _auth_service.login(uow, email=body.email, password=body.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(body: RefreshRequest, uow: UnitOfWorkDep) -> TokenResponse:
    return await _auth_service.refresh(uow, refresh_token=body.refresh_token)


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, uow: UnitOfWorkDep) -> TokenResponse:
    return await _auth_service.google_auth(uow, id_token=body.id_token)


@router.post("/apple", response_model=TokenResponse)
async def apple_auth(body: AppleAuthRequest, uow: UnitOfWorkDep) -> TokenResponse:
    full_name = body.full_name.model_dump() if body.full_name else None
    return await _auth_service.apple_auth(uow, id_token=body.id_token, full_name=full_name)
