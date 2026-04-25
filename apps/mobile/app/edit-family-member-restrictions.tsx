import { FamilyMembersAccessGate } from '../modules/family/components/FamilyMembersAccessGate/index';
import { FamilyMemberHealthEditorScreen } from '../modules/family/components/FamilyMemberHealthEditorScreen';
import { FamilyMemberRestrictionsField } from '../modules/family/components/FamilyMemberHealthFields';
import { useFamilyMemberFormStore } from '../modules/family/stores/familyMemberFormStore';

export default function EditFamilyMemberRestrictionsRoute() {
  const restrictions = useFamilyMemberFormStore((state) => state.draft.restrictions);

  return (
    <FamilyMembersAccessGate>
      <FamilyMemberHealthEditorScreen
        buildPayload={() => ({ restrictions })}
        title="Restrictions"
        description="Set the hard constraints that product analysis should always respect for this family member."
      >
        <FamilyMemberRestrictionsField />
      </FamilyMemberHealthEditorScreen>
    </FamilyMembersAccessGate>
  );
}
