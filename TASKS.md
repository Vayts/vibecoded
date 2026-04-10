# TASKS.md

Task tracker for the FastAPI backend migration. Work top to bottom. One task at a time.

**Statuses:** `todo` | `in-progress` | `blocked` | `done`

---

## Phase 1 — Project Scaffold

| ID | Task | Status | Notes |
|---|---|---|---|
| 1.1 | Create `apps/server-py/` and initialize UV project with `pyproject.toml` | done | |
| 1.2 | Create hierarchical Pydantic settings (`app/core/config/`) | done | |
| 1.3 | Create async SQLAlchemy engine (`app/db/postgres.py`) | done | |
| 1.4 | Create FastAPI app factory with CORS + lifespan (`app/api/init_app.py`) | done | |
| 1.5 | Create `GET /health` endpoint and wire up uvicorn entry point | done | |
| 1.6 | Configure Alembic (`alembic.ini` + `migrations/env.py`) | done | |

## Phase 2 — Database Models + Migration

| ID | Task | Status | Notes |
|---|---|---|---|
| 2.1 | Create `app/models/base.py` — `UUIDModel`, `TimestampModel`, `Base` | done | |
| 2.2 | Create `app/enums/base.py` — all enums from Prisma schema | done | |
| 2.3 | Create all model files (user, user_profile, user_identity, product, scan, comparison, favorite, family_member, product_ingredient_cache) | done | |
| 2.4 | Write Alembic migration `0001_initial_schema.py` and verify against dev DB | done | Written manually; autogenerate skipped (no local DB) |

## Phase 3 — Repository + Unit of Work

| ID | Task | Status | Notes |
|---|---|---|---|
| 3.1 | Create `app/repositories/base.py` — generic `SQLAlchemyRepository` + `PaginateMixin` | todo | |
| 3.2 | Create all concrete repositories (one per model) | todo | |
| 3.3 | Create `app/utils/unitofwork.py` — async context manager with all repos | todo | |

## Phase 4 — Auth Endpoints

| ID | Task | Status | Notes |
|---|---|---|---|
| 4.1 | Create `app/core/exc/base.py` — exception hierarchy | todo | |
| 4.2 | Create `app/utils/security.py` — Argon2 hash/verify | todo | |
| 4.3 | Create `app/utils/token_service.py` — JWT access + refresh | todo | |
| 4.4 | Create `app/utils/google_auth.py` + `app/utils/apple_auth.py` | todo | |
| 4.5 | Create `app/services/auth_service.py` | todo | |
| 4.6 | Create `app/schemas/auth.py` + `app/api/endpoints/auth.py` | todo | |
| 4.7 | Create `app/api/deps.py` — `UnitOfWorkDep`, `CurrentUserDep` | todo | |

## Phase 5 — Me / User / Profile Endpoints

| ID | Task | Status | Notes |
|---|---|---|---|
| 5.1 | Create `app/services/user_service.py` | todo | |
| 5.2 | Create `app/schemas/user.py` | todo | |
| 5.3 | Create `app/api/endpoints/me.py` — GET/PATCH me, onboarding | todo | |
| 5.4 | Create `app/api/endpoints/user.py` — subscription webhook | todo | |

## Phase 6 — Scanner (Barcode + Photo)

| ID | Task | Status | Notes |
|---|---|---|---|
| 6.1 | Port `app/clients/openfoodfacts_client.py` | todo | |
| 6.2 | Port `app/utils/image.py` (Pillow) + `app/services/gcs_service.py` | todo | |
| 6.3 | Port AI services: product_facts, is_food_product, ingredient_analysis, nutrition_websearch, photo_identification | todo | |
| 6.4 | Port `app/prompts/product.py` from TypeScript domain logic | todo | |
| 6.5 | Create `app/services/scanner_service.py` + `app/schemas/scanner.py` | todo | |
| 6.6 | Create `app/api/endpoints/scanner.py` | todo | |

## Phase 7 — Scans, Comparisons, Favourites, Family Members, Analytics, Storage

| ID | Task | Status | Notes |
|---|---|---|---|
| 7.1 | Scans: service + schema + endpoint | todo | |
| 7.2 | Comparisons: AI service + service + schema + endpoint | todo | |
| 7.3 | Favourites: service + schema + endpoint | todo | |
| 7.4 | Family members: service + schema + endpoint | todo | |
| 7.5 | Analytics: service + schema + endpoint | todo | |
| 7.6 | Storage: presigned GCS URL endpoint | todo | |

## Phase 8 — Product Embeddings

| ID | Task | Status | Notes |
|---|---|---|---|
| 8.1 | Port `app/services/ai/product_embedding_service.py` | todo | |
| 8.2 | Port `app/services/ai/product_vector_search_service.py` | todo | |
| 8.3 | Create `scripts/backfill_product_embeddings.py` | todo | |

## Phase 9 — Hardening + Dockerization

| ID | Task | Status | Notes |
|---|---|---|---|
| 9.1 | Add `Dockerfile` for `apps/server-py/` | todo | |
| 9.2 | Update `docker-compose.yml` to include new service | todo | |
| 9.3 | Ruff linting + mypy type checking passing | todo | |
| 9.4 | Structured logging via loguru | todo | |

## Phase 10 — Cutover

| ID | Task | Status | Notes |
|---|---|---|---|
| 10.1 | Update mobile app auth token handling (Bearer JWT) | todo | |
| 10.2 | Update mobile app base URL to `/api/v1` | todo | |
| 10.3 | Run Alembic cutover migration on production DB | todo | |
| 10.4 | Deploy FastAPI server and retire `apps/server/` | todo | |
