import { z } from 'zod';

export const ACTIVE_SUBSCRIPTION_STATUS = 'active';
export const DEFAULT_USER_NAME = 'Your Name';
export const MAX_USER_NAME_LENGTH = 30;
export const USER_NAME_REQUIRED_MESSAGE = 'Name is required';
export const USER_NAME_MAX_LENGTH_MESSAGE = `Name must be ${MAX_USER_NAME_LENGTH} characters or fewer`;

export const userNameSchema = z
  .string()
  .trim()
  .min(1, USER_NAME_REQUIRED_MESSAGE)
  .max(MAX_USER_NAME_LENGTH, USER_NAME_MAX_LENGTH_MESSAGE);

export const normalizeUserName = (value: unknown): string => {
  if (typeof value !== 'string') {
    return DEFAULT_USER_NAME;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return DEFAULT_USER_NAME;
  }

  return normalizedValue.slice(0, MAX_USER_NAME_LENGTH);
};

export const userSubscriptionResponseSchema = z.object({
  subscriptionStatus: z.string().nullable(),
  subscriptionPlan: z.string().nullable(),
  subscriptionExpiry: z.string().nullable(),
  isPro: z.boolean(),
  freeGenerationsBalance: z.number(),
});

export type UserSubscriptionResponse = z.infer<typeof userSubscriptionResponseSchema>;

export const isActiveSubscriptionStatus = (
  subscriptionStatus: string | null | undefined,
): boolean => {
  return subscriptionStatus === ACTIVE_SUBSCRIPTION_STATUS;
};

