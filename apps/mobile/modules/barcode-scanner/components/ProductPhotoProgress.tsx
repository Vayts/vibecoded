import React from 'react';
import { View } from 'react-native';

interface ProductPhotoProgressProps {
  activeStepIndex: number;
  completedStepCount: number;
  totalSteps: number;
}

export function ProductPhotoProgress({
  activeStepIndex,
  completedStepCount,
  totalSteps,
}: ProductPhotoProgressProps) {
  return (
    <View className="mt-2 flex-row gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === activeStepIndex;
        const isCaptured = index < completedStepCount;

        return (
          <View key={index} className="flex-1">
            <View
              className={`h-1 rounded-full ${isActive || isCaptured ? 'bg-white' : 'bg-white/25'}`}
            />
          </View>
        );
      })}
    </View>
  );
}
