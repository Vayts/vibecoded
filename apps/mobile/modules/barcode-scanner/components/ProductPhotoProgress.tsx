import React from 'react';
import { View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import type { ProductPhotoStep } from '../types/productPhotoCapture';

interface ProductPhotoProgressProps {
  activeStepIndex: number;
  completedStepCount: number;
  steps: ProductPhotoStep[];
}

export function ProductPhotoProgress({
  activeStepIndex,
  completedStepCount,
  steps,
}: ProductPhotoProgressProps) {
  return (
    <View className="mt-2 flex-row gap-2">
      {steps.map((step, index) => {
        const isActive = index === activeStepIndex;
        const isCaptured = index < completedStepCount;
        const indicatorClass = isCaptured ? 'bg-white' : isActive ? 'bg-white/85' : 'bg-white/25';
        const labelClass = isActive || isCaptured ? 'text-white' : 'text-white/55';

        return (
          <View key={step.key} className="flex-1">
            <View className={`h-1 rounded-full ${indicatorClass}`} />
            <View className="mt-1.5 flex-row items-center justify-center gap-1">
              {isCaptured ? (
                <Typography variant="caption" className="text-white">
                  ✓
                </Typography>
              ) : null}
              <Typography variant="caption" className={labelClass} numberOfLines={1}>
                {step.shortTitle}
              </Typography>
            </View>
          </View>
        );
      })}
    </View>
  );
}
