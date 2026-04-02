import type { FamilyMember, CreateFamilyMemberRequest, UpdateFamilyMemberRequest } from '@acme/shared';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFamilyMembers,
  createFamilyMember,
  updateFamilyMember,
  deleteFamilyMember,
} from '../api/familyApi';

export const familyMembersQueryKey = ['family-members'] as const;

export const useFamilyMembersQuery = () =>
  useQuery({
    queryKey: familyMembersQueryKey,
    queryFn: fetchFamilyMembers,
  });

export const useCreateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation<FamilyMember, Error, CreateFamilyMemberRequest>({
    mutationFn: createFamilyMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyMembersQueryKey });
    },
  });
};

export const useUpdateFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation<FamilyMember, Error, { id: string; data: UpdateFamilyMemberRequest }>({
    mutationFn: ({ id, data }) => updateFamilyMember(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyMembersQueryKey });
    },
  });
};

export const useDeleteFamilyMember = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteFamilyMember,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: familyMembersQueryKey });
    },
  });
};
