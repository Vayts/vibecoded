import { MAX_FAMILY_MEMBERS } from '@acme/shared';
import { useRouter } from 'expo-router';

import { ScreenSpinner } from '../../../../shared/components/ScreenSpinner';
import { useCreateFamilyMember, useFamilyMembersQuery } from '../../hooks/useFamilyMembers';
import { useFamilyMembersAccess } from '../../hooks/useFamilyMembersAccess';
import { FamilyMemberForm } from '../FamilyMemberForm';
import { FamilyMembersLockedState } from '../FamilyMembersLockedState';

export function AddFamilyMemberScreen() {
  const router = useRouter();
  const createMutation = useCreateFamilyMember();
  const familyMembersQuery = useFamilyMembersQuery();
  const familyMembersAccess = useFamilyMembersAccess();

  if (familyMembersAccess.isLoading || familyMembersQuery.isLoading) {
    return <ScreenSpinner />;
  }

  if (!familyMembersAccess.hasAccess) {
    return <FamilyMembersLockedState showBackAction />;
  }

  const usedSlots = familyMembersQuery.data?.items.length ?? 0;

  if (usedSlots >= MAX_FAMILY_MEMBERS) {
    const overflowCount = usedSlots - MAX_FAMILY_MEMBERS;
    const description = overflowCount > 0
      ? `You already have ${usedSlots} family members saved. Remove ${overflowCount} member${overflowCount === 1 ? '' : 's'} to get back under the ${MAX_FAMILY_MEMBERS}-member limit before adding another.`
      : `You already use all ${MAX_FAMILY_MEMBERS} family member slots. Remove one member before adding another.`;

    return (
      <FamilyMembersLockedState
        title="Family member limit reached"
        description={description}
        showBackAction
      />
    );
  }

  return (
    <FamilyMemberForm
      submitLabel="Finish"
      isSubmitting={createMutation.isPending}
      onSubmit={async (data) => {
        await createMutation.mutateAsync(data);
        router.back();
      }}
    />
  );
}
