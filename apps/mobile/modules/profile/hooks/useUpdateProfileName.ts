import type { AuthUser } from '../../../shared/lib/auth/client';
import { useMutation } from '@tanstack/react-query';

import { updateProfileName } from '../api/profileMutations';

export const useUpdateProfileName = () => {
  return useMutation<AuthUser, Error, string>({
    mutationFn: updateProfileName,
  });
};
