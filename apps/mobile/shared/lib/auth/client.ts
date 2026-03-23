import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { betterAuthClient } from './betterAuthClient';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: AuthUser;
  session: {
    id: string;
    userId: string;
    expiresAt: string;
  };
}

export const isAppleAuthAvailable = Platform.OS === 'ios';

/**
 * Maps a better-auth client response object to our local `AuthSession` shape.
 *
 * The `createAuthClient` return types require the server's `Auth` type to be
 * fully generic-inferred. Since the mobile bundle cannot import server code,
 * we receive `unknown`-ish types and map the fields we need explicitly.
 */
function toAuthSession(raw: Record<string, unknown>): AuthSession {
  const user = raw.user as Record<string, unknown>;
  const session = raw.session as Record<string, unknown>;
  return {
    user: {
      id: user.id as string,
      name: (user.name ?? '') as string,
      email: user.email as string,
      createdAt: user.createdAt as string,
      updatedAt: user.updatedAt as string,
    },
    session: {
      id: session.id as string,
      userId: session.userId as string,
      expiresAt: session.expiresAt as string,
    },
  };
}

export async function signUp(name: string, email: string, password: string): Promise<AuthSession> {
  const { data, error } = await betterAuthClient.signUp.email({
    email,
    password,
    name,
    callbackURL: '/',
  });

  if (error) throw new Error(error.message ?? 'Sign-up failed');
  if (!data) throw new Error('Sign-up failed');
  return toAuthSession(data as unknown as Record<string, unknown>);
}

export async function signIn(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await betterAuthClient.signIn.email({ email, password });

  if (error) throw new Error(error.message ?? 'Sign-in failed');
  if (!data) throw new Error('Sign-in failed');
  return toAuthSession(data as unknown as Record<string, unknown>);
}

export async function signOut(): Promise<void> {
  await betterAuthClient.signOut();
}

export async function getSession(): Promise<AuthSession | null> {
  try {
    const { data } = await betterAuthClient.getSession();
    if (!data) return null;
    return toAuthSession(data as unknown as Record<string, unknown>);
  } catch {
    // Network error or timeout — surface null so caller keeps existing state
    return null;
  }
}

// ── Google Sign-In (native idToken flow) ─────────────────────────────────────
// Uses @react-native-google-signin/google-signin to trigger the native Google
// account picker sheet on the device, then exchanges the returned ID token
// server-side via better-auth's idToken flow. This avoids opening a browser.
//
// `webClientId` must be the OAuth 2.0 **web** client ID registered in Google
// Cloud Console and used as GOOGLE_CLIENT_ID on the server. The library sets
// the `aud` claim of the returned idToken to this value so the server can
// verify it correctly.

export async function signInWithGoogle(): Promise<AuthSession> {
  const response = await GoogleSignin.signIn();
  if (response.type === 'cancelled') {
    throw new Error('Google sign-in was cancelled');
  }

  const { idToken } = response.data;
  if (!idToken) {
    throw new Error('No ID token received from Google — ensure webClientId is set correctly');
  }

  await betterAuthClient.signIn.social({
    provider: 'google',
    idToken: { token: idToken },
    callbackURL: '/',
  });

  // Fallback: idToken flows can return a redirect/204; poll the active session.
  const session = await betterAuthClient.getSession();
  if (!session.data) throw new Error('Failed to get session after Google sign-in');
  return toAuthSession(session.data as unknown as Record<string, unknown>);
}

// ── Apple Sign In (iOS only) ──────────────────────────────────────────────────
// Uses expo-apple-authentication for the native sheet, then exchanges the
// identity token with the server via better-auth's idToken flow. `expoClient`
// detects idToken in the body and skips the browser step.

export async function signInWithApple(): Promise<AuthSession> {
  if (!isAppleAuthAvailable) {
    throw new Error('Apple Sign In is only available on iOS');
  }

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  const { identityToken } = credential;
  if (!identityToken) throw new Error('No identity token received from Apple');

  await betterAuthClient.signIn.social({
    provider: 'apple',
    idToken: { token: identityToken },
    callbackURL: '/',
  });

  // Fallback — server may return 204/redirect for this flow
  const session = await betterAuthClient.getSession();
  if (!session.data) throw new Error('Failed to get session after Apple sign-in');
  return toAuthSession(session.data as unknown as Record<string, unknown>);
}
