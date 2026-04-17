import type { FamilyMember } from '@acme/shared';
import { ChevronRight, Plus } from 'lucide-react-native';
import { Alert, TouchableOpacity, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import { MAIN_GOAL_LABELS } from '../../../onboarding/components/options';
import { useDeleteFamilyMember, useFamilyMembersQuery } from '../../hooks/useFamilyMembers';

interface FamilyMemberListProps {
  onAdd: () => void;
  onEdit: (member: FamilyMember) => void;
}

export function FamilyMemberList({ onAdd, onEdit }: FamilyMemberListProps) {
  const { data, isLoading } = useFamilyMembersQuery();
  const deleteMutation = useDeleteFamilyMember();

  const handleDelete = (member: FamilyMember) => {
    Alert.alert(
      `Remove ${member.name}?`,
      'Their preferences will no longer appear in personal analysis.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            deleteMutation.mutate(member.id);
          },
        },
      ],
    );
  };

  const members = data?.items ?? [];

  return (
    <View className="overflow-hidden rounded-[22px] border border-gray-200 bg-white">
      {isLoading ? (
        <View className="px-4 py-5">
          <Typography variant="bodySecondary" className="text-gray-500">
            Loading…
          </Typography>
        </View>
      ) : members.length === 0 ? null : (
        members.map((member, index) => (
          <TouchableOpacity
            key={member.id}
            activeOpacity={0.7}
            className={`flex-row items-center mx-4 py-3 ${
              index < members.length - 1 ? 'border-b border-gray-200' : ''
            }`}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${member.name}`}
            onLongPress={() => {
              handleDelete(member);
            }}
            onPress={() => {
              onEdit(member);
            }}
          >
            <UserAvatar imageUrl={member.avatarUrl} name={member.name} size="md" className="mr-3" />

            <View className="flex-1 pr-3">
              <Typography variant="body" className="font-semibold text-neutrals-900">
                {member.name}
              </Typography>
              <Typography variant="bodySecondary" className="mt-1 text-neutrals-500">
                {member.mainGoal ? MAIN_GOAL_LABELS[member.mainGoal] : 'No goal set'}
              </Typography>
            </View>

            <ChevronRight color={COLORS.gray500} size={18} strokeWidth={2} />
          </TouchableOpacity>
        ))
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        className="flex-row items-center justify-center border-gray-200 mx-4 py-3"
        style={{ borderTopWidth: members.length > 0 ? 1 : 0 }}
        accessibilityRole="button"
        accessibilityLabel="Add family member"
        onPress={onAdd}
      >
        <View
          className="mr-2 h-6 w-6 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.primary25 }}
        >
          <Plus color={COLORS.primary} size={16} strokeWidth={2.5} />
        </View>
        <Typography variant="button" style={{ color: COLORS.primary }}>
          Add a member
        </Typography>
      </TouchableOpacity>
    </View>
  );
}
