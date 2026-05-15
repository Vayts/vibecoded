import { Check, RotateCcw } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';

interface ProductPhotoPreviewActionsProps {
  isSubmitting: boolean;
  onRetake: () => void;
  onUsePhoto: () => void;
  usePhotoLabel?: string;
}

export function ProductPhotoPreviewActions({
  isSubmitting,
  onRetake,
  onUsePhoto,
  usePhotoLabel,
}: ProductPhotoPreviewActionsProps) {
  return (
    <View className="flex-row gap-3">
      <TouchableOpacity
        accessibilityLabel="Retake photo"
        accessibilityRole="button"
        activeOpacity={0.7}
        className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-white/70 bg-black/50 ${
          isSubmitting ? 'opacity-40' : ''
        }`}
        disabled={isSubmitting}
        onPress={onRetake}
      >
        <RotateCcw color={COLORS.white} size={18} />
        <Typography variant="button" className="text-white">
          Retake
        </Typography>
      </TouchableOpacity>

      <TouchableOpacity
        accessibilityLabel="Use photo"
        accessibilityRole="button"
        activeOpacity={0.7}
        className={`h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-primary-500 ${
          isSubmitting ? 'opacity-40' : ''
        }`}
        disabled={isSubmitting}
        onPress={onUsePhoto}
      >
        <Check color={COLORS.white} size={20} />
        <Typography variant="button" className="text-white">
          {isSubmitting ? (usePhotoLabel ?? 'Uploading…') : 'Use photo'}
        </Typography>
      </TouchableOpacity>
    </View>
  );
}

