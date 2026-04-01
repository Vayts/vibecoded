import { onboardingResponseSchema, type OnboardingResponse } from '@acme/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../shared/lib/client/client';

export const onboardingQueryKey = ['me', 'onboarding'] as const;
export const getOnboardingQueryKey = (userId: string) => [...onboardingQueryKey, userId] as const;

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to load onboarding';
};

const fetchOnboarding = async (): Promise<OnboardingResponse> => {
  const response = await apiFetch('/api/me/onboarding');
  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return onboardingResponseSchema.parse(json);
};

export const useOnboardingQuery = (userId?: string) =>
  useQuery({
    queryKey: userId ? getOnboardingQueryKey(userId) : onboardingQueryKey,
    queryFn: fetchOnboarding,
    enabled: Boolean(userId),
  });
