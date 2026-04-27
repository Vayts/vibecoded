import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useEffect } from 'react';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import SplashMascot from '../../../../assets/icons/mascot/splash-mascot.svg';

export function LaunchSplashScreen() {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1.05, {
        duration: 300,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: COLORS.launchSplashBackground }}
    >
      <StatusBar style="light" backgroundColor={COLORS.launchSplashBackground} />

      <Typography variant="hero" className="text-center text-[26px] text-white">
        Welcome to Chozr
      </Typography>

      <Typography className="text-center text-[16px] mt-1 mb-12 text-white">
        Scan. Compare. Eat smarter.
      </Typography>

      <Animated.View style={animatedStyle}>
        <SplashMascot />
      </Animated.View>
    </View>
  );
}
