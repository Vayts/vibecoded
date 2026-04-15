import { useRouter } from 'expo-router';

import { useCreateFamilyMember } from '../../hooks/useFamilyMembers';
import { FamilyMemberForm } from '../FamilyMemberForm';

export function AddFamilyMemberScreen() {
  const router = useRouter();
  const createMutation = useCreateFamilyMember();

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
