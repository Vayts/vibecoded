import { FamilyMemberHealthEditorScreen } from '../modules/family/components/FamilyMemberHealthEditorScreen';
import { FamilyMemberPreferencesField } from '../modules/family/components/FamilyMemberHealthFields';
import { useFamilyMemberFormStore } from '../modules/family/stores/familyMemberFormStore';

export default function EditFamilyMemberPreferencesRoute() {
  const nutritionPriorities = useFamilyMemberFormStore((state) => state.draft.nutritionPriorities);

  return (
    <FamilyMemberHealthEditorScreen
      buildPayload={() => ({ nutritionPriorities })}
      title="Preferences"
      description="Set the softer ranking preferences used to personalize recommendations for this family member."
    >
      <FamilyMemberPreferencesField />
    </FamilyMemberHealthEditorScreen>
  );
}
