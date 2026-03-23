import { betterAuth, type Auth as BetterAuthInstance, type BetterAuthOptions } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { bearer } from 'better-auth/plugins';
import { expo } from '@better-auth/expo';
import { prisma } from './prisma';

const authOptions: BetterAuthOptions = {
  baseURL: process.env.BETTER_AUTH_URL ?? `http://localhost:${process.env.PORT ?? 3000}`,
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  plugins: [bearer(), expo()],
  emailAndPassword: {
    enabled: true,
  },
  advanced: { disableOriginCheck: true },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID ?? '',
      clientSecret: process.env.APPLE_CLIENT_SECRET ?? '',
      appBundleIdentifier: process.env.APPLE_APP_BUNDLE_ID,
    },
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minutes
    },
  },
  trustedOrigins: [
    ...(process.env.TRUSTED_ORIGINS ?? '').split(',').filter(Boolean),
    // Allow the Expo custom URL scheme so the expo plugin can append cookies to
    // OAuth deep-link redirects (acme://auth-callback?cookie=...)
    'acme://',
  ],
};

export const auth: BetterAuthInstance<BetterAuthOptions> = betterAuth(authOptions);

export type Auth = typeof auth;
