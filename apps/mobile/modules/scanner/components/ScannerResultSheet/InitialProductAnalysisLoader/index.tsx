import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Typography } from '../../../../../shared/components/Typography';
import SearchMascot from '../../../../../assets/icons/mascot/search-mascot.svg';

const ANALYSIS_MESSAGES = [
  'Finding your product…',
  'Identifying the product…',
  'Checking ingredients…',
  'Comparing with your profile…',
  'Preparing your result…',
] as const;

const MESSAGE_INTERVAL_MS = 2500;
const FADE_DURATION_MS = 220;
const MASCOT_PULSE_DURATION_MS = 400;
const MASCOT_PULSE_SCALE = 1.1;

export function InitialProductAnalysisLoader() {
  const [messageIndex, setMessageIndex] = useState(0);
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);
  const mascotScale = useSharedValue(1);

  const mascotAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: mascotScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  useEffect(() => {
    mascotScale.value = withRepeat(
      withSequence(
        withTiming(MASCOT_PULSE_SCALE, {
          duration: MASCOT_PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
        withTiming(1, {
          duration: MASCOT_PULSE_DURATION_MS,
          easing: Easing.inOut(Easing.ease),
        }),
      ),
      -1,
      false,
    );

    return () => {
      cancelAnimation(mascotScale);
    };
  }, [mascotScale]);

  useEffect(() => {
    const timeouts: Array<ReturnType<typeof setTimeout>> = [];

    const interval = setInterval(() => {
      opacity.value = withTiming(0, {
        duration: FADE_DURATION_MS,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(-6, {
        duration: FADE_DURATION_MS,
        easing: Easing.out(Easing.ease),
      });

      const timeout = setTimeout(() => {
        setMessageIndex((currentIndex) => (currentIndex + 1) % ANALYSIS_MESSAGES.length);
        translateY.value = 6;
        opacity.value = withTiming(1, {
          duration: FADE_DURATION_MS,
          easing: Easing.in(Easing.ease),
        });
        translateY.value = withTiming(0, {
          duration: FADE_DURATION_MS,
          easing: Easing.in(Easing.ease),
        });
      }, FADE_DURATION_MS);

      timeouts.push(timeout);
    }, MESSAGE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      timeouts.forEach(clearTimeout);
    };
  }, [opacity, translateY]);

  return (
    <View
      accessibilityLabel="Product analysis in progress"
      accessibilityRole="progressbar"
      className="items-center justify-center px-6 py-12"
    >
      <Animated.View style={mascotAnimatedStyle}>
        <SearchMascot height={100} />
      </Animated.View>

      <Animated.View className="mt-5 min-h-[48px] justify-center" style={animatedTextStyle}>
        <Typography variant="sectionTitle" className="text-center leading-7 text-gray-900">
          {ANALYSIS_MESSAGES[messageIndex]}
        </Typography>
      </Animated.View>
    </View>
  );
}
