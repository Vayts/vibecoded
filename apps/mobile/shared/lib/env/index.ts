import { z } from 'zod';

// In development Metro can resolve process.env dynamically.
// In production (release builds) Metro performs static replacement only on
// direct property accesses, so Object.entries(process.env) yields nothing.
const rawEnv = __DEV__
  ? Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith('EXPO_PUBLIC_')),
    )
  : {
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
      EXPO_PUBLIC_REVENUECAT_IOS_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    };

export const ENV = z
  .object({
    EXPO_PUBLIC_API_URL: z.string().url(),
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
    EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
    EXPO_PUBLIC_REVENUECAT_IOS_KEY: z.string().optional(),
  })
  .parse(rawEnv);
