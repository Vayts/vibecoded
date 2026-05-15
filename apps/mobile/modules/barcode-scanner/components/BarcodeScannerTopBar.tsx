import { Zap } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { BackButton } from '../../../shared/components/BackButton';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';

interface BarcodeScannerTopBarProps {
  isCompareMode: boolean;
  isLocked: boolean;
  isTorchEnabled: boolean;
  shouldReturnAfterCompareCancel: boolean;
  onClose: () => void;
  onCancelCompare: () => void;
  onToggleTorch: () => void;
}

export function BarcodeScannerTopBar({
  isCompareMode,
  isLocked,
  isTorchEnabled,
  shouldReturnAfterCompareCancel,
  onClose,
  onCancelCompare,
  onToggleTorch,
}: BarcodeScannerTopBarProps) {
  return (
    <View className="flex-row items-center">
      <BackButton
        variant="dark"
        icon="close"
        accessibilityLabel={
          isCompareMode && shouldReturnAfterCompareCancel
            ? 'Cancel comparison and close scanner'
            : 'Close scanner'
        }
        onPress={isCompareMode && shouldReturnAfterCompareCancel ? onCancelCompare : onClose}
      />

      <View className="flex-1 items-center px-3">
        <Typography variant="buttonSmall" className="text-white">
          {isCompareMode ? 'Compare products' : 'Scan barcode'}
        </Typography>
      </View>

      <TouchableOpacity
        accessibilityLabel={isTorchEnabled ? 'Turn flashlight off' : 'Turn flashlight on'}
        accessibilityRole="button"
        activeOpacity={0.7}
        className="h-11 w-11 items-center justify-center rounded-full"
        disabled={isLocked}
        style={{
          backgroundColor: isTorchEnabled ? COLORS.primary : COLORS.overlay,
          opacity: isLocked ? 0.4 : 1,
        }}
        onPress={onToggleTorch}
      >
        <Zap
          color={COLORS.white}
          size={18}
          fill={isTorchEnabled ? COLORS.white : COLORS.transparent}
        />
      </TouchableOpacity>
    </View>
  );
}


