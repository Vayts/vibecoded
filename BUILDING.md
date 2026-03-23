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
