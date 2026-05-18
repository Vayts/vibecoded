import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

interface ProductPhotoSavedOverlayProps {
  stepTitle: string | null;
}

export function ProductPhotoSavedOverlay({ stepTitle }: ProductPhotoSavedOverlayProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;

  useEffect(() => {
    if (!stepTitle) {
      Animated.timing(opacity, {
        duration: 120,
        toValue: 0,
        useNativeDriver: true,
      }).start();
      return;
    }

    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, {
        duration: 140,
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        damping: 14,
        mass: 0.8,
        stiffness: 180,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, scale, stepTitle]);

  if (!stepTitle) {
    return null;
  }

  return (
    <Animated.View
      accessibilityLabel={`${stepTitle} photo saved`}
      pointerEvents="none"
      className="absolute left-4 right-4 top-[45%] items-center"
      style={{ opacity, transform: [{ scale }] }}
    >
      <View
        className="items-center rounded-full px-5 py-3"
        style={{ backgroundColor: COLORS.overlayStrong }}
      >
        <Typography variant="buttonSmall" className="text-white">
          ✓ Photo saved
        </Typography>
        <Typography variant="caption" className="mt-0.5 text-white/70">
          {stepTitle} captured
        </Typography>
      </View>
    </Animated.View>
  );
}
