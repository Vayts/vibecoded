import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import { useFamilyMembersQuery, useUpdateFamilyMember } from '../../hooks/useFamilyMembers';
import { FamilyMemberForm } from '../FamilyMemberForm';

export function EditFamilyMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading } = useFamilyMembersQuery();
  const updateMutation = useUpdateFamilyMember();

  const member = data?.items.find((m) => m.id === id);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  if (!member) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Typography variant="sectionTitle" className="text-gray-900">
          Member not found
        </Typography>
        <Typography variant="bodySecondary" className="mt-2 text-center text-gray-500">
          This family member may have been removed.
        </Typography>
      </View>
    );
  }

  return (
    <FamilyMemberForm
      initialData={member}
      submitLabel="Save changes"
      isSubmitting={updateMutation.isPending}
      onSubmit={async (formData) => {
        await updateMutation.mutateAsync({ id: member.id, data: formData });
        router.back();
      }}
    />
  );
}
