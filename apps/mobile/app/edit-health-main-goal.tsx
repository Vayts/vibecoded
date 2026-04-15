import {
  MainGoalField,
  MainGoalHint,
} from '../modules/onboarding/components/OnboardingFields';
import { HealthPreferenceEditorScreen } from '../modules/profile/components/HealthPreferenceEditorScreen';

export default function EditHealthMainGoalRoute() {
  return (
    <HealthPreferenceEditorScreen
      title="Main goal"
      description="Choose the primary outcome you want the app to optimize for."
    >
      <MainGoalField />
      <MainGoalHint />
    </HealthPreferenceEditorScreen>
  );
}
