import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AuthUser } from '../../../shared/lib/auth/client';
import { useAuthStore } from '../../../shared/stores/authStore';
import { getProfileQueryKey, profileQueryKey } from '../api/profileQueries';
import { updateProfile, type UpdateProfilePayload } from '../api/profileMutations';

export const useUpdateProfile = (userId?: string) => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<AuthUser, Error, UpdateProfilePayload>({
    mutationFn: updateProfile,
    onSuccess: (user) => {
      queryClient.setQueryData(profileQueryKey, user);
      setUser(user);

      if (userId) {
        queryClient.setQueryData(getProfileQueryKey(userId), user);
      }
    },
  });
};