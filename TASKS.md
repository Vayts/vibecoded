# TASKS.md

Task tracker for the Yuka backend Python/FastAPI migration. Work top to bottom. One task at a time.

See `docs/MIGRATION_PLAN.md` for the full migration plan and context.

**Statuses:** `todo` | `in-progress` | `blocked` | `done`

---

## Migration: Python/FastAPI Backend (`apps/server-py/`)

| ID | Task | Status | Notes |
|----|------|--------|-------|
| M-0.1 | Docs: create migration plan + update CLAUDE.md, CODING_GUIDELINES.md, TASKS.md, BUILDING.md | `done` | Branch: `feature/python-fastapi-migration` |
| M-1.1 | Scaffold `apps/server-py/` — pyproject.toml, uv.lock, directory structure, Dockerfile, startup.sh, .env.example | `todo` | Follow wine-app-backend layout exactly |
| M-1.2 | Config layer — Pydantic BaseSettings classes (api, jwt, postgres, openai, oauth, minio, redis) | `todo` | |
| M-1.3 | DB layer — async SQLAlchemy engine + session factory | `todo` | |
| M-1.4 | SQLAlchemy models — map ALL Prisma tables (User, Session, Account, Verification, UserProfile, Product, Scan, Favorite, ProductIngredientCache, FamilyMember) | `todo` | CUID string PKs; `create_type=False` for existing PG enums; pgvector Vector(1536) |
| M-1.5 | Alembic setup — baseline no-op migration for existing DB | `todo` | `alembic stamp head` against existing schema |
| M-1.6 | Generic repository base + UnitOfWork (copy wine-app pattern) | `todo` | |
| M-1.7 | Specialized repositories (Product, Scan, Favorite, IngredientCache, FamilyMember, User) | `todo` | Product needs pgvector raw SQL similarity search |
| M-2.1 | FastAPI app factory (`init_app.py`) — CORS, lifespan, router registration | `todo` | No `/api/v1` prefix |
| M-2.2 | Exception hierarchy (copy wine-app `core/exc/` pattern) | `todo` | |
| M-2.3 | Auth utils — JWT token service, bcrypt security, Google OAuth, Apple OAuth | `todo` | bcrypt (not argon2) for BetterAuth password compat |
| M-2.4 | Auth endpoints (`/api/auth/*`) — BetterAuth-compatible API (sign-up, sign-in, social, get-session, sign-out) | `todo` | Must set `better-auth.session_token` cookie with JWT |
| M-2.5 | Auth middleware — `CurrentUserDep` reading JWT from Cookie or Bearer header | `todo` | |
| M-3.1 | Pydantic schemas — all request/response DTOs matching existing Zod schemas exactly | `todo` | Mixed camelCase/snake_case — use Field(alias=...) |
| M-4.1 | OpenFoodFacts client (async-wrapped) | `todo` | |
| M-4.2 | Product normalization domain logic (port from TS `domain/product-normalization/`) | `todo` | |
| M-4.3 | WebSearch fallback service (GPT-4o + web_search_preview tool) | `todo` | |
| M-4.4 | Product evaluation domain logic (port from TS `domain/product-evaluation/`) | `todo` | |
| M-4.5 | Personal analysis domain logic (port from TS `domain/personal-analysis/`) | `todo` | Deterministic scoring — restriction, allergy, nutrition rules |
| M-4.6 | Ingredient analysis AI service (GPT-4o-mini structured output + profile hash cache) | `todo` | |
| M-4.7 | Redis-backed analysis job queue (replaces in-memory Map) | `todo` | asyncio.create_task for fire-and-forget, 10min TTL |
| M-4.8 | Product embedding service (text-embedding-3-small via LangChain) | `todo` | |
| M-4.9 | Product vector search service (pgvector cosine similarity) | `todo` | |
| M-4.10 | Photo product identification service (GPT-4o vision → barcode/vector/websearch fallback) | `todo` | |
| M-4.11 | Product comparison AI service (GPT-4o-mini, all profiles) | `todo` | |
| M-4.12 | MinIO storage service (async-wrapped) + image processing with Pillow | `todo` | |
| M-5.1 | Endpoint: `GET /health` | `todo` | |
| M-5.2 | Endpoint: `GET/POST /api/me/onboarding` | `todo` | |
| M-5.3 | Endpoints: `PATCH /api/user`, `GET /api/user/subscription`, `DELETE /api/user` | `todo` | |
| M-5.4 | Endpoint: `POST /api/scanner/barcode` | `todo` | Full scan flow: OFF → websearch → analysis job |
| M-5.5 | Endpoint: `GET /api/scanner/personal-analysis/:jobId` | `todo` | Job polling |
| M-5.6 | Endpoint: `POST /api/scanner/lookup` | `todo` | Lightweight product lookup, no analysis |
| M-5.7 | Endpoint: `POST /api/scanner/photo` | `todo` | Photo identification pipeline |
| M-5.8 | Endpoint: `POST /api/scanner/compare` | `todo` | AI product comparison |
| M-5.9 | Endpoints: `GET /api/scans/history`, `GET /api/scans/:id` | `todo` | Cursor pagination |
| M-5.10 | Endpoints: `GET/POST/DELETE /api/favourites`, `GET /api/favourites/status/:productId` | `todo` | |
| M-5.11 | Endpoints: `GET/POST/PATCH/DELETE /api/family-members` | `todo` | Max 10 per user |
| M-5.12 | Endpoint: `POST /api/analytics/event` | `todo` | |
| M-5.13 | Endpoint: `GET /api/storage/products/:filename` | `todo` | MinIO proxy |
| M-6.1 | Docker — Dockerfile + update docker-compose.yml (add Redis, swap Node server for Python) | `todo` | |
| M-7.1 | Response shape validation — compare JSON from old and new backend for every endpoint | `todo` | |
| M-7.2 | Mobile E2E test — connect app to Python backend, test all flows | `todo` | |
