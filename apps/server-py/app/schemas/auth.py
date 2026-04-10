from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class GoogleAuthRequest(BaseModel):
    id_token: str


class AppleFullName(BaseModel):
    first: str | None = None
    last: str | None = None


class AppleAuthRequest(BaseModel):
    id_token: str
    full_name: AppleFullName | None = None
