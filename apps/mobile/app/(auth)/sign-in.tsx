import { View, Image } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useAuthStore } from '../../shared/stores/authStore';
import { Typography } from '../../shared/components/Typography';
import { Button } from '../../shared/components/Button';
import { isAppleAuthAvailable } from '../../shared/lib/auth/client';
import appleIcon from '../../assets/apple.png';
import googleIcon from '../../assets/google.png';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useEffect } from 'react';
import { toast } from '@backpackapp-io/react-native-toast';

const ICON_SIZE_APPLE = { width: 20, height: 20 };
const ICON_SIZE_GOOGLE = { width: 16, height: 16 };

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID!,
});

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple, isLoading, error, clearError } = useAuthStore();

  async function handleGoogleSignIn() {
    clearError();
    await signInWithGoogle();
  }

  async function handleAppleSignIn() {
    clearError();
    await signInWithApple();
  }

  useEffect(() => {
    if (error) {
      console.log('Displaying toast for error:', error);

      toast.error(error);
    }
  }, [clearError, error]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-white" behavior="padding">
      <View className="flex-1 justify-center px-6">
        <View className="items-center">
          <Typography variant="hero" className="mb-2">
            Welcome Text
          </Typography>
          <Typography variant="bodySecondary" className="mb-8">
            Sign in Description
          </Typography>
        </View>

        <View className="gap-3">
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
    </KeyboardAvoidingView>
  );
}
