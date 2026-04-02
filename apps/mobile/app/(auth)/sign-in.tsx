import { View, Image, StatusBar } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../shared/stores/authStore';
import { Typography } from '../../shared/components/Typography';
import { Button } from '../../shared/components/Button';
import { isAppleAuthAvailable } from '../../shared/lib/auth/client';
import appleIcon from '../../assets/apple.png';
import googleIcon from '../../assets/google.png';
import loginBack from '../../assets/login-back.png';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useEffect } from 'react';
import { toast } from '@backpackapp-io/react-native-toast';
import { COLORS } from '../../shared/constants/colors';

const ICON_SIZE_APPLE = { width: 20, height: 20 };
const ICON_SIZE_GOOGLE = { width: 16, height: 16 };

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
});

export default function SignInScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithGoogle, signInWithApple, isLoading, error, clearError } = useAuthStore();

  async function handleGoogleSignIn() {
    clearError();
    await signInWithGoogle();
    router.replace('/');
  }

  async function handleAppleSignIn() {
    clearError();
    await signInWithApple();
    router.replace('/');
  }

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [clearError, error]);

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Hero image — ~75% of screen, diagonal corner cut */}
      <View style={{ flex: 3, overflow: 'hidden', backgroundColor: COLORS.primaryLight }}>
        <ExpoImage
          source={loginBack}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          contentFit="cover"
          cachePolicy="memory"
          priority="high"
        />
        <View className="flex-1 bg-black/35">
            <View className="flex-1 justify-end px-6" style={{ paddingBottom: 48 }}>
              <Typography variant="hero" className="text-white text-4xl leading-tight">
                Welcome to{'\n'}Chozr
              </Typography>
              <Typography variant="body" className="mt-3 text-white/80">
                Scan. Compare. Eat smarter.
              </Typography>
            </View>
          </View>
        {/* White triangle cutting the bottom-right corner */}
        <View
          style={{
            position: 'absolute',
            bottom: -70,
            right: -70,
            width: 140,
            height: 140,
            backgroundColor: '#FFFFFF',
            transform: [{ rotate: '45deg' }],
          }}
        />
      </View>

      {/* White bottom section with buttons */}
      <View
        className="bg-white px-6 pt-6"
        style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 24) }}
      >
        <View className="flex-1 justify-center gap-3">
          {isAppleAuthAvailable ? (
            <Button
              onPress={handleAppleSignIn}
              loading={isLoading}
              disabled={isLoading}
              variant="secondary"
              label="Sign in with Apple"
              fullWidth
              Icon={<Image source={appleIcon} style={ICON_SIZE_APPLE} />}
            />
          ) : null}
          <Button
            onPress={handleGoogleSignIn}
            loading={isLoading}
            disabled={isLoading}
            variant="secondary"
            label="Sign in with Google"
            fullWidth
            Icon={<Image source={googleIcon} style={ICON_SIZE_GOOGLE} />}
          />
        </View>
      </View>
    </View>
  );
}
