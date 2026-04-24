import { FamilyMembersAccessGate } from '../modules/family/components/FamilyMembersAccessGate/index';
import { EditFamilyMemberScreen } from '../modules/family/components/EditFamilyMemberScreen';

export default function EditFamilyMemberRoute() {
  return (
    <FamilyMembersAccessGate>
      <EditFamilyMemberScreen />
    </FamilyMembersAccessGate>
  );
}
