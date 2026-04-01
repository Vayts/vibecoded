# CLAUDE.md

This file contains instructions for Claude Code on how to work in this project.

## Migration status

The backend is being rewritten from Hono/TypeScript (`apps/server/`) to Python/FastAPI (`apps/server-py/`). See `docs/MIGRATION_PLAN.md` for the full plan. The mobile app (`apps/mobile/`) is NOT changing. All new server work happens in `apps/server-py/`.

## Workflow

1. **Always check TASKS.md first.** Before doing anything, read TASKS.md to find the current task (status: `in-progress` or the next `todo` task).
2. **Work task by task.** Never skip ahead. Never work on multiple tasks simultaneously. Finish one, commit, then move to the next.
3. **Ask before assuming.** If a task is ambiguous or you need a decision, don't guess. Add your question to the `Notes / Clarifications` column in TASKS.md and stop. Wait for an answer before proceeding.
4. **Branch per task.** Each task gets its own branch off `develop`. Branch naming: `feature/US-{id}-{short-description}` (e.g., `feature/US-1.1-monorepo-setup`). When done, the branch will be merged into `develop` via PR.
5. **Commit when finished.** One task = at least one commit. Use conventional commits (see CODING_GUIDELINES.md). Don't commit half-done work to develop.
6. **Update TASKS.md.** When you start a task, set status to `in-progress`. When done, set to `done`. If blocked, set to `blocked` and explain why in notes.
7. **Test before marking done.** Run linting, type checking, and relevant tests before considering a task complete. If something doesn't pass, fix it before committing.
8. **Don't refactor what isn't broken.** Stay focused on the current task. If you spot something that could be improved elsewhere, note it in TASKS.md as a future task — don't fix it now.

## Branching

- `main` — production releases only
- `develop` — integration branch, all feature branches merge here
- `feature/US-*` — one branch per user story / task

## Commit format

```
type(scope): description

body (optional)
```

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`

Scopes: `mobile`, `server`, `server-py`, `shared`, `root`

Examples:

- `feat(server-py): add POST /api/scanner/barcode endpoint`
- `chore(root): add Redis to docker-compose`
- `fix(mobile): persist auth session across restarts`

## Python server (`apps/server-py/`)

- Use `uv` exclusively — no pip, no poetry, no conda
- Follow wine-app-backend patterns for everything (structure, naming, error handling, logging)
- Reference: `/Users/doodko/meduzzen/wine-app/wine-app-backend/`
- No `print()` in production code — use `loguru` logger
- No `Any` types without a comment explaining why
- Async-first: all DB calls, external API calls, and I/O must be `async`/`await`
- Wrap synchronous SDKs (minio, openfoodfacts, pillow) in `asyncio.to_thread()`

## What NOT to do

- Don't install packages without checking if they're already in the project or listed in CODING_GUIDELINES.md
- Don't change the monorepo structure without asking
- Don't add features that aren't in the current task
- Don't use `npm` or `yarn` — the JS/TS side uses `pnpm` exclusively
- Don't use `pip` or `poetry` — the Python side uses `uv` exclusively
- Don't commit directly to `main` or `develop`
- Don't leave `console.log` / `print()` in production code (use proper logging)
- Don't skip TypeScript types — no `any` unless absolutely necessary and documented why
- Don't modify `apps/server/` (old TypeScript server) — it stays as reference until migration is complete
- Don't modify the mobile app's API client or auth flow during backend migration
