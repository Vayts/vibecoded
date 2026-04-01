# Migration Plan: Yuka Backend → Python/FastAPI

## Context

The Yuka backend (currently Hono/TypeScript/Prisma in `apps/server/`) needs to be rewritten in Python/FastAPI while maintaining full API compatibility with the React Native/Expo mobile app. The wine-app-backend serves as the reference for all patterns, structure, and code style.

**Why:** Python/FastAPI standardization across projects, following established patterns from wine-app-backend.

**Key constraint:** The mobile app must continue working without changes — all API paths, request/response shapes, and auth flow must be preserved.

---

## Project Structure

Create `apps/server-py/` following the wine-app-backend layout:

```
apps/server-py/
├── app/
│   ├── api/
│   │   ├── init_app.py              # FastAPI factory, CORS, lifespan
│   │   ├── main.py                  # Uvicorn runner
│   │   ├── deps.py                  # Auth deps (CurrentUserDep), UnitOfWorkDep
│   │   └── endpoints/
│   │       ├── __init__.py           # api_router aggregating all sub-routers
│   │       ├── auth.py              # BetterAuth-compatible JWT auth
│   │       ├── scanner.py           # Barcode scan, lookup, compare, job polling
│   │       ├── scanner_photo.py     # Photo-based product identification
│   │       ├── scans.py             # History + detail
│   │       ├── favourites.py        # CRUD
│   │       ├── user.py              # Profile update, subscription, delete
│   │       ├── onboarding.py        # GET/POST /api/me/onboarding
│   │       ├── family_members.py    # CRUD (max 10)
│   │       ├── analytics.py         # Event logging
│   │       ├── storage.py           # MinIO image proxy
│   │       └── health.py            # Health check
│   ├── core/
│   │   ├── config/                  # Pydantic BaseSettings (api, jwt, postgres, openai, oauth, minio, redis)
│   │   └── exc/                     # Exception hierarchy (copy wine-app pattern)
│   ├── models/                      # SQLAlchemy models matching existing Prisma schema
│   ├── schemas/                     # Pydantic request/response DTOs
│   ├── enums/                       # DietType, MainGoal, Restriction, Allergy, NutritionPriority
│   ├── repositories/               # Generic SQLAlchemyRepository + specialized repos
│   ├── services/                    # Business logic layer
│   ├── domain/                      # Pure domain logic (scoring, evaluation, normalization)
│   ├── utils/                       # UnitOfWork, token_service, security, google_auth, apple_auth
│   ├── clients/                     # OpenAI/LangChain client factory
│   └── db/
│       └── postgres.py              # Async engine + session factory
├── migrations/                      # Alembic (baseline no-op for existing DB)
├── alembic.ini
├── pyproject.toml
├── Dockerfile
├── startup.sh
└── .env.example
```

**Reference patterns from wine-app-backend:**
- Structure: `app/` directory layout
- UnitOfWork: `app/utils/unitofwork.py`
- Base repository: `app/repositories/base.py`
- Exceptions: `app/core/exc/`
- Auth service: `app/services/auth_service.py`
- App factory: `app/api/init_app.py`

---

## Phase 1: Scaffolding & Database Layer

### 1.1 Project setup
- `pyproject.toml` with UV
- Dependencies: `fastapi`, `uvicorn`, `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `pydantic-settings`, `pyjwt`, `python-jose[cryptography]`, `passlib[bcrypt]`, `google-auth`, `httpx`, `langchain-openai`, `openai`, `pgvector`, `minio`, `pillow`, `openfoodfacts`, `loguru`, `redis[hiredis]`, `python-multipart`
- Config classes following wine-app pattern (`core/config/`)

### 1.2 SQLAlchemy models
Map to EXISTING Prisma tables exactly (same table/column names, types).

**Critical differences from wine-app:**
- **String PKs (CUID)**, not UUIDs — use `mapped_column(String, primary_key=True, default=cuid_generator)`
- **Existing PG enums** — use `SAEnum(EnumClass, name="EnumName", create_type=False)` to reference Prisma-created enums
- **PG arrays of enums** — `ARRAY(SAEnum(..., create_type=False))`
- **pgvector** — `from pgvector.sqlalchemy import Vector; mapped_column(Vector(1536))`
- **JSON columns** — `mapped_column(postgresql.JSON)`
- **BetterAuth tables** (user, session, account, verification) — must have models matching Prisma schema

**Source of truth:** `apps/server/prisma/schema.prisma`

### 1.3 Alembic baseline
No-op first migration + `alembic stamp head` — DB already has tables from Prisma.

### 1.4 Repositories & UnitOfWork
- Copy wine-app generic `SQLAlchemyRepository[ModelType]` base
- Specialized repos: `ProductRepository` (barcode lookup, pgvector similarity search via raw SQL), `ScanRepository` (cursor pagination), `FavoriteRepository`, `IngredientCacheRepository` (barcode + profileHash lookup), `FamilyMemberRepository` (count by user)
- UnitOfWork aggregating all repos (copy wine-app pattern)

---

## Phase 2: Auth (BetterAuth → JWT Compatibility Layer)

**The hardest part.** BetterAuth is TypeScript-only. The mobile uses `@better-auth/expo` which stores cookies in SecureStore and sends them via `Cookie` header.

### Strategy
Build JWT-based endpoints that mimic BetterAuth's API contract so the mobile client works without changes.

### Endpoints to implement
| Mobile calls | Python implementation |
|---|---|
| `POST /api/auth/sign-up/email` | Create user + account, return session + set cookie with JWT |
| `POST /api/auth/sign-in/email` | Verify bcrypt password, return session + set cookie |
| `POST /api/auth/sign-in/social` | Verify Google/Apple ID token, find/create user, set cookie |
| `GET /api/auth/get-session` | Read JWT from Cookie header, return `{ user, session }` |
| `POST /api/auth/sign-out` | Clear session cookie |

### Cookie mechanism
- The `expoClient` stores a serialized JSON map of cookies in SecureStore
- `getCookieString()` returns it as a standard `Cookie` header string
- Cookie name used by BetterAuth: `better-auth.session_token`
- Python backend must set this same cookie name with JWT content
- Auth middleware reads JWT from `Cookie` header (primary) or `Authorization: Bearer` (fallback)

### Password hashing
BetterAuth uses **bcrypt** — must use `passlib[bcrypt]` (NOT argon2 like wine-app) for backwards compatibility with existing hashes in the `accounts` table.

### OAuth
- Copy wine-app's `google_auth.py` and `apple_auth.py` patterns
- Google: `google-auth` library to verify ID tokens
- Apple: `python-jose` to verify JWTs against Apple JWKS

### Session migration
Existing BetterAuth sessions (opaque tokens) will be invalid after migration — users must re-login once. Acceptable one-time disruption.

**Key mobile files to understand:**
- `apps/mobile/shared/lib/auth/betterAuthClient.ts` — cookie mechanism
- `apps/mobile/shared/lib/client/client.ts` — how Cookie header is set on every request

---

## Phase 3: Pydantic Schemas

Convert all Zod schemas to Pydantic models producing **identical JSON shapes**.

**Source:** `packages/shared/src/schemas.ts` and `onboarding.ts`

Key schemas: `BarcodeLookupRequest`, `NormalizedProduct`, `ProductAnalysisResult`, `PersonalAnalysisResult`, `MultiProfilePersonalAnalysisResult`, `ScanHistoryItem`, `ScanDetailResponse`, `CompareProductsRequest/Response`, `OnboardingRequest/Response`, `FamilyMember`, `FavouritesResponse`

**Caution:** Mixed casing — some fields are `snake_case` (`product_name`), some `camelCase` (`fitScore`, `overallScore`). Use `Field(alias=...)` and `model_config = ConfigDict(populate_by_name=True, by_alias=True)` to match exactly.

---

## Phase 4: Services

### 4.1 Analysis Job Queue
Replace in-memory `Map<string, Job>` with **Redis-backed storage** (follows wine-app Redis pattern):
- Store jobs as JSON with 10min TTL
- Use `asyncio.create_task()` for fire-and-forget analysis pipeline
- Two-phase: Phase 1 deterministic (fast) → Phase 2 AI ingredient analysis (background)

### 4.2 OpenFoodFacts Client
Python `openfoodfacts` SDK (synchronous) — wrap in `asyncio.to_thread()`

### 4.3 AI Services (LangChain Python)
- `langchain-openai` `ChatOpenAI` for GPT-4o vision, GPT-4o-mini text
- `OpenAIEmbeddings` for text-embedding-3-small
- `with_structured_output(PydanticModel)` for structured extraction
- `bind_tools([{"type": "web_search_preview"}])` for web search fallback

### 4.4 MinIO Storage
`minio` Python SDK (synchronous) — wrap in `asyncio.to_thread()`

### 4.5 Image Processing
Replace `sharp` with `Pillow` — resize, JPEG compression, base64 encoding

### 4.6 Domain Logic (Pure Functions)
Port deterministic scoring from TypeScript to Python:
- `domain/personal_analysis/` — fitScore calculation, restriction/allergy checks, nutrition rules
- `domain/product_evaluation/` — heuristic scoring rules
- `domain/product_normalization/` — OpenFoodFacts response normalization

**Source files:**
- `apps/server/src/domain/personal-analysis/`
- `apps/server/src/domain/product-evaluation/`
- `apps/server/src/services/`

---

## Phase 5: Endpoints

Implement in dependency order:

1. `GET /health` — trivial
2. `POST/GET /api/auth/*` — auth (Phase 2)
3. `GET/POST /api/me/onboarding` — needed for analysis
4. `PATCH /api/user`, `GET /api/user/subscription`, `DELETE /api/user`
5. `POST /api/scanner/barcode` — core scan flow
6. `GET /api/scanner/personal-analysis/:jobId` — job polling
7. `POST /api/scanner/lookup` — lightweight lookup
8. `POST /api/scanner/photo` — photo identification (GPT-4o vision + fallbacks)
9. `POST /api/scanner/compare` — AI product comparison
10. `GET /api/scans/history`, `GET /api/scans/:id`
11. `GET/POST/DELETE /api/favourites/*`
12. `GET/POST/PATCH/DELETE /api/family-members/*`
13. `POST /api/analytics/event`
14. `GET /api/storage/products/:filename` — MinIO proxy

**Important:** No `/api/v1` prefix — Yuka uses `/api/` directly (unlike wine-app's `/api/v1/`).

---

## Phase 6: Docker & Infrastructure

### Dockerfile
Alpine Python 3.13 + UV (copy wine-app pattern), add `jpeg-dev zlib-dev` for Pillow.

### startup.sh
```bash
uv run alembic upgrade head && exec uv run uvicorn app.api.init_app:app --host 0.0.0.0 --port ${PORT:-3000}
```

### docker-compose.yml
Add Redis service. Replace Node server with Python server. Keep existing PostgreSQL + MinIO.

---

## Phase 7: Verification

### Testing checklist
1. **Health:** `GET /health` returns 200
2. **Auth flow:** Sign up with email → sign in → get-session returns user → sign out clears cookie
3. **OAuth:** Google/Apple sign-in with test ID tokens
4. **Onboarding:** POST profile → GET returns same data
5. **Barcode scan:** POST barcode → get product + evaluation → poll job → get completed analysis
6. **Photo scan:** POST base64 image → get identified product
7. **Scan history:** GET paginated history, GET scan detail
8. **Favorites:** Add/remove/list/status check
9. **Family members:** CRUD operations, max 10 limit
10. **Comparison:** Compare two products
11. **Storage:** Uploaded product images accessible via proxy
12. **Mobile E2E:** Connect actual mobile app to new backend, test full flows

### Response shape validation
Compare JSON responses from old (Hono) and new (FastAPI) backends for each endpoint to ensure exact field/type match.

---

## Risks

| Risk | Severity | Mitigation |
|---|---|---|
| BetterAuth cookie format mismatch | HIGH | Inspect actual cookies from mobile client via logging before deploy |
| Prisma enum type name casing | MEDIUM | Check PG catalog for exact enum names: `SELECT typname FROM pg_type WHERE typtype='e'` |
| CUID generation format | MEDIUM | Use `cuid2` Python package; existing CUID v1 IDs still work as string PKs |
| Mixed camelCase/snake_case in JSON responses | MEDIUM | Thorough comparison testing of every endpoint's response shape |
| Synchronous SDK blocking event loop | LOW | Wrap all sync SDKs (openfoodfacts, minio, pillow) in `asyncio.to_thread()` |
