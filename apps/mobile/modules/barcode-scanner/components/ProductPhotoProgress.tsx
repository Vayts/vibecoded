import React from 'react';
import { View } from 'react-native';
import type { CapturedProductPhoto } from '../types/productPhotoCapture';
import { PRODUCT_PHOTO_STEPS } from '../utils/productPhotoCaptureSteps';

interface ProductPhotoProgressProps {
  activeStepIndex: number;
  capturedPhotos: CapturedProductPhoto[];
}

export function ProductPhotoProgress({
  activeStepIndex,
  capturedPhotos,
}: ProductPhotoProgressProps) {
  const capturedSteps = new Set(capturedPhotos.map((photo) => photo.step));

  return (
    <View className="mt-2 flex-row gap-1.5">
      {PRODUCT_PHOTO_STEPS.map((step, index) => {
        const isActive = index === activeStepIndex;
        const isCaptured = capturedSteps.has(step.key);

        return (
          <View key={step.key} className="flex-1">
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

