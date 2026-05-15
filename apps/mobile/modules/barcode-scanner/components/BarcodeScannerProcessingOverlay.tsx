import React from 'react';
import { View } from 'react-native';
import { CustomLoader } from '../../../shared/components/CustomLoader';
import { Typography } from '../../../shared/components/Typography';
import { COLORS } from '../../../shared/constants/colors';

interface BarcodeScannerProcessingOverlayProps {
  statusMessage: string;
}

export function BarcodeScannerProcessingOverlay({
  statusMessage,
}: BarcodeScannerProcessingOverlayProps) {
  return (
    <View className="absolute inset-0 items-center justify-center px-6">
      <View
        className="items-center rounded-[22px] px-6 py-3"
        style={{ backgroundColor: COLORS.overlayStrong, minWidth: 180, maxWidth: 250 }}
      >
        <CustomLoader size="md" />
        <Typography className="mt-4 text-center text-[13px] text-white">{statusMessage}</Typography>
      </View>
    </View>
  );
}


