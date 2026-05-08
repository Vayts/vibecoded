import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useRef } from 'react';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import LottieView from 'lottie-react-native';
import LoaderAnim from '../../../../assets/lottie/loader.json';

export function LaunchSplashScreen() {
  const animation = useRef<LottieView>(null);

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

      <View>
        <LottieView
          autoPlay
          ref={animation}
          style={{
            width: 250,
            height: 250,
          }}
          source={LoaderAnim}
        />
      </View>
    </View>
  );
}
