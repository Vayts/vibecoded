import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../../../shared/lib/auth/client';
import { getProfileQueryKey, profileQueryKey } from '../api/profileQueries';
import { updateProfile, type UpdateProfilePayload } from '../api/profileMutations';

export const useUpdateProfile = (userId?: string) => {
  const queryClient = useQueryClient();

  return useMutation<AuthUser, Error, UpdateProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(profileQueryKey, user);

      if (userId) {
        queryClient.setQueryData(getProfileQueryKey(userId), user);
      }
    },
  });
};