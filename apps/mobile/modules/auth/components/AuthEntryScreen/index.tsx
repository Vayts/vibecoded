import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../../../shared/components/Button';
import { Typography } from '../../../../shared/components/Typography';
import { COLORS } from '../../../../shared/constants/colors';
import WelcomeMascot from '../../../../assets/icons/mascot/welcome-mascot.svg';

interface AuthEntryScreenProps {
  onContinue: () => void;
}

export function AuthEntryScreen({ onContinue }: AuthEntryScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 px-4">
      <StatusBar style="light" backgroundColor={COLORS.launchSplashBackground} />
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: insets.top + 20 }}
      >
        <Typography variant="hero" className="text-[26px] mb-1">
          Get started with Chozr
        </Typography>
        <Typography variant="body" className="mb-11 font-semibold text-neutral-400">
          Scan your way to better food
        </Typography>
        <WelcomeMascot />
      </View>

      <View style={{ paddingBottom: insets.bottom + 24 }}>
        <View className="mt-6">
          <Button
            accessibilityLabel="Continue to sign in"
            accessibilityRole="button"
            fullWidth
            size="md"
            label="Continue"
            onPress={onContinue}
          />
        </View>
      </View>
    </View>
  );
}
