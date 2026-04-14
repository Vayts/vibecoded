import { useMemo } from 'react';
import { getUserFallbackAvatarImage } from '../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../profile/api/profileQueries';

export interface ProfileScoreChipContext {
  currentUser: { avatarUrl: string | null; fallbackImageUrl: string | null } | null;
  familyMembersById: Map<string, { avatarUrl: string | null }>;
}

export const useProfileScoreChipContext = (): ProfileScoreChipContext => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();

  const currentUser = currentUserQuery.data ?? authUser ?? null;
  const familyMembersById = useMemo(
    () =>
      new Map(
        (familyMembersQuery.data?.items ?? []).map((member) => [member.id, { avatarUrl: member.avatarUrl ?? null }]),
      ),
    [familyMembersQuery.data?.items],
  );

  return {
    currentUser: currentUser
      ? {
          avatarUrl: currentUser.avatarUrl ?? null,
          fallbackImageUrl: getUserFallbackAvatarImage(currentUser),
        }
      : null,
    familyMembersById,
  };
};