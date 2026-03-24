import { getCookieString } from '../auth/betterAuthClient';
import { ENV } from '../env';

const API_URL = ENV.EXPO_PUBLIC_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  // Use the session cookie managed by the better-auth expoClient plugin.
  // The cookie is stored in expo-secure-store and read synchronously here.
  // Per the official @better-auth/expo docs, credentials:"omit" is required so
  // the native networking stack does not send default credentials alongside the
  // manually set Cookie header.
  const cookie = getCookieString();
  const headers = new Headers(options.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (cookie) {
    headers.set('Cookie', cookie);
  }
  return fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'omit' });
}
