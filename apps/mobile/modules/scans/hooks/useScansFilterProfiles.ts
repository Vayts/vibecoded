import { useMemo } from 'react';
import { getUserFallbackAvatarImage } from '../../../shared/lib/avatar/selectAndUploadAvatarImage';
import { useAuthStore } from '../../../shared/stores/authStore';
import { useFamilyMembersQuery } from '../../family/hooks/useFamilyMembers';
import { useCurrentUserQuery } from '../../profile/api/profileQueries';
import type { ScansFilterProfileOption } from '../types/filters';

export const useScansFilterProfiles = (): ScansFilterProfileOption[] => {
  const authUser = useAuthStore((state) => state.user);
  const currentUserQuery = useCurrentUserQuery(authUser?.id);
  const familyMembersQuery = useFamilyMembersQuery();
  const currentUser = currentUserQuery.data ?? authUser ?? null;

  return useMemo(
	() => {
	  const familyMembers = familyMembersQuery.data?.items ?? [];

	  return [
		{
		  id: 'you',
		  name: 'You',
		  avatarUrl: currentUser?.avatarUrl ?? null,
		  fallbackImageUrl: currentUser ? getUserFallbackAvatarImage(currentUser) : null,
		},
		...familyMembers.map((member) => ({
		  id: member.id,
		  name: member.name,
		  avatarUrl: member.avatarUrl ?? null,
		  fallbackImageUrl: null,
		})),
	  ];
	},
	[currentUser, familyMembersQuery.data?.items],
  );
};


