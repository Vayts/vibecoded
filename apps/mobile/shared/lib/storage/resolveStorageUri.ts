import { ENV } from '../env';

/**
 * Resolve an image URI that may be a relative storage path (e.g. `/products/...`)
 * into a full URL via the server storage proxy.
 * Full URLs (http/https) are returned as-is.
 */
export const resolveStorageUri = (uri: string | null | undefined): string | null => {
  if (!uri) return null;
  if (
    uri.startsWith('http://') ||
    uri.startsWith('https://') ||
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('ph://')
  ) {
    return uri;
  }
  if (uri.startsWith('/products/') || uri.startsWith('/avatars/')) {
    return `${ENV.EXPO_PUBLIC_API_URL}/api/storage${uri}`;
  }
  return null;
};
