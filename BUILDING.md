# Building

## Python Backend (apps/server-py)

### Prerequisites

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Docker + Docker Compose (for PostgreSQL, MinIO, Redis)

### Local development

1. Start infrastructure:

   ```bash
   docker compose up -d postgres minio redis
   ```

2. Install dependencies:

   ```bash
   cd apps/server-py
   uv sync
   ```

3. Copy and fill environment variables:

   ```bash
   cp .env.example .env
   # fill DATABASE_URL, OPENAI_API_KEY, JWT_SECRET, GCS_*, GOOGLE_CLIENT_ID, etc.
   ```

4. Run migrations:

   ```bash
   uv run alembic upgrade head
   ```

5. Start the server:

   ```bash
   uv run uvicorn app.api.init_app:app --reload --port 3000
   ```

   Server runs at `http://localhost:3000`.

### Running with Docker

```bash
docker compose up --build
```

### Linting

```bash
uv run ruff check .
uv run ruff format --check .
```

---

# Building for iOS

## Prerequisites

- Xcode 15+
- Apple Developer account
- Node.js 20+
- pnpm 10+

## Steps

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Run prebuild (generates native iOS project):

   ```bash
   pnpm --filter @acme/mobile exec expo prebuild --clean
   ```

3. Open the iOS workspace in Xcode:

   ```bash
   open apps/mobile/ios/acme.xcworkspace
   ```

4. In Xcode:
   - Select your target under **Signing & Capabilities**
   - Set your **Apple Developer Team**
   - Set the **Bundle Identifier** (e.g. `com.yourname.acme`)

5. Build and run on simulator:
   - Select a simulator target
   - Press **⌘R** or Product → Run

6. Archive for TestFlight:
   - Select **Any iOS Device** as build target
   - Product → Archive
   - In the Organizer, click **Distribute App**
   - Choose **App Store Connect** → **Upload**
   - Follow the prompts

## Environment Variables

Copy `.env.example` to `.env` in `apps/mobile/` and fill in:

- `EXPO_PUBLIC_API_URL` — your server URL (e.g. `https://your-api.run.app`)
- `EXPO_PUBLIC_SENTRY_DSN` — (optional) Sentry DSN for error tracking

## Required app.json Fields

Ensure `apps/mobile/app.json` has:

- `ios.bundleIdentifier` — unique bundle ID
- `ios.infoPlist.NSCameraUsageDescription` — camera permission string
- `ios.infoPlist.NSPhotoLibraryUsageDescription` — photo library permission string

## Error Tracking (Sentry)

To enable Sentry:

1. Install: `pnpm --filter @acme/mobile add @sentry/react-native`
2. Run: `pnpm --filter @acme/mobile exec expo install @sentry/react-native`
3. Follow the [Sentry Expo guide](https://docs.sentry.io/platforms/react-native/manual-setup/expo/) for native setup
4. Set `EXPO_PUBLIC_SENTRY_DSN` in your `.env`
