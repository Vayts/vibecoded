import { useQuery } from '@tanstack/react-query';
import { type UserSubscriptionResponse, userSubscriptionResponseSchema } from '@acme/shared';
import type { AuthUser } from '../../../shared/lib/auth/client';
import { apiFetch } from '../../../shared/lib/client/client';

export const profileQueryKey = ['current-user'] as const;
export const getProfileQueryKey = (userId: string) => [...profileQueryKey, userId] as const;
export const subscriptionQueryKey = ['user-subscription'] as const;
export const getSubscriptionQueryKey = (userId: string) => [...subscriptionQueryKey, userId] as const;

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to load profile';
};

const fetchCurrentUser = async (): Promise<AuthUser> => {
  const response = await apiFetch('/api/user');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as AuthUser;
};

export const fetchUserSubscription = async (): Promise<UserSubscriptionResponse> => {
  const response = await apiFetch('/api/user/subscription');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return userSubscriptionResponseSchema.parse(json);
};

export const useCurrentUserQuery = (userId?: string) =>
  useQuery({
    queryKey: userId ? getProfileQueryKey(userId) : profileQueryKey,
    queryFn: fetchCurrentUser,
    enabled: Boolean(userId),
  });

export const useUserSubscriptionQuery = (userId?: string) =>
  useQuery({
    queryKey: userId ? getSubscriptionQueryKey(userId) : subscriptionQueryKey,
    queryFn: fetchUserSubscription,
    enabled: Boolean(userId),
  });
