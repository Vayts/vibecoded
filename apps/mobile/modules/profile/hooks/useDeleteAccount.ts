import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as authClient from '../../../shared/lib/auth/client';
import { useAuthStore } from '../../../shared/stores/authStore';
import { deleteAccount } from '../api/profileMutations';

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation<void, Error>({
    mutationFn: async () => {
      await deleteAccount();

      try {
        await authClient.signOut();
      } catch {
        // The local Better Auth cookie is cleared before the sign-out request is sent.
        // Ignore network/session errors here because the account is already deleted.
      }
    },
    onSuccess: () => {
      queryClient.clear();
      setUser(null);
    },
  });
};
