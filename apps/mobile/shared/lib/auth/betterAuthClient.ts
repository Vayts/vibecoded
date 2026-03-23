import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { ENV } from '../env';

/**
 * The central better-auth client for the mobile app.
 *
 * Using `better-auth/react` gives access to `useSession()` and other React
 * hooks in addition to the standard auth actions.
 *
 * `expoClient` handles:
 *   - Storing session cookies in SecureStore (as a serialised JSON map)
 *   - Injecting the `Cookie` header on every request
 *   - OAuth browser flow: auto-opens `expo-web-browser`, extracts the
 *     `?cookie=` param from the deep-link callback, and stores the session
 *   - Setting `expo-origin` header so the server `expo()` plugin can bypass
 *     origin checks without disabling them for all clients
 *
 * `storage` is `expo-secure-store`'s module namespace object: its `getItem`
 * (sync) and `setItem` (sync) functions satisfy the `ExpoClientOptions.storage`
 * interface directly — no custom adapter required.
 *
 * `baseURL` points to the server root; the better-auth client automatically
 * appends `/api/auth` when it detects no path in the URL.
 */
export const betterAuthClient = createAuthClient({
  baseURL: ENV.EXPO_PUBLIC_API_URL,
  plugins: [
    expoClient({
      scheme: 'acme',
      storage: SecureStore,
    }),
  ],
});

/**
 * Returns the serialised cookie string managed by `expoClient`.
 *
 * `expoClient` exposes `getCookie()` via its `getActions` hook, which the
 * better-auth client merges into its returned object. The TypeScript generic
 * on `createAuthClient` does not propagate plugin action types when no server
 * `Auth` type is provided (since the mobile bundle cannot import server code),
 * so a cast is unavoidable here — but it is isolated to this single helper.
 */
type BetterAuthClientWithExpo = typeof betterAuthClient & { getCookie: () => string };
export const getCookieString = (): string =>
  (betterAuthClient as BetterAuthClientWithExpo).getCookie();
