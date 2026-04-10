# FastAPI Migration Plan

**Status:** Planning  
**Branch:** `feature/fastapi-migration`  
**Reference:** `/Users/doodko/meduzzen/wine-app/wine-app-backend`

---

## 1. Overview

The Yuka backend currently runs on **Hono (TypeScript)** with **Prisma ORM** and **BetterAuth**. This document covers the full migration to a **FastAPI (Python)** backend following the architecture patterns established in the wine-app-backend project.

### Current Stack

| Concern | Current | Target |
|---|---|---|
| Framework | Hono (Node.js) | FastAPI (Python) |
| ORM | Prisma | SQLAlchemy 2.0 (async) |
| Migrations | Prisma migrate | Alembic |
| Auth | BetterAuth | Custom JWT (PyJWT + Argon2) |
| OAuth | BetterAuth built-in | Custom Google + Apple handlers |
| AI/LLM | LangChain + OpenAI | LangChain + OpenAI (same libs, Python) |
| Storage | Google Cloud Storage / MinIO | Google Cloud Storage |
| Config | dotenv | Pydantic-settings (hierarchical) |
| Package Manager | pnpm | UV |
| API Docs | None | Auto Swagger/OpenAPI at `/docs` |
| Language | TypeScript | Python 3.13+ |

---

## 2. Target Directory Structure

Follows wine-app-backend conventions exactly.

```
apps/server-py/              ← new FastAPI app (alongside existing apps/server/)
├── pyproject.toml
├── uv.lock
├── alembic.ini
├── .env.example
├── migrations/
│   ├── env.py
│   ├── script.py.mako
│   └── versions/
│       └── 0001_initial_schema.py
└── app/
    ├── __init__.py
    ├── api/
    │   ├── __init__.py
    │   ├── main.py              ← uvicorn entry (calls init_app)
    │   ├── init_app.py          ← FastAPI factory, middleware, router include
    │   ├── deps.py              ← Depends: UnitOfWork, CurrentUser, PaginationParams
    │   └── endpoints/
    │       ├── __init__.py      ← api_router aggregator
    │       ├── health.py
    │       ├── auth.py          ← register, login, refresh, google, apple
    │       ├── me.py            ← GET /me, PATCH /me, onboarding
    │       ├── user.py          ← avatar, subscription webhook, profile
    │       ├── scanner.py       ← barcode scan, photo scan
    │       ├── scans.py         ← scan history, scan detail
    │       ├── comparisons.py
    │       ├── favourites.py
    │       ├── family_members.py
    │       ├── analytics.py
    │       └── storage.py       ← presigned upload URL
    │
    ├── core/
    │   ├── config/
    │   │   ├── __init__.py
    │   │   ├── settings.py      ← Settings (aggregates all sub-configs)
    │   │   ├── base.py          ← BaseConfig(pydantic_settings.BaseSettings)
    │   │   ├── api.py
    │   │   ├── postgres.py
    │   │   ├── jwt.py
    │   │   ├── security.py
    │   │   ├── openai.py
    │   │   ├── oauth.py         ← Google + Apple credentials
    │   │   ├── gcs.py
    │   │   ├── revenuecat.py    ← RevenueCat webhook secret
    │   │   └── langsmith.py
    │   └── exc/
    │       └── base.py          ← BaseHTTPException hierarchy
    │
    ├── db/
    │   ├── __init__.py
    │   └── postgres.py          ← async engine + session factory
    │
    ├── models/                  ← SQLAlchemy ORM models
    │   ├── __init__.py
    │   ├── base.py              ← UUIDModel, TimestampModel, Base
    │   ├── user.py
    │   ├── user_profile.py
    │   ├── user_identity.py     ← replaces BetterAuth Account table
    │   ├── session.py           ← JWT refresh token storage
    │   ├── product.py
    │   ├── scan.py
    │   ├── comparison.py
    │   ├── favorite.py
    │   ├── family_member.py
    │   └── product_ingredient_cache.py
    │
    ├── schemas/                 ← Pydantic request/response schemas
    │   ├── __init__.py
    │   ├── auth.py
    │   ├── user.py
    │   ├── scanner.py
    │   ├── scan.py
    │   ├── comparison.py
    │   ├── favourite.py
    │   ├── family_member.py
    │   ├── analytics.py
    │   ├── storage.py
    │   └── utils/
    │       └── paginator.py
    │
    ├── repositories/            ← Data access layer
    │   ├── __init__.py
    │   ├── base.py              ← AbstractRepository, SQLAlchemyRepository, PaginateMixin
    │   ├── user.py
    │   ├── user_profile.py
    │   ├── user_identity.py
    │   ├── product.py
    │   ├── scan.py
    │   ├── comparison.py
    │   ├── favorite.py
    │   ├── family_member.py
    │   └── product_ingredient_cache.py
    │
    ├── services/
    │   ├── __init__.py
    │   ├── auth_service.py
    │   ├── user_service.py
    │   ├── scanner_service.py   ← orchestrates barcode + photo scan flows
    │   ├── scan_service.py
    │   ├── comparison_service.py
    │   ├── favourite_service.py
    │   ├── family_member_service.py
    │   ├── analytics_service.py
    │   ├── gcs_service.py
    │   ├── revenuecat_service.py
    │   └── ai/
    │       ├── product_facts_service.py
    │       ├── ingredient_analysis_service.py
    │       ├── comparison_ai_service.py
    │       ├── product_embedding_service.py
    │       ├── product_vector_search_service.py
    │       ├── photo_identification_service.py
    │       ├── nutrition_websearch_service.py
    │       └── is_food_product_service.py
    │
    ├── clients/
    │   ├── __init__.py
    │   ├── openfoodfacts_client.py
    │   └── websearch_client.py
    │
    ├── utils/
    │   ├── __init__.py
    │   ├── security.py          ← hash_password, verify_password (Argon2)
    │   ├── token_service.py     ← JWT create/decode (access + refresh)
    │   ├── unitofwork.py        ← UnitOfWork async context manager
    │   ├── google_auth.py
    │   ├── apple_auth.py
    │   └── image.py
    │
    ├── enums/
    │   ├── __init__.py
    │   └── base.py              ← DietType, MainGoal, Restriction, Allergy,
    │                               NutritionPriority, ScanSource, ScanType,
    │                               PersonalAnalysisStatus, AuthProviderEnum
    │
    └── prompts/
        └── product.py           ← LLM prompt templates
```

---

## 3. Architecture Decisions

### 3.1 Auth — Replace BetterAuth with Custom JWT

BetterAuth is a TypeScript-only library with no Python equivalent. Replaced with the pattern from wine-app-backend:

- **Password hashing:** Argon2id via `argon2-cffi`
- **Tokens:** Short-lived access token (30 min) + long-lived refresh token (7 days) via `pyjwt`
- **Google OAuth:** Verify `id_token` via `google-auth` library, upsert user + identity row
- **Apple OAuth:** Verify JWT via Apple public keys (JWKS), same upsert pattern
- **Session table replaced:** BetterAuth's `sessions` table is dropped. The new `user_identities` table stores OAuth provider links. Refresh tokens are either stateless (JWT) or stored in a `refresh_tokens` table for revocation support.

> The existing `sessions`, `accounts`, and `verifications` tables managed by BetterAuth become unused after migration. They are dropped in the initial Alembic migration.

### 3.2 ORM — Prisma → SQLAlchemy 2.0 (async)

SQLAlchemy is used with:
- `asyncpg` driver (non-blocking I/O)
- Declarative model base with UUID primary keys
- `TimestampModel` mixin for `created_at` / `updated_at`
- `pgvector` column type for `embeddingVector` on `Product`

Prisma `cuid()` IDs are replaced with **UUID v4** (consistent with wine-app-backend). Existing data rows keep their CUID strings; new rows get UUIDs. The ID column type changes to `VARCHAR` (not `UUID`) in Postgres to accommodate both formats during transition.

### 3.3 Repository Pattern + Unit of Work

Copied directly from wine-app-backend:

- `SQLAlchemyRepository[ModelType]` — generic CRUD with filter kwargs
- `PaginateRepositoryMixin` — page/per_page + total count
- `UnitOfWork` — async context manager, commits on exit, rolls back on `BaseHTTPException`

### 3.4 Configuration — Hierarchical Pydantic Settings

```python
# core/config/settings.py
class Settings(BaseModel):
    api: APIConfig
    postgres: PostgresConfig
    jwt: JWTConfig
    security: SecurityConfig
    openai: OpenAIConfig
    oauth: OAuthConfig        # google_client_id, apple_team_id, etc.
    gcs: GCSConfig
    revenuecat: RevenueCatConfig
    langsmith: LangSmithConfig

settings = Settings(
    api=APIConfig(),
    postgres=PostgresConfig(),
    ...
)
```

Each sub-config reads from `.env` via `pydantic-settings`. No global `os.environ` calls.

### 3.5 Exception Handling

```python
# core/exc/base.py
class BaseHTTPException(HTTPException, LoggerMixin):
    _exception_alias: str
    message_pattern: str

class ObjectNotFoundException(BaseHTTPException):     # 404
class ObjectExistsException(BaseHTTPException):       # 409
class UnauthorizedException(BaseHTTPException):       # 401
class ForbiddenException(BaseHTTPException):          # 403
class BadRequestException(BaseHTTPException):         # 400
class InsufficientBalanceException(BaseHTTPException): # 402
```

FastAPI exception handler maps these to JSON: `{"error": "<alias>", "message": "..."}`.

### 3.6 Dependency Injection

```python
# api/deps.py
UnitOfWorkDep = Annotated[UnitOfWork, Depends(UnitOfWork)]
CurrentUserDep = Annotated[User, Depends(get_current_user)]

async def get_current_user(
    token: str = Depends(HTTPBearer()),
    uow: UnitOfWork = Depends(UnitOfWork),
) -> User:
    payload = decode_access_token(token.credentials)
    user = await uow.users.get_one_or_none(id=payload["sub"])
    if not user:
        raise UnauthorizedException(...)
    return user
```

---

## 4. Database Migration Strategy

### 4.1 Schema Translation (Prisma → SQLAlchemy)

| Prisma Model | SQLAlchemy Model | Notes |
|---|---|---|
| `User` | `User` | Add `auth_provider` field; drop BetterAuth FK fields |
| `UserProfile` | `UserProfile` | Array fields → `ARRAY(Enum)` in PG |
| `Session` (BetterAuth) | **dropped** | Replaced by stateless JWT |
| `Account` (BetterAuth) | `UserIdentity` | provider_id + account_id + optional password hash |
| `Verification` (BetterAuth) | **dropped** | Email verification via JWT link |
| `Product` | `Product` | `embeddingVector` → `Vector(1536)` via pgvector |
| `Scan` | `Scan` | JSON fields kept as `JSONB` |
| `Comparison` | `Comparison` | Same |
| `Favorite` | `Favorite` | Same |
| `ProductIngredientCache` | `ProductIngredientCache` | Same |
| `FamilyMember` | `FamilyMember` | Same |

### 4.2 Enum Translation

Prisma enums map directly to Python `StrEnum`:

```python
# enums/base.py
class DietType(BaseStrEnum):
    NONE = "NONE"
    KETO = "KETO"
    VEGAN = "VEGAN"
    VEGETARIAN = "VEGETARIAN"
    PALEO = "PALEO"
    LOW_CARB = "LOW_CARB"
    GLUTEN_FREE = "GLUTEN_FREE"
    DAIRY_FREE = "DAIRY_FREE"

class MainGoal(BaseStrEnum):
    GENERAL_HEALTH = "GENERAL_HEALTH"
    WEIGHT_LOSS = "WEIGHT_LOSS"
    DIABETES_CONTROL = "DIABETES_CONTROL"
    PREGNANCY = "PREGNANCY"
    MUSCLE_GAIN = "MUSCLE_GAIN"

class Restriction(BaseStrEnum): ...
class Allergy(BaseStrEnum): ...
class NutritionPriority(BaseStrEnum): ...
class ScanSource(BaseStrEnum):
    barcode = "barcode"
    photo = "photo"
class ScanType(BaseStrEnum):
    product = "product"
    comparison = "comparison"
class PersonalAnalysisStatus(BaseStrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
class AuthProviderEnum(BaseStrEnum):
    email = "email"
    google = "google"
    apple = "apple"
```

### 4.3 Alembic Migration Plan

Two-phase approach to allow gradual cutover without downtime:

**Migration 0001 — Add new tables alongside old:**
- Create all new SQLAlchemy-managed tables with `_v2` suffix
- Keep BetterAuth tables intact
- Run data migration scripts to copy rows

**Migration 0002 — Cutover:**
- Rename `_v2` tables to final names
- Drop BetterAuth tables (`sessions`, `accounts`, `verifications`)
- Add pgvector extension if not present
- Add missing indexes

For a clean-start deployment (new environment, no existing data):
- Single migration `0001_initial_schema.py` creates all tables directly

---

## 5. API Endpoint Mapping

All routes shift from `/api/...` to `/api/v1/...` for versioning.

### 5.1 Auth — `/api/v1/auth`

| Old (Hono + BetterAuth) | New (FastAPI) | Method |
|---|---|---|
| `/api/auth/*` (delegated) | `/api/v1/auth/register` | `POST` |
| | `/api/v1/auth/login` | `POST` |
| | `/api/v1/auth/refresh` | `POST` |
| | `/api/v1/auth/google` | `POST` |
| | `/api/v1/auth/apple` | `POST` |
| | `/api/v1/auth/forgot-password` | `POST` |
| | `/api/v1/auth/reset-password` | `POST` |

### 5.2 Me — `/api/v1/me`

| Old | New | Method |
|---|---|---|
| `GET /api/me` | `GET /api/v1/me` | GET |
| `PATCH /api/me` | `PATCH /api/v1/me` | PATCH |
| Onboarding | `POST /api/v1/me/onboarding` | POST |

### 5.3 Scanner — `/api/v1/scanner`

| Old | New | Method |
|---|---|---|
| `POST /api/scanner/barcode` | `POST /api/v1/scanner/barcode` | POST |
| `POST /api/scanner/photo` | `POST /api/v1/scanner/photo` | POST (multipart) |

### 5.4 Scans — `/api/v1/scans`

| Old | New | Method |
|---|---|---|
| `GET /api/scans` | `GET /api/v1/scans` | GET (paginated) |
| `GET /api/scans/:id` | `GET /api/v1/scans/{scan_id}` | GET |
| `DELETE /api/scans/:id` | `DELETE /api/v1/scans/{scan_id}` | DELETE |

### 5.5 Comparisons — `/api/v1/comparisons`

| Old | New | Method |
|---|---|---|
| `POST /api/comparisons` | `POST /api/v1/comparisons` | POST |
| `GET /api/comparisons` | `GET /api/v1/comparisons` | GET (paginated) |

### 5.6 Favourites — `/api/v1/favourites`

| Old | New | Method |
|---|---|---|
| `POST /api/favourites` | `POST /api/v1/favourites` | POST |
| `GET /api/favourites` | `GET /api/v1/favourites` | GET (paginated) |
| `DELETE /api/favourites/:id` | `DELETE /api/v1/favourites/{favourite_id}` | DELETE |

### 5.7 Family Members — `/api/v1/family-members`

| Old | New | Method |
|---|---|---|
| `POST /api/family-members` | `POST /api/v1/family-members` | POST |
| `GET /api/family-members` | `GET /api/v1/family-members` | GET |
| `PATCH /api/family-members/:id` | `PATCH /api/v1/family-members/{id}` | PATCH |
| `DELETE /api/family-members/:id` | `DELETE /api/v1/family-members/{id}` | DELETE |

### 5.8 User — `/api/v1/user`

| Old | New | Method |
|---|---|---|
| `POST /api/user/subscription` (webhook) | `POST /api/v1/user/subscription/webhook` | POST |
| `GET /api/user/subscription` | `GET /api/v1/user/subscription` | GET |

### 5.9 Storage — `/api/v1/storage`

| Old | New | Method |
|---|---|---|
| `POST /api/storage/upload-url` | `POST /api/v1/storage/upload-url` | POST |

### 5.10 Analytics — `/api/v1/analytics`

| Old | New | Method |
|---|---|---|
| `GET /api/analytics` | `GET /api/v1/analytics` | GET |

### 5.11 Health

| Old | New | Method |
|---|---|---|
| `GET /health` | `GET /health` | GET |

---

## 6. Service Layer Porting

### 6.1 AI Services

All LangChain services port to Python with minimal logic changes — LangChain is Python-native and the existing TypeScript code follows the same chain/prompt patterns.

| TypeScript Service | Python Service |
|---|---|
| `product-facts-ai.ts` | `ai/product_facts_service.py` |
| `ingredient-analysis-ai.ts` | `ai/ingredient_analysis_service.py` |
| `comparison-ai.ts` | `ai/comparison_ai_service.py` |
| `product-embedding.service.ts` | `ai/product_embedding_service.py` |
| `product-vector-search.service.ts` | `ai/product_vector_search_service.py` |
| `photo-product-identification.ts` | `ai/photo_identification_service.py` |
| `nutrition-websearch.ts` | `ai/nutrition_websearch_service.py` |
| `websearch-fallback.ts` | `ai/nutrition_websearch_service.py` (merged) |
| `is-food-product.ts` | `ai/is_food_product_service.py` |

**Prompts** in `apps/server/src/domain/` are extracted to `app/prompts/product.py` as Python string templates or LangChain `PromptTemplate` objects.

### 6.2 OpenFoodFacts Client

```python
# clients/openfoodfacts_client.py
# Replaces: services/openfoodfacts-client.ts
# Use httpx (async) to call OpenFoodFacts API
# The openfoodfacts-python SDK or direct REST calls both work
```

### 6.3 Scanner Orchestration

The scanner flow (barcode → OFF lookup → websearch fallback → AI analysis → score → save) becomes `services/scanner_service.py`. Each step is an async method. Background analysis jobs use FastAPI's `BackgroundTasks` instead of a separate job runner.

```python
class ScannerService:
    async def scan_barcode(self, barcode: str, user: User, uow: UnitOfWork) -> ScanResponse:
        product = await self._get_or_fetch_product(barcode, uow)
        scan = await uow.scans.create(...)
        background_tasks.add_task(self._run_personal_analysis, scan.id, user, ...)
        return scan

    async def scan_photo(self, image: UploadFile, user: User, uow: UnitOfWork) -> ScanResponse:
        barcode = await self.photo_id_service.identify(image)
        return await self.scan_barcode(barcode, user, uow)
```

### 6.4 RevenueCat Webhook

```python
# services/revenuecat_service.py
# Verifies X-RevenueCat-Webhook-Auth-Token header
# Updates user.subscription_status, subscription_plan, subscription_expiry
# Mirrors current TypeScript logic in routes/user.ts
```

---

## 7. Key Implementation Details

### 7.1 pgvector Setup

```python
# models/product.py
from pgvector.sqlalchemy import Vector

class Product(Base, UUIDModel, TimestampModel):
    __tablename__ = "products"
    ...
    embedding_vector: Mapped[Optional[list[float]]] = mapped_column(Vector(1536), nullable=True)
```

Alembic migration must run `CREATE EXTENSION IF NOT EXISTS vector;` before creating the column.

### 7.2 JSONB Fields

Prisma `Json` fields map to SQLAlchemy `JSONB`:

```python
from sqlalchemy.dialects.postgresql import JSONB

evaluation: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
personal_result: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
```

### 7.3 Array Fields

Prisma `String[]` and enum arrays map to `ARRAY`:

```python
from sqlalchemy import ARRAY, String
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY

ingredients: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
restrictions: Mapped[list[Restriction]] = mapped_column(
    ARRAY(SAEnum(Restriction, name="restriction")), default=list
)
```

### 7.4 Background Tasks vs Async Jobs

Current `analysis-jobs.ts` queues async analysis after a scan. In FastAPI this maps to:

- **Simple approach:** `BackgroundTasks` — FastAPI runs the task after response is sent. No persistence, no retry on crash.
- **Robust approach (recommended):** Celery + Redis or `arq` (async job queue). Allows retry on failure and monitoring.

Given the existing architecture has no queue, start with `BackgroundTasks` and migrate to `arq` in a follow-up task.

### 7.5 Image Processing

```python
# utils/image.py
# Replaces: lib/image-processing.ts
# Use Pillow (PIL) for resize/compress before upload
from PIL import Image
import io
```

---

## 8. Environment Variables Mapping

```ini
# .env.example (new)

# API
PORT=3000
RELOAD=true

# Postgres
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/yuka

# JWT
JWT_SECRET=<secret>
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

# OAuth
GOOGLE_CLIENT_ID=
APPLE_TEAM_ID=
APPLE_KEY_ID=
APPLE_PRIVATE_KEY=

# OpenAI
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# GCS
GCS_BUCKET_NAME=
GOOGLE_APPLICATION_CREDENTIALS=

# RevenueCat
REVENUECAT_WEBHOOK_SECRET=

# LangSmith (optional)
LANGCHAIN_API_KEY=
LANGCHAIN_TRACING_V2=false
```

Old TypeScript env vars that are removed: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.

---

## 9. pyproject.toml

```toml
[project]
name = "yuka-server"
version = "0.1.0"
requires-python = ">=3.13"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.34.0",
    "sqlalchemy>=2.0.48",
    "asyncpg>=0.30.0",
    "alembic>=1.18.0",
    "pydantic[email]>=2.12.0",
    "pydantic-settings>=2.13.0",
    "pyjwt>=2.12.0",
    "argon2-cffi>=25.1.0",
    "google-auth>=2.49.0",
    "langchain-core>=0.3.0",
    "langchain-openai>=0.3.0",
    "openai>=2.30.0",
    "pgvector>=0.3.0",
    "google-cloud-storage>=2.19.0",
    "pillow>=12.1.0",
    "httpx>=0.28.0",
    "loguru>=0.7.3",
    "python-multipart>=0.0.20",
]

[dependency-groups]
dev = [
    "pytest>=8.0.0",
    "pytest-asyncio>=0.25.0",
    "httpx>=0.28.0",
    "ruff>=0.9.0",
    "mypy>=1.14.0",
]
```

---

## 10. Migration Phases

### Phase 1 — Project Scaffold
**Goal:** Running FastAPI app that responds to `/health`, with DB connected.

- [ ] Create `apps/server-py/` directory
- [ ] Initialize UV project (`uv init`)
- [ ] Add all dependencies to `pyproject.toml`
- [ ] Create `app/api/init_app.py` with FastAPI factory
- [ ] Create `app/core/config/` — all settings classes
- [ ] Create `app/db/postgres.py` — async engine
- [ ] Create `app/api/endpoints/health.py`
- [ ] Configure Alembic
- [ ] Write `GET /health` test

**Done when:** `uvicorn app.api.main:app` starts, `/health` returns `{"status": "ok"}`, DB ping succeeds.

---

### Phase 2 — Database Models + Migration
**Goal:** All SQLAlchemy models defined, Alembic migration creates schema.

- [ ] Create `app/models/base.py` — `UUIDModel`, `TimestampModel`, `Base`
- [ ] Create all model files (user, user_profile, user_identity, product, scan, comparison, favorite, family_member, product_ingredient_cache)
- [ ] Create `app/enums/base.py`
- [ ] Write Alembic migration `0001_initial_schema.py`
- [ ] Run `alembic upgrade head` against dev DB
- [ ] Verify all tables + indexes created

**Done when:** All tables exist in DB with correct columns, types, constraints, and indexes.

---

### Phase 3 — Repository + Unit of Work
**Goal:** Data access layer fully working.

- [ ] Create `app/repositories/base.py` — generic `SQLAlchemyRepository` + `PaginateMixin`
- [ ] Create all concrete repositories
- [ ] Create `app/utils/unitofwork.py`
- [ ] Write unit tests for base repository CRUD

**Done when:** Repository tests pass against test DB.

---

### Phase 4 — Auth Endpoints
**Goal:** Full auth flow working (email/password + Google + Apple).

- [ ] Create `app/utils/security.py` — Argon2 hash/verify
- [ ] Create `app/utils/token_service.py` — JWT access + refresh
- [ ] Create `app/utils/google_auth.py` — verify Google id_token
- [ ] Create `app/utils/apple_auth.py` — verify Apple JWT
- [ ] Create `app/core/exc/base.py` — exception hierarchy
- [ ] Create `app/services/auth_service.py`
- [ ] Create `app/schemas/auth.py`
- [ ] Create `app/api/endpoints/auth.py`
- [ ] Create `app/api/deps.py` — `CurrentUserDep`
- [ ] Write integration tests for all auth endpoints

**Done when:** Can register, login, refresh token, and authenticate via Google/Apple. Invalid tokens return 401.

---

### Phase 5 — Me / User / Profile Endpoints
**Goal:** Authenticated user can read and update their profile.

- [ ] Create `app/services/user_service.py`
- [ ] Create `app/schemas/user.py`
- [ ] Create `app/api/endpoints/me.py` — GET/PATCH me, onboarding
- [ ] Create `app/api/endpoints/user.py` — subscription webhook
- [ ] Write tests

**Done when:** Onboarding flow works end-to-end. RevenueCat webhook updates subscription status.

---

### Phase 6 — Scanner (Barcode + Photo)
**Goal:** Core product scanning flow works.

- [ ] Port `clients/openfoodfacts_client.py`
- [ ] Port `app/utils/image.py`
- [ ] Port `app/services/gcs_service.py`
- [ ] Port AI services: `product_facts_service.py`, `is_food_product_service.py`, `ingredient_analysis_service.py`, `nutrition_websearch_service.py`, `photo_identification_service.py`
- [ ] Port `app/prompts/product.py`
- [ ] Create `app/services/scanner_service.py`
- [ ] Create `app/schemas/scanner.py`
- [ ] Create `app/api/endpoints/scanner.py`
- [ ] Write integration tests (mock LLM calls)

**Done when:** Barcode and photo scan endpoints return scored product analysis. Personal analysis runs in background.

---

### Phase 7 — Scan History, Comparisons, Favourites, Family Members
**Goal:** All remaining CRUD-heavy endpoints.

- [ ] Port `services/scan_service.py` + `schemas/scan.py` + `endpoints/scans.py`
- [ ] Port comparison AI service + `services/comparison_service.py` + endpoint
- [ ] Port `services/favourite_service.py` + endpoint
- [ ] Port `services/family_member_service.py` + endpoint
- [ ] Port `endpoints/analytics.py`
- [ ] Port `endpoints/storage.py` (presigned GCS URL)
- [ ] Write tests for all

**Done when:** All CRUD operations work with auth. Pagination works on list endpoints.

---

### Phase 8 — Product Embeddings
**Goal:** Vector search works for comparison suggestions.

- [ ] Port `ai/product_embedding_service.py`
- [ ] Port `ai/product_vector_search_service.py`
- [ ] Port backfill script as `scripts/backfill_product_embeddings.py`
- [ ] Test similarity search returns ranked results

**Done when:** `find_similar_products(barcode)` returns correct nearest neighbors from pgvector.

---

### Phase 9 — Integration Testing + Hardening
**Goal:** Production-ready.

- [ ] Full end-to-end test suite with real DB (pytest-asyncio + httpx `AsyncClient`)
- [ ] Linting: `ruff check .` passes
- [ ] Type checking: `mypy app/` passes
- [ ] Add `Dockerfile` for `apps/server-py/`
- [ ] Update `docker-compose.yml` to use new service
- [ ] Load test scanner endpoint (ensure no blocking I/O)
- [ ] Add structured logging via `loguru`
- [ ] Add `SENTRY_DSN` support (optional)

---

### Phase 10 — Cutover
**Goal:** Mobile app pointing to new backend, old server retired.

- [ ] Update mobile app base URL from `/api/` to `/api/v1/`
- [ ] Update auth token handling — mobile must store and send Bearer JWT (not BetterAuth session cookies)
- [ ] Run Alembic cutover migration against production DB
- [ ] Deploy new FastAPI server
- [ ] Monitor for errors
- [ ] Retire `apps/server/` (Hono) after stability confirmed

---

## 11. Mobile App Impact

The mobile app (`apps/mobile`) needs these changes alongside the backend migration:

1. **Auth token storage:** Replace BetterAuth session management with standard Bearer JWT storage (access token + refresh token). Use `expo-secure-store` for token persistence.
2. **Base URL:** Update API base URL to include `/v1` prefix.
3. **Token refresh:** Implement axios/fetch interceptor that calls `POST /api/v1/auth/refresh` on 401 and retries the original request.
4. **OAuth flow:** Google/Apple sign-in now returns JWT tokens instead of BetterAuth session — update the auth callback handlers.

---

## 12. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| BetterAuth session migration breaks existing logged-in users | High | High | Implement token migration endpoint; have users re-login |
| pgvector extension not available on prod DB | Medium | Medium | Run `CREATE EXTENSION IF NOT EXISTS vector` in migration with explicit check |
| LangChain Python API differs from JS API for some chains | Low | Medium | Review each chain against Python LangChain docs before porting |
| CUID → UUID transition causes FK integrity issues | Medium | High | Keep ID columns as VARCHAR; don't change existing row IDs |
| Background analysis job loss on server restart | Medium | Low | Acceptable initially; add `arq` queue in follow-up task |
| RevenueCat webhook signature validation differences | Low | Medium | Test with RevenueCat test events before cutover |
