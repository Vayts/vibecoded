import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';

export function LaunchSplashScreen() {
  return (
    <View
      className="flex-1 items-center justify-center px-6"
      style={{ backgroundColor: COLORS.launchSplashBackground }}
    >
      <StatusBar style="light" backgroundColor={COLORS.launchSplashBackground} />
      <Typography variant="hero" className="text-center text-white">
        Welcome to Chozr
      </Typography>
    </View>
  );
}

