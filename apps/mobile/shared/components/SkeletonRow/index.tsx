import { memo, useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { COLORS } from '../../constants/colors';

interface SkeletonRowProps {
  showTrailingAction?: boolean;
}

const IMAGE_SIZE = 74;
const IMAGE_RADIUS = 12;
const TRAILING_ACTION_SIZE = 44;

export const SkeletonRow = memo(function SkeletonRow({
  showTrailingAction = true,
}: SkeletonRowProps) {
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [opacity]);

  return (
    <Animated.View style={{ opacity }}>
      <View className="flex-row items-start px-4 py-3">
        <View
          style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: IMAGE_RADIUS,
            backgroundColor: COLORS.neutrals100,
          }}
        />

        <View className="ml-3 flex-1">
          <View
            style={{
              width: '68%',
              height: 14,
              borderRadius: 999,
              backgroundColor: COLORS.neutrals100,
            }}
          />
          <View
            className="mt-2"
            style={{
              width: '42%',
              height: 12,
              borderRadius: 999,
              backgroundColor: COLORS.neutrals100,
            }}
          />

          <View className="mt-1">
            <View
              style={{
                width: 56,
                height: 20,
                borderRadius: 10,
                backgroundColor: COLORS.neutrals100,
              }}
            />

            <View className="mt-3 flex-row items-center">
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  backgroundColor: COLORS.neutrals100,
                }}
              />
              <View
                className="ml-2"
                style={{
                  width: 64,
                  height: 12,
                  borderRadius: 999,
                  backgroundColor: COLORS.neutrals100,
                }}
              />
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});
