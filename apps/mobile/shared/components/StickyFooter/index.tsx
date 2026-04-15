import type { ReactNode } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller';

import { Typography } from '../Typography';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const DEFAULT_STICKY_FOOTER_HEIGHT = 196;

const STICKY_FOOTER_FADE_HEIGHT = 42;
const KEYBOARD_OPEN_OFFSET = 16;

interface StickyFooterProps {
  bottomInset: number;
  children: ReactNode;
  errorMessage?: string | null;
  onLayoutHeight?: (height: number) => void;
}

export function StickyFooter({
  bottomInset,
  children,
  errorMessage,
  onLayoutHeight,
}: StickyFooterProps) {
  const { height, progress } = useReanimatedKeyboardAnimation();
  const footerBackgroundHeight = bottomInset + 16;
  const insets = useSafeAreaInsets();

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: height.value + (progress.value * KEYBOARD_OPEN_OFFSET * 2),
      },
    ],
  }));

  const handleLayout = (event: LayoutChangeEvent) => {
    onLayoutHeight?.(Math.ceil(event.nativeEvent.layout.height) + footerBackgroundHeight);
  };

  return (
    <View pointerEvents="box-none" className="absolute bottom-0 left-0 right-0 bg-white">
      {footerBackgroundHeight > 0 ? (
        <View
          pointerEvents="none"
          className="absolute bottom-0 left-0 right-0 bg-white"
          style={{ height: footerBackgroundHeight }}
        />
      ) : null}

      <Animated.View
        className="absolute left-0 right-0"
        style={[{ bottom: insets.bottom + 8 }, contentAnimatedStyle]}
        onLayout={handleLayout}
      >
        <View
          pointerEvents="none"
          className="absolute left-0 right-0"
          style={{ top: -STICKY_FOOTER_FADE_HEIGHT }}
        >
          <View style={{ height: 12, backgroundColor: 'rgba(255,255,255,0)' }} />
          <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.28)' }} />
          <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.58)' }} />
          <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.82)' }} />
        </View>

        <View className="bg-white px-4">
          {errorMessage ? (
            <Typography variant="bodySecondary" className="mb-4 text-center text-red-500">
              {errorMessage}
            </Typography>
          ) : null}

          {children}
        </View>
      </Animated.View>
    </View>
  );
}
