import {
  onboardingRequestSchema,
  onboardingResponseSchema,
  type OnboardingRequest,
  type OnboardingResponse,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to save onboarding';
};

export const submitOnboarding = async (payload: OnboardingRequest): Promise<OnboardingResponse> => {
  const parsedPayload = onboardingRequestSchema.parse(payload);
  const response = await apiFetch('/api/me/onboarding', {
    method: 'POST',
    body: JSON.stringify(parsedPayload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return onboardingResponseSchema.parse(json);
};
