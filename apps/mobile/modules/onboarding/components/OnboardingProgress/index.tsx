import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { ONBOARDING_STEP_COUNT } from '../../stores/onboarding/types';

interface OnboardingProgressProps {
  step: number;
}

export function OnboardingProgress({ step }: OnboardingProgressProps) {
  const progress = `${((step + 1) / ONBOARDING_STEP_COUNT) * 100}%` as const;

  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="fieldLabel">
          Step {step + 1} of {ONBOARDING_STEP_COUNT}
        </Typography>
        <Typography variant="caption" className="text-gray-500">
          A quick setup before you start
        </Typography>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-gray-100">
        <View className="h-full rounded-full bg-primary-700" style={{ width: progress }} />
      </View>
    </View>
  );
}
