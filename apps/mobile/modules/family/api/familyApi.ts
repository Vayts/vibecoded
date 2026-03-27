import {
  familyMembersResponseSchema,
  familyMemberSchema,
  type FamilyMember,
  type FamilyMembersResponse,
  type CreateFamilyMemberRequest,
  type UpdateFamilyMemberRequest,
} from '@acme/shared';
import { apiFetch } from '../../../shared/lib/client/client';

const getErrorMessage = async (response: Response): Promise<string> => {
  const json = (await response.json().catch(() => null)) as { error?: string } | null;
  return json?.error ?? 'Something went wrong';
};

export const fetchFamilyMembers = async (): Promise<FamilyMembersResponse> => {
  const response = await apiFetch('/api/family-members');

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return familyMembersResponseSchema.parse(json);
};

export const createFamilyMember = async (
  data: CreateFamilyMemberRequest,
): Promise<FamilyMember> => {
  const response = await apiFetch('/api/family-members', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return familyMemberSchema.parse(json);
};

export const updateFamilyMember = async (
  id: string,
  data: UpdateFamilyMemberRequest,
): Promise<FamilyMember> => {
  const response = await apiFetch(`/api/family-members/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  const json = await response.json();
  return familyMemberSchema.parse(json);
};

export const deleteFamilyMember = async (id: string): Promise<void> => {
  const response = await apiFetch(`/api/family-members/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }
};
