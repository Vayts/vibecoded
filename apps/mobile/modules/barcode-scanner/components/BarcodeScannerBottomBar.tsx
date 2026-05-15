import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Typography } from '../../../shared/components/Typography';

interface BarcodeScannerBottomBarProps {
  isCompareMode: boolean;
  onCancelCompare: () => void;
}

export function BarcodeScannerBottomBar({
  isCompareMode,
  onCancelCompare,
}: BarcodeScannerBottomBarProps) {
  return (
    <View className="items-center justify-end" style={{ minHeight: isCompareMode ? 132 : 56 }}>
      {isCompareMode ? (
        <TouchableOpacity
          accessibilityLabel="Cancel comparison"
          accessibilityRole="button"
          activeOpacity={0.7}
          className="mb-4 rounded-full bg-black/50 px-4 py-3"
          onPress={onCancelCompare}
        >
          <Typography variant="buttonSmall" className="text-white">
            Cancel comparison
          </Typography>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}


