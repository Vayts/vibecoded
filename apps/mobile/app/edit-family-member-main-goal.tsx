import { FamilyMembersAccessGate } from '../modules/family/components/FamilyMembersAccessGate/index';
import { FamilyMemberHealthEditorScreen } from '../modules/family/components/FamilyMemberHealthEditorScreen';
import { FamilyMemberMainGoalField } from '../modules/family/components/FamilyMemberHealthFields';
import { useFamilyMemberFormStore } from '../modules/family/stores/familyMemberFormStore';

export default function EditFamilyMemberMainGoalRoute() {
  const mainGoal = useFamilyMemberFormStore((state) => state.draft.mainGoal);

  return (
    <FamilyMembersAccessGate>
      <FamilyMemberHealthEditorScreen
        buildPayload={() => ({ mainGoal: mainGoal ?? null })}
        title="Main goal"
        description="Choose the primary outcome you want the app to optimize for for this family member."
      >
        <FamilyMemberMainGoalField />
      </FamilyMemberHealthEditorScreen>
    </FamilyMembersAccessGate>
  );
}
