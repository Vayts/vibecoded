import { apiFetch } from '../../../shared/lib/client/client';
import type { AuthUser } from '../../../shared/lib/auth/client';

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Unable to update profile';
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const response = await apiFetch('/api/user', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return (await response.json()) as AuthUser;
};
