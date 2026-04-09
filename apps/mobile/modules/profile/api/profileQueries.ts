import { useQuery } from '@tanstack/react-query';
import type { AuthUser } from '../../../shared/lib/auth/client';
import { apiFetch } from '../../../shared/lib/client/client';

export const profileQueryKey = ['current-user'] as const;
export const getProfileQueryKey = (userId: string) => [...profileQueryKey, userId] as const;

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

export const useCurrentUserQuery = (userId?: string) =>
  useQuery({
    queryKey: userId ? getProfileQueryKey(userId) : profileQueryKey,
    queryFn: fetchCurrentUser,
    enabled: Boolean(userId),
  });