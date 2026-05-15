import React from 'react';
import { View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

const GUIDE_ITEMS = [
  'Keep the product label inside the frame',
  'Include ingredients or nutrition facts when possible',
  'Avoid glare and blurry photos',
];

export function ScannerPhotoGuide() {
  return (
    <View pointerEvents="none" className="w-full items-center px-1">
      <View
        className="h-[260px] w-full max-w-[320px] rounded-[32px] border-2 border-white/85 bg-white/5"
      />

      <View
        className="mt-5 w-full max-w-[320px] rounded-[22px] px-4 py-3"
        style={{ backgroundColor: COLORS.overlayStrong }}
      >
        <Typography variant="buttonSmall" className="text-center text-white">
          Photo guide
        </Typography>
        <View className="mt-3 gap-2">
          {GUIDE_ITEMS.map((item) => (
            <View key={item} className="flex-row items-start gap-2">
              <View className="mt-2 h-1.5 w-1.5 rounded-full bg-white" />
              <Typography variant="bodySecondary" className="flex-1 text-white">
                {item}
              </Typography>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
