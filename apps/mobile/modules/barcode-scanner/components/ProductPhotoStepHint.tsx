import React from 'react';
import { View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';
import type { ProductPhotoStep } from '../types/productPhotoCapture';

interface ProductPhotoStepHintProps {
  activeStepIndex: number;
  step: ProductPhotoStep;
  totalSteps: number;
}

export function ProductPhotoStepHint({
  activeStepIndex,
  step,
  totalSteps,
}: ProductPhotoStepHintProps) {
  return (
    <View
      className="rounded-[18px] px-3 py-3"
      style={{ backgroundColor: COLORS.overlayStrong }}
    >
      <View className="flex-row items-center gap-2">
        <Typography variant="caption" className="text-white/70">
          {activeStepIndex + 1}/{totalSteps}
        </Typography>
        <Typography variant="buttonSmall" className="flex-1 text-white" numberOfLines={1}>
          {step.title}
        </Typography>
        {step.isOptional ? (
          <View className="rounded-full bg-white/15 px-2 py-0.5">
            <Typography variant="caption" className="text-white">
              Optional
            </Typography>
          </View>
        ) : null}
      </View>

      <Typography variant="bodySecondary" className="mt-1.5 text-white/85" numberOfLines={2}>
        {step.description}
      </Typography>
    </View>
  );
}

