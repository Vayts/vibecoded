import type { FamilyMember } from '@acme/shared';
import { Alert, TouchableOpacity, View } from 'react-native';
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native';

import { Typography } from '../../../../shared/components/Typography';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { COLORS } from '../../../../shared/constants/colors';
import {
  useFamilyMembersQuery,
  useDeleteFamilyMember,
} from '../../hooks/useFamilyMembers';
import { MAIN_GOAL_LABELS } from '../../../onboarding/components/options';

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
    <View>
      {isLoading ? (
        <View className="px-4 py-4">
          <Typography variant="bodySecondary" className="text-gray-500">
            Loading…
          </Typography>
        </View>
      ) : members.length === 0 ? (
        <View className="px-4 py-4">
          <Typography variant="bodySecondary" className="text-gray-500">
            Add family members to see how products fit their needs too.
          </Typography>
        </View>
      ) : (
        members.map((member) => (
          <View
            key={member.id}
            className="flex-row items-center border-b border-gray-100 px-4 py-4"
          >
            <TouchableOpacity
              activeOpacity={0.7}
              className="min-h-[44px] flex-1 flex-row items-center justify-between pr-2"
              accessibilityRole="button"
              accessibilityLabel={`Edit ${member.name}`}
              onPress={() => {
                onEdit(member);
              }}
            >
              <View className="flex-1 flex-row items-center">
                <UserAvatar
                  imageUrl={member.avatarUrl}
                  name={member.name}
                  size="md"
                  className="mr-3"
                />
                <View className="flex-1">
                  <Typography variant="body" className="font-semibold text-gray-900">
                    {member.name}
                  </Typography>
                  <Typography variant="bodySecondary" className="mt-0.5 text-gray-500">
                    {member.mainGoal ? MAIN_GOAL_LABELS[member.mainGoal] : 'No goal set'}
                  </Typography>
                </View>
              </View>
              <ChevronRight color={COLORS.gray400} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              className="ml-2 h-11 w-11 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={`Remove ${member.name}`}
              onPress={() => {
                handleDelete(member);
              }}
            >
              <Trash2 color={COLORS.danger} size={18} />
            </TouchableOpacity>
          </View>
        ))
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        className="min-h-[52px] flex-row items-center px-4 py-4"
        accessibilityRole="button"
        accessibilityLabel="Add family member"
        onPress={onAdd}
      >
        <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <Plus color={COLORS.primary} size={18} />
        </View>
        <Typography variant="body" className="font-semibold" style={{ color: COLORS.primary }}>
          Add member
        </Typography>
      </TouchableOpacity>
    </View>
  );
}
