import { Camera } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';
import type { ProductPhotoStep } from '../types/productPhotoCapture';

interface ProductPhotoCaptureControlsProps {
  isCapturing: boolean;
  isSubmitting: boolean;
  step: ProductPhotoStep;
  onCapture: () => void;
  onSkipOptional: () => void;
}

export function ProductPhotoCaptureControls({
  isCapturing,
  isSubmitting,
  step,
  onCapture,
  onSkipOptional,
}: ProductPhotoCaptureControlsProps) {
  const isDisabled = isCapturing || isSubmitting;

  return (
    <View className="items-center gap-4">
      {step.isOptional ? (
        <TouchableOpacity
          accessibilityLabel="Skip optional photo"
          accessibilityRole="button"
          activeOpacity={0.7}
          className={`rounded-full bg-black/50 px-4 py-3 ${isSubmitting ? 'opacity-40' : ''}`}
          disabled={isSubmitting}
          onPress={onSkipOptional}
        >
          <Typography variant="buttonSmall" className="text-white">
            {isSubmitting ? 'Uploading…' : 'Skip — previous photo includes both'}
          </Typography>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        accessibilityLabel={step.captureLabel}
        accessibilityRole="button"
        activeOpacity={0.7}
        className={`h-20 w-20 items-center justify-center rounded-full border-[3px] border-white ${
          isDisabled ? 'opacity-40' : ''
        }`}
        disabled={isDisabled}
        onPress={onCapture}
      >
        <View className="h-[68px] w-[68px] items-center justify-center rounded-full bg-white">
          <Camera color={COLORS.gray800} size={24} />
        </View>
      </TouchableOpacity>

      <Typography variant="buttonSmall" className="text-center text-white">
        {isSubmitting ? 'Uploading…' : isCapturing ? 'Capturing…' : step.captureLabel}
      </Typography>
    </View>
  );
}

