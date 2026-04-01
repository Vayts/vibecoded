# CODING_GUIDELINES.md

## Tech stack

### Monorepo

- **pnpm** — JS/TS package manager (no npm, no yarn)
- **uv** — Python package manager (no pip, no poetry)
- **Turborepo** — build orchestration, caching
- **Structure:**
  ```
  apps/
    mobile/        # Expo (React Native)
    server/        # Hono (Node.js backend) — LEGACY, kept as reference
    server-py/     # FastAPI (Python backend) — ACTIVE
  packages/
    shared/        # Zod schemas, DTO types, constants (used by mobile)
  ```

### Mobile (apps/mobile)

- Expo SDK 54+, New Architecture, Hermes engine
- Expo Router v4 (file-based routing)
- expo-sqlite (local DB for offline)
- expo-camera + expo-image-picker (camera/photo input)
- expo-image-manipulator (client-side compression)
- expo-secure-store (auth token storage)
- Zustand (state management)
- NativeWind (Tailwind CSS for React Native)
- Build: `expo prebuild` → Xcode (local builds, no EAS)

### Server — Python/FastAPI (apps/server-py) ← ACTIVE

- Python 3.13+, uv
- FastAPI + Uvicorn (ASGI)
- SQLAlchemy 2.0 async + asyncpg (PostgreSQL)
- Alembic (migrations)
- Pydantic v2 + pydantic-settings (validation, config)
- PyJWT + passlib[bcrypt] (auth — bcrypt for BetterAuth compat)
- google-auth + python-jose (OAuth verification)
- LangChain OpenAI + OpenAI SDK (GPT-4o vision, GPT-4o-mini, embeddings)
- pgvector (product similarity search)
- minio (S3-compatible storage)
- Pillow (image processing)
- openfoodfacts (product lookup)
- Redis (analysis job queue, caching)
- Loguru (structured logging)
- Reference patterns: `/Users/doodko/meduzzen/wine-app/wine-app-backend/`

### Server — TypeScript/Hono (apps/server) ← LEGACY (do not modify)

- Node.js 20+, Hono, Prisma, LangChain.js, BetterAuth

### Infrastructure (GCP)

- Cloud Run (backend hosting)
- Cloud SQL (PostgreSQL + pgvector)
- MinIO / GCS (product image storage)
- Cloud Logging
- OAuth 2.0 (Google + Apple sign-in)

### Shared (packages/shared)

- Zod schemas for all DTOs (used by mobile only — server-py has Pydantic equivalents)
- TypeScript types exported via `z.infer<>`
- Constants (generation limits, etc.)

## Code style and tooling

### TypeScript

- Strict mode enabled in all packages
- No `any` unless absolutely necessary — if used, add a `// TODO: type properly` comment
- Prefer `interface` for object shapes, `type` for unions/intersections
- Use barrel exports (`index.ts`) in each package

### ESLint

- Flat config (`eslint.config.js`)
- Extends: `@typescript-eslint/recommended`
- Additional rules:
  - No unused variables (error)
  - No explicit `any` (warn)
  - Consistent return types on functions
- Each app may have its own eslint config extending a shared base

### Prettier

- Config in root `.prettierrc`:
  ```json
  {
    "semi": true,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2,
    "arrowParens": "always"
  }
  ```

### Husky + lint-staged

- Pre-commit hook runs lint-staged
- lint-staged config:
  - `*.{ts,tsx}` → `eslint --fix` + `prettier --write`
  - `*.{json,md}` → `prettier --write`

### Conventional commits

- Format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`
- Scopes: `mobile`, `server`, `shared`, `root`
- Commit messages should be lowercase, no period at end
- Use imperative mood: "add feature" not "added feature"

### Git

- Branching: gitflow — `main` (production), `develop` (integration), `feature/US-*` (tasks)
- All feature branches off `develop`
- No direct commits to `main` or `develop`
- PRs required for merging into `develop`

## Conventions

### File naming

- React components: PascalCase (`StudyScreen.tsx`, `DeckCard.tsx`)
- Utilities/helpers: camelCase (`formatDate.ts`, `syncEngine.ts`)
- Constants: camelCase file, UPPER_SNAKE_CASE exports (`constants.ts` → `MAX_FREE_GENERATIONS`)
- Zod schemas: camelCase with `Schema` suffix (`createDeckSchema.ts`)

### Project structure (mobile)

```
apps/mobile/
  app/                    # Expo Router pages
    (auth)/               # Auth group (sign-in, sign-up)
    (tabs)/               # Main tab group
      index.tsx           # Home (daily queue + camera CTA)
      decks.tsx           # Deck list
      profile.tsx         # Settings / profile
    deck/[id].tsx         # Deck detail
    study/[id].tsx        # Study session
    generate.tsx          # Card preview/edit after AI generation
  components/             # Reusable UI components
  lib/                    # Business logic
    db/                   # SQLite helpers
    fsrs/                 # FSRS wrapper around ts-fsrs
    sync/                 # Sync engine
    api/                  # API client (server communication)
    auth/                 # BetterAuth client setup
  stores/                 # Zustand stores
  constants/              # App constants
```

### Project structure (server-py — active Python backend)

```
apps/server-py/
  app/
    api/
      init_app.py         # FastAPI factory, CORS, lifespan
      main.py             # Uvicorn runner
      deps.py             # CurrentUserDep, UnitOfWorkDep
      endpoints/          # One file per route group
    core/
      config/             # Pydantic BaseSettings classes
      exc/                # Custom exception hierarchy
    models/               # SQLAlchemy ORM models
    schemas/              # Pydantic request/response DTOs
    enums/                # String enums (DietType, Restriction, etc.)
    repositories/         # Generic + specialized SQLAlchemy repos
    services/             # Business logic layer
    domain/               # Pure functions (scoring, normalization)
    utils/                # UnitOfWork, token_service, security, oauth
    clients/              # OpenAI/LangChain client factory
    db/
      postgres.py         # Async engine + session factory
  migrations/             # Alembic versions
  pyproject.toml
  Dockerfile
  startup.sh
```

### Project structure (server — legacy TypeScript backend)

```
apps/server/
  src/
    routes/               # Hono route handlers
    middleware/
    services/
    domain/
    repositories/
    lib/
    index.ts
  prisma/
    schema.prisma         # Source of truth for DB schema
```

### Python (apps/server-py)

- Python 3.13+, type hints on everything — no bare `Any` without a comment
- Async-first: all DB, network, and file I/O must be `async/await`
- Sync SDKs (minio, openfoodfacts, pillow) must be wrapped in `asyncio.to_thread()`
- Use `loguru` for all logging — no `print()`
- Follow wine-app-backend patterns for all structural decisions
- Ruff for linting + formatting (replaces flake8/black/isort)
- Use `uv` for all dependency management

### API conventions

- RESTful endpoints, no `/api/v1` prefix (paths match existing mobile client expectations)
- All request bodies validated with Pydantic v2
- Error responses: `{ "detail": string }` (FastAPI default) or `{ "error": string }` where mobile expects it
- Auth: `Cookie: better-auth.session_token=<JWT>` (primary) or `Authorization: Bearer <JWT>` (fallback)
- Pagination: cursor-based with `?cursor=<string>&limit=<int>`

### Environment variables

- Never commit `.env` files
- Use `.env.example` with placeholder values in each app
- Server-py env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `JWT_SECRET`, `GCS_BUCKET`, `GCS_ENDPOINT`, `GCS_ACCESS_KEY`, `GCS_SECRET_KEY`, `GOOGLE_CLIENT_ID`, `APPLE_APP_ID`, `REDIS_HOST`
- Mobile env vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
