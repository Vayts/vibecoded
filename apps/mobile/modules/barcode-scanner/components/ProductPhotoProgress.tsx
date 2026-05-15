import React from 'react';
import { View } from 'react-native';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';

interface ProductPhotoProgressProps {
  activeStepIndex: number;
  capturedPhotos: CapturedProductPhoto[];
  totalSteps: number;
}

export function ProductPhotoProgress({
  activeStepIndex,
  capturedPhotos,
  totalSteps,
}: ProductPhotoProgressProps) {
  const capturedCount = capturedPhotos.length;

  return (
    <View className="mt-2 flex-row gap-1.5">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isActive = index === activeStepIndex;
        const isCaptured = index < capturedCount;

        return (
          <View key={index} className="flex-1">
            <View
              className={`h-1 rounded-full ${
                isActive || isCaptured ? 'bg-white' : 'bg-white/25'
              }`}
            />
          </View>
        );
      })}
    </View>
  );
}

