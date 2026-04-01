import type { OnboardingRequest, OnboardingResponse } from '@acme/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitOnboarding } from '../api/onboardingMutation';
import { onboardingQueryKey } from '../api/onboardingQueries';

export const useSubmitOnboardingMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<OnboardingResponse, Error, OnboardingRequest>({
    mutationFn: submitOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: onboardingQueryKey });
      await queryClient.refetchQueries({ queryKey: onboardingQueryKey, type: 'active' });
    },
  });
};

export const useCompleteOnboarding = useSubmitOnboardingMutation;
