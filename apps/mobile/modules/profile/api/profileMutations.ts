import { apiFetch } from '../../../shared/lib/client/client';
import type { AuthUser } from '../../../shared/lib/auth/client';

export interface UpdateProfilePayload {
  name?: string;
  avatarUrl?: string | null;
}

const getErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? fallback;
};

export const updateProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const response = await apiFetch('/api/user', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to update profile'));
  }

  return (await response.json()) as AuthUser;
};

export const deleteAccount = async (): Promise<void> => {
  const response = await apiFetch('/api/user', {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, 'Unable to delete account'));
  }
};
