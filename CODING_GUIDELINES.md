# CODING_GUIDELINES.md

## Tech stack

### Monorepo

- **pnpm** — package manager (no npm, no yarn)
- **Turborepo** — build orchestration, caching
- **Structure:**
  ```
  apps/
    mobile/        # Expo (React Native)
    server/        # Hono (Node.js backend)
  packages/
    shared/        # Zod schemas, DTO types, constants
  ```

### Mobile (apps/mobile)

- Expo SDK 52+, New Architecture, Hermes engine
- Expo Router v4 (file-based routing)
- expo-sqlite (local DB for offline)
- expo-camera + expo-image-picker (camera/photo input)
- expo-image-manipulator (client-side compression)
- expo-secure-store (auth token storage)
- Zustand (state management)
- NativeWind (Tailwind CSS for React Native)
- ts-fsrs (FSRS spaced repetition algorithm)
- Build: `expo prebuild` → Xcode (local builds, no EAS)

### Server (apps/server)

- Node.js 20+
- Hono (HTTP framework)
- Prisma (ORM, PostgreSQL)
- LangChain.js (AI structured output)
- OpenAI API: gpt-4o (vision), gpt-4o-mini (text-to-cards)
- BetterAuth + @better-auth/expo (authentication)
- Zod (request/response validation, shared with mobile)

### Infrastructure (GCP)

- Cloud Run (backend hosting)
- Cloud SQL (PostgreSQL)
- GCS (temporary image storage)
- Cloud Logging (comes with Cloud Run)
- OAuth 2.0 (Google sign-in)

### Shared (packages/shared)

- Zod schemas for all DTOs
- TypeScript types exported via `z.infer<>`
- Constants (generation limits, FSRS defaults, etc.)

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

### Project structure (server)

```
apps/server/
  src/
    routes/               # Hono route handlers
      auth.ts
      generate.ts
      sync.ts
      health.ts
    middleware/            # Auth, rate limiting, error handling
    services/             # Business logic
      ai.ts               # LangChain pipeline
      generation.ts       # Generation counting/limiting
    lib/
      prisma.ts           # Prisma client instance
      auth.ts             # BetterAuth server config
      storage.ts          # GCS helpers
    index.ts              # Hono app entry point
  prisma/
    schema.prisma
```

### API conventions

- RESTful endpoints
- All requests/responses validated with Zod (from shared package)
- Error responses: `{ error: string, code: string }`
- Auth: Bearer token in Authorization header
- Rate limiting on AI endpoints (checked via GenerationLog table)

### Environment variables

- Never commit `.env` files
- Use `.env.example` with placeholder values in each app
- Server env vars: `DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `GCS_BUCKET`, `GOOGLE_CLIENT_ID`
- Mobile env vars: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
