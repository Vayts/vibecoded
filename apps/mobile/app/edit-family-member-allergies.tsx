import { FamilyMembersAccessGate } from '../modules/family/components/FamilyMembersAccessGate/index';
import { FamilyMemberHealthEditorScreen } from '../modules/family/components/FamilyMemberHealthEditorScreen';
import { FamilyMemberAllergiesField } from '../modules/family/components/FamilyMemberHealthFields';
import { useFamilyMemberFormStore } from '../modules/family/stores/familyMemberFormStore';

export default function EditFamilyMemberAllergiesRoute() {
  const allergies = useFamilyMemberFormStore((state) => state.draft.allergies);
  const otherAllergiesText = useFamilyMemberFormStore((state) => state.draft.otherAllergiesText);

  return (
    <FamilyMembersAccessGate>
      <FamilyMemberHealthEditorScreen
        buildPayload={() => ({
          allergies,
          otherAllergiesText: allergies.includes('OTHER') ? otherAllergiesText.trim() || null : null,
        })}
        title="Allergies"
        description="List allergens and ingredients the app should avoid during analysis for this family member."
      >
        <FamilyMemberAllergiesField />
      </FamilyMemberHealthEditorScreen>
    </FamilyMembersAccessGate>
  );
}
