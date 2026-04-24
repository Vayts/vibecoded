import React from 'react';
import { MAX_FAMILY_MEMBERS, type FamilyMember } from '@acme/shared';
import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { FamilyMemberList } from '../../../family/components/FamilyMemberList';
import { useFamilyMembersQuery } from '../../../family/hooks/useFamilyMembers';

interface ProfileFamilyMembersSectionProps {
  canManage: boolean;
  isAddPending?: boolean;
  onAdd: () => void;
  onEdit: (member: FamilyMember) => void;
}

export function ProfileFamilyMembersSection({
  canManage,
  isAddPending = false,
  onAdd,
  onEdit,
}: ProfileFamilyMembersSectionProps) {
  const familyMembersQuery = useFamilyMembersQuery();
  const usedFamilyMemberSlots = familyMembersQuery.data?.items.length;
  const familyMembersCounter = usedFamilyMemberSlots === undefined
    ? `…/${MAX_FAMILY_MEMBERS}`
    : `${usedFamilyMemberSlots}/${MAX_FAMILY_MEMBERS}`;

  return (
    <View className="mt-8">
      <View className="flex-row items-center justify-between gap-3">
        <Typography variant="sectionTitle" className="text-neutrals-900 font-bold">
          Family members
        </Typography>

        <View className="rounded-full bg-gray-100 px-3 py-1">
          <Typography variant="bodySecondary" className="font-semibold text-neutrals-700">
            {familyMembersCounter}
          </Typography>
        </View>
      </View>

      <View className="mt-3">
        <FamilyMemberList
          canManage={canManage}
          isAddPending={isAddPending}
          onAdd={onAdd}
          onEdit={onEdit}
        />
      </View>
    </View>
  );
}

