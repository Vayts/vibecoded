import { FamilyMembersAccessGate } from '../modules/family/components/FamilyMembersAccessGate/index';
import { FamilyMemberHealthEditorScreen } from '../modules/family/components/FamilyMemberHealthEditorScreen';
import { FamilyMemberAllergiesField } from '../modules/family/components/FamilyMemberHealthFields';
import { useFamilyMemberFormStore } from '../modules/family/stores/familyMemberFormStore';
import {
  getOtherAllergyValidationError,
  normalizeOtherAllergyText,
} from '../shared/lib/validation/otherAllergy';

export default function EditFamilyMemberAllergiesRoute() {
  const allergies = useFamilyMemberFormStore((state) => state.draft.allergies);
  const otherAllergiesText = useFamilyMemberFormStore((state) => state.draft.otherAllergiesText);
  const otherAllergyError = getOtherAllergyValidationError({
    allergies,
    otherAllergiesText,
  });

  return (
    <FamilyMembersAccessGate>
      <FamilyMemberHealthEditorScreen
        buildPayload={() => {
          if (otherAllergyError) {
            throw new Error(otherAllergyError);
          }

          return {
            allergies,
            otherAllergiesText: normalizeOtherAllergyText({
              allergies,
              otherAllergiesText,
            }),
          };
        }}
        isSubmitDisabled={Boolean(otherAllergyError)}
        title="Allergies"
        description="List allergens and ingredients the app should avoid during analysis for this family member."
      >
        <FamilyMemberAllergiesField />
      </FamilyMemberHealthEditorScreen>
    </FamilyMembersAccessGate>
  );
}
