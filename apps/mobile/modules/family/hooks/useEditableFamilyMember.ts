import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { useFamilyMemberFormStore } from '../stores/familyMemberFormStore';
import { useFamilyMembersQuery } from './useFamilyMembers';

const getRouteParam = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export function useEditableFamilyMember() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const memberId = getRouteParam(id);
  const familyMembersQuery = useFamilyMembersQuery();
  const hydrateFromMember = useFamilyMemberFormStore((state) => state.hydrateFromMember);
  const hydratedMemberId = useFamilyMemberFormStore((state) => state.memberId);
  const member = familyMembersQuery.data?.items.find((item) => item.id === memberId);

  useEffect(() => {
    if (member && hydratedMemberId !== member.id) {
      hydrateFromMember(member);
    }
  }, [hydrateFromMember, hydratedMemberId, member]);

  return {
    memberId,
    member,
    ...familyMembersQuery,
  };
}
