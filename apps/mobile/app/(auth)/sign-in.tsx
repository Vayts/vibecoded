import { View, Image, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../shared/stores/authStore';
import { Typography } from '../../shared/components/Typography';
import { Button } from '../../shared/components/Button';
import { isAppleAuthAvailable } from '../../shared/lib/auth/client';
import appleIcon from '../../assets/apple.png';
import googleIcon from '../../assets/google.png';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useEffect } from 'react';
import { toast } from '@backpackapp-io/react-native-toast';
import SignInMascot from '../../assets/icons/mascot/sign-in-mascot.svg';

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

    try {
      await signInWithGoogle();
      router.replace('/');
    } catch {
      return;
    }
  }

  async function handleAppleSignIn() {
    clearError();

    try {
      await signInWithApple();
      router.replace('/');
    } catch {
      return;
    }
  }

  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  return (
    <View className="flex-1 bg-primary-500">
      <StatusBar barStyle="light-content" />

      <View className="absolute left-[-72px] top-[88px] h-[188px] w-[188px] rounded-full bg-white/10" />
      <View className="absolute right-[-56px] top-[170px] h-[156px] w-[156px] rounded-full bg-white/10" />
      <View className="absolute left-[28px] top-[150px] h-[22px] w-[22px] rounded-full bg-white/20" />

      <View
        className="flex-1 items-center justify-center px-6"
        style={{ paddingTop: insets.top + 20, paddingBottom: 20 }}
      >
        <Typography variant="hero" className="text-center text-white">
          Welcome to Chozr
        </Typography>

        <Typography className="mt-2 text-center text-base text-white/90">
          Scan. Compare. Eat smarter.
        </Typography>

        <View className="mt-10 items-center justify-center">
          <SignInMascot width={260} height={264} />
        </View>
      </View>

      <View
        className="rounded-t-[32px] bg-white px-6 pt-7"
        style={{ paddingBottom: insets.bottom + 32 }}
      >
        <Typography variant="pageTitle" className="text-center">
          Sign in to continue
        </Typography>

        <Typography variant="bodySecondary" className="mt-2 px-12 text-center text-gray-500">
          Pick a secure sign-in method to start scanning and comparing products.
        </Typography>

        <View className="mt-6 gap-3">
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
