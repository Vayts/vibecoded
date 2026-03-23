# GitHub Copilot Instructions — acme

Camera-first AI flashcard app with offline FSRS spaced repetition. iOS MVP target: 10-day ship.
**Core loop:** Camera/Upload → AI generates flashcards → FSRS spaced repetition → Retention.

---

## Monorepo Structure

```
apps/
  mobile/          # Expo SDK 52+, Expo Router v4, React Native (New Architecture, Hermes)
  server/          # Hono + Node.js 20+, Prisma, LangChain.js, BetterAuth
packages/
  shared/          # Zod schemas, DTO types, constants (consumed by both apps)
```

- Package manager: **pnpm only** (never npm or yarn)
- Build orchestration: **Turborepo** (`turbo build`, `turbo dev`)
- TypeScript **strict mode** across all packages

---

## Tech Stack

### Mobile (`apps/mobile`)

| Concern           | Library                                                     |
| ----------------- | ----------------------------------------------------------- |
| Framework         | Expo SDK 52+, New Architecture, Hermes                      |
| Navigation        | Expo Router v4 (file-based)                                 |
| Local DB          | expo-sqlite (offline-first SQLite)                          |
| Camera / images   | expo-camera, expo-image-picker                              |
| Image compression | expo-image-manipulator (~1500px, 80% JPEG before upload)    |
| Secure storage    | expo-secure-store (auth tokens)                             |
| State             | Zustand                                                     |
| Styling           | NativeWind (Tailwind for RN)                                |
| Spaced repetition | ts-fsrs (FSRS algorithm)                                    |
| Auth client       | BetterAuth + @better-auth/expo (bearer tokens, SecureStore) |

Build: `expo prebuild` → Xcode (local, no EAS).

### Server (`apps/server`)

| Concern      | Library                                                          |
| ------------ | ---------------------------------------------------------------- |
| Framework    | Hono                                                             |
| ORM          | Prisma (PostgreSQL)                                              |
| Auth         | BetterAuth (bearer plugin)                                       |
| AI           | LangChain.js + OpenAI gpt-4o (vision) + gpt-4o-mini (text→cards) |
| Validation   | Zod (shared schemas from packages/shared)                        |
| File storage | GCS (temp images during AI processing); MinIO locally            |
| Local dev DB | docker-compose PostgreSQL + MinIO                                |

### Infrastructure (GCP — production)

- Cloud Run (min instances: 1, no cold starts)
- Cloud SQL (PostgreSQL)
- GCS bucket (temp image upload, deleted after AI processing)
- Cloud Logging

### Shared (`packages/shared`)

- Zod schemas: `CreateDeckRequest`, `CardResponse`, `GenerateFlashcardsRequest`, `GenerateFlashcardsResponse`
- TypeScript types via `z.infer<>`
- Constants: `MAX_FREE_GENERATIONS`, FSRS defaults, etc.
- Change a schema here → TypeScript breaks in both apps simultaneously (intended)

---

## Prisma Schema (Key Models)

```
User        id, email, name, createdAt
Deck        id, userId, title, sourceType, cardCount, createdAt
Card        id, deckId, front, back, tags, fsrsState(JSON), createdAt, updatedAt
ReviewLog   id, cardId, rating, reviewedAt, scheduledAt
GenerationLog id, userId, createdAt   ← monthly AI usage tracking
```

BetterAuth Prisma adapter uses the same Prisma instance.

---

## Mobile App Structure

```
apps/mobile/app/
  _layout.tsx
  index.tsx              # Home: daily queue + camera CTA
  (auth)/
    sign-in.tsx
    sign-up.tsx
  (tabs)/
    index.tsx            # Home tab
    decks.tsx            # Deck list
    profile.tsx          # Settings / sign-out
  deck/[id].tsx          # Deck detail
  study/[id].tsx         # Study session
  generate.tsx           # Card preview/edit after AI generation

apps/mobile/
  components/            # Reusable UI
  lib/
    db/                  # SQLite helpers
    fsrs/                # ts-fsrs wrapper
    sync/                # Sync engine
    api/                 # API client
    auth/client.ts       # BetterAuth client
  stores/                # Zustand stores (authStore.ts, ...)
  constants/
```

## Server Structure

```
apps/server/src/
  index.ts               # Hono app entry
  routes/
    auth.ts
    generate.ts          # POST /api/generate
    sync.ts
    health.ts
  middleware/            # Auth middleware, rate limiting, error handling
  services/
    ai.ts                # LangChain pipeline
    generation.ts        # Generation counting/limiting
  lib/
    prisma.ts            # Prisma client singleton
    auth.ts              # BetterAuth server config
    storage.ts           # GCS helpers
```

---

## AI Pipeline

```
[Camera/Upload]
  → expo-image-manipulator (compress ~1500px, 80% JPEG)
  → Upload to GCS (temp)
  → POST /api/generate
  → If image: gpt-4o vision → extract text → gpt-4o-mini → flashcards
  → If text: gpt-4o-mini directly
  → LangChain structured output + Zod: { cards: [{ front, back, tags }] }
  → Save to Cloud SQL + return to client
  → Client: save to SQLite + init FSRS state
  → Delete temp GCS image
```

**Cost:** ~$0.0003/text generation, ~$0.005/image. Free tier: 15 first month, 5/month after.

---

## FSRS Spaced Repetition

- Library: `ts-fsrs` (MIT, ~20% better retention than SM-2)
- Runs **entirely on-device** — no server needed to study
- 4 rating buttons: **Again / Hard / Good / Easy**
- Each rating updates card's `fsrsState` JSON (stability, difficulty, due date)
- `ReviewLog` entry created per rating
- Study queue order: overdue → due today → new
- Study works fully offline; ratings sync later

---

## Authentication

- BetterAuth with bearer plugin on server
- `set-auth-token` header on sign-in/sign-up → stored in `expo-secure-store`
- Bearer token sent in `Authorization` header on all requests
- Session persists across app restarts (BetterAuth #4570 is N/A — we use bearer tokens, not cookies)
- Google OAuth blocked until GCP OAuth credentials provisioned (US-2.3)

---

## Sync Strategy

- **Offline-first:** All decks, cards, FSRS state in local SQLite
- **Sync on foreground:** push pending local changes when online
- **Conflict resolution:** last-write-wins via timestamps
- **New device sign-in:** `GET /api/sync` → full dump to SQLite on first sync, differential after
- Exponential backoff on failures

---

## Business Rules

| Rule                  | Detail                                                              |
| --------------------- | ------------------------------------------------------------------- |
| Free tier generations | 5/month; 15 in first month (5 base + 10 trial boost)                |
| Pro tier              | $3.99/month or $29.99/year — unlimited AI generations               |
| Study is always free  | Reviewing cards, manual creation, unlimited decks — never paywalled |
| Generation tracking   | `GenerationLog` table; count per userId per month                   |
| Rate reset            | 1st of each month                                                   |
| Upgrade prompt        | Shown when remaining generations = 0                                |

---

## Mobile Frontend Architecture

The mobile app uses a **module-based architecture** under `apps/mobile/`:

```
apps/mobile/
  app/                   # Expo Router file-based routes (screens only — thin, no logic)
  shared/                # General-purpose, reusable across all modules
    components/          # Shared UI: Button, Card, TextInput, etc.
    hooks/               # Shared hooks: useDebounce, useOnlineStatus, etc.
    lib/                 # Low-level utilities: db/, fsrs/, sync/, api client
    stores/              # Global Zustand stores: authStore, etc.
    constants/           # App-wide constants
    types/               # Shared TypeScript types/interfaces
  modules/               # Feature-specific code, grouped by domain
    camera/
      components/        # CameraView, ShutterButton, etc.
      hooks/             # useCameraCapture, useImageCompression
    generate/
      components/        # CardPreview, DeckTitleInput, etc.
      hooks/             # useGenerateFlashcards
      api/               # API calls for this module
      types/             # Module-local types
    study/
      components/
      hooks/
    decks/
      components/
      hooks/
      api/
    auth/
      components/
      hooks/
      api/
```

### Architecture Rules

These rules are enforced via a combination of ESLint and code review:

#### ESLint-enforced (automatic)

- **Max 200 lines per file** (`max-lines` — error). Decompose into hooks, sub-components, or helpers when approaching the limit.
- **Max JSX nesting depth: 5** (`react/jsx-max-depth` — warning). More than 5 levels of nested JSX is a signal to extract a sub-component.

#### Convention-enforced (code review)

- **Every component lives in its own folder** with an `index.tsx` (or `ComponentName.tsx`) and co-located styles/tests/hooks.
  - ✅ `modules/camera/components/ShutterButton/index.tsx`
  - ❌ `components/ShutterButton.tsx` (flat file for non-trivial components)
- **Reusable (general-purpose) components → `shared/components/`**. Reusability means: used in 2+ modules, or has no domain knowledge.
- **Module-specific components → `modules/<domain>/components/`**. If a component only makes sense inside one module, keep it there.
- **Hooks extract logic from components**. If a component function body contains state + effects + callbacks, extract to a `use<Name>.ts` hook next to the component.
- **Screens (`app/`) stay thin** — they compose module components and call module hooks. No business logic, no inline styles, no API calls directly in screen files.
- **API calls live in `modules/<domain>/api/`** or `shared/lib/api/` — never inline in components or hooks.

---

## Coding Standards

### TypeScript

- Strict mode everywhere; **no `any`** (add `// TODO: type properly` if unavoidable)
- `interface` for object shapes, `type` for unions/intersections
- Barrel exports (`index.ts`) in each package

### File Naming

- React components: `PascalCase.tsx` (`StudyScreen.tsx`)
- Utilities/helpers: `camelCase.ts` (`syncEngine.ts`)
- Constants file: `camelCase`, exports `UPPER_SNAKE_CASE`
- Zod schemas: `camelCase` + `Schema` suffix (`createDeckSchema.ts`)

---

## iOS Design Guidelines (Apple HIG)

All mobile UI must follow Apple's Human Interface Guidelines. When in doubt, ask — don't guess.

### Spacing & Layout

- **Minimum touch target: 44×44pt** — all tappable elements must meet this
- **Horizontal page margins: 16px** (compact) — use `px-4` as the baseline side padding
- **Content padding from safe area:** always use `useSafeAreaInsets()` in modals — `SafeAreaView` returns zero insets on first render inside modals
- Group related controls with consistent internal spacing (8px / 12px / 16px scale)

### Typography

- **Large titles** (page headers): `text-3xl font-bold` — used once per screen at the top
- **Section titles**: `text-lg font-semibold`
- **Body**: `text-base` (16px)
- **Secondary / captions**: `text-sm text-gray-500`
- **Labels on controls**: `text-sm font-medium`
- Never use fewer than `text-xs` (12px) for any visible text

### Color

- **Primary action:** `bg-blue-600` — one prominent blue CTA per screen
- **Destructive:** `text-red-600` / `border-red-300`
- **Backgrounds:** `bg-white` (screens), `bg-gray-50` (cards / grouped rows)
- **Borders / dividers:** `border-gray-200`
- **Disabled state:** reduce opacity to 40% (`opacity-40`)
- **Dark overlays on camera/media:** `bg-black/50` for frosted-style control backgrounds
- **Never use raw hex color literals** (e.g. `"#2563EB"`) in component props. Always import from `apps/mobile/shared/constants/colors.ts`:
  ```ts
  import { COLORS } from '../shared/constants/colors';
  // ✅ correct
  <ActivityIndicator color={COLORS.primary} />
  // ❌ wrong
  <ActivityIndicator color="#2563EB" />
  ```

### Reusable Components

- **`EmptyState`** (`shared/components/EmptyState`) — use for all empty list / zero-data states. Accepts `icon`, `title`, `description`, and optional `actions`. **Never inline empty state JSX.**
- **`Button`** (`shared/components/Button`) — use for standalone CTAs with `variant` / `size` / `loading` props.
- **`SkeletonRow`** — use for loading placeholders in lists.
- **General rule:** if the same visual pattern (layout + content) appears in 2+ places, extract it to `shared/components/`. If it is domain-specific (only used in one feature module), put it under `modules/<domain>/components/`.

### Buttons

- **Primary CTA:** full-width or prominent, `bg-blue-600 rounded-xl py-4`, `text-white font-semibold text-base`
- **Secondary / ghost:** `border border-gray-300 rounded-xl py-4`, `text-gray-700 font-semibold text-base`
- **Destructive:** `border border-red-300 rounded-xl`, `text-red-600 font-semibold`
- **Icon buttons (toolbar/nav):** 44×44pt circular, `rounded-full`, use SF Symbol-style Unicode glyphs (e.g. `✕` `←` `↩︎`) or dedicated icon library
- **Camera shutter:** large ring + inner disc pattern — outer ring `w-20 h-20 border-[3px] border-white rounded-full`, inner disc `w-[68px] h-[68px] bg-white rounded-full`
- `activeOpacity={0.7}` on all `TouchableOpacity`

### Camera / Media Screens

- Viewfinder is always full-bleed (`StyleSheet.absoluteFillObject`)
- Controls float over the camera on a transparent overlay — **never** push the viewfinder down
- Top bar: close button (left) + secondary action (right), `bg-black/50 rounded-full` pill background on each button, 44pt touch targets
- Bottom bar: centered shutter + flanking actions, at least `pb-8` from the bottom inset
- Preview confirmation: **Retake** (ghost/outline) + **Use Photo** (primary fill) — side by side, equal width

### Lists & Cards

- Cards: `bg-white rounded-2xl` with `shadow-sm` or border `border border-gray-100`
- List rows: `min-h-[52px]` with `px-4` padding, `border-b border-gray-100` dividers
- Swipeable rows: right-side destructive action in `bg-red-500`

### Modals & Sheets

- Full-screen modals: `presentation: 'fullScreenModal'` — no drag-to-dismiss unless explicitly wanted
- Bottom sheets (future): `presentation: 'modal'` with drag handle
- Always include an explicit close/cancel affordance — never trap the user

### Animations

- Card flip: `react-native-reanimated` (already installed), target < 100ms
- Screen transitions: use default Expo Router transitions — don't override unless necessary
- Loading states: `ActivityIndicator` in `color="white"` on dark backgrounds, `color="#2563EB"` (blue-600) on white

### Accessibility

- All interactive elements need `accessibilityLabel`
- `accessibilityRole` on buttons and links
- Sufficient color contrast (WCAG AA minimum)

### Prettier Config

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

### API Conventions

- RESTful endpoints
- All request/response bodies validated with Zod (from `packages/shared`)
- Error shape: `{ error: string, code: string }`
- Auth: `Authorization: Bearer <token>`

### Environment Variables

- Never commit `.env` — use `.env.example` with placeholders
- Server: `DATABASE_URL`, `OPENAI_API_KEY`, `BETTER_AUTH_SECRET`, `GCS_BUCKET`, `GOOGLE_CLIENT_ID`
- Mobile: `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_GOOGLE_CLIENT_ID`

---

## Git Workflow

- `main` — production only
- `develop` — integration (all feature branches merge here via PR)
- `feature/US-{id}-{short-description}` — one branch per task

### Commit Format

```
type(scope): description
```

Types: `feat` `fix` `chore` `docs` `refactor` `test` `style` `ci`
Scopes: `mobile` `server` `shared` `root`
Examples:

- `feat(server): add POST /api/generate endpoint`
- `fix(mobile): persist auth session across restarts`

---

## Task Workflow — MUST follow for every task

### Step-by-step process

1. **Read TASKS.md.** Find the next `todo` task (top-to-bottom order). Never skip ahead. Never work on multiple tasks simultaneously.

2. **Clarify before coding.** If anything is ambiguous — missing acceptance criteria, design decisions, dependencies — ask the user first. Add the question to the `Notes / Clarifications` column in TASKS.md and stop. Do not guess.

3. **Create a branch** off `develop`:

   ```
   git checkout develop && git pull
   git checkout -b feature/US-{id}-{short-description}
   ```

4. **Update TASKS.md** — set status to `in-progress`.

5. **Implement the task.** Stay strictly within the task scope. If you spot something unrelated that needs fixing, note it in TASKS.md as a future task — don't fix it now.

6. **Run lint + type-check** before committing:

   ```
   pnpm --filter <package> lint
   pnpm --filter <package> type-check
   ```

   Fix all errors. Do not commit broken code.

7. **Commit** with a conventional commit message:

   ```
   git add -A
   git commit -m "feat(scope): description"
   ```

   Use multiple commits if it makes the history clearer. Never commit half-done work.

8. **Ask the user to validate.** Summarise what was done, list files changed, and explicitly ask: _"Please test this — let me know if it looks good to merge into develop."_

9. **On user approval — merge into develop:**

   ```
   git checkout develop
   git merge --no-ff feature/US-{id}-{short-description}
   ```

10. **Update TASKS.md** — set status to `done`. Move to next task only after merge is confirmed.

### Rules

- No direct commits to `main` or `develop` — always via feature branch
- One branch per user story
- Always ask for validation before merging — never self-approve

---

## Current Progress (as of 2026-03-03)

Use `TASKS.md` to track current tasks, status, and notes. Always check there first before starting work.

## What NOT to Do

- Never use `npm` or `yarn` — **pnpm only**
- No direct commits to `main` or `develop`
- No `console.log` in production code (use proper logging)
- Don't add features outside the current task
- Don't change monorepo structure without discussion
- Don't install packages already in the project or unlisted in guidelines
- Don't skip TypeScript types (`any` is a warning/error)
- Prisma-generated types stay in `apps/server`; shared Zod schemas go in `packages/shared`
- **Never mention specific AI model names (GPT-4o, Claude, etc.) in any user-facing text** — always use "AI" generically
