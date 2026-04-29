import { useRouter } from 'expo-router';

import { AuthEntryScreen } from '../../modules/auth/components/AuthEntryScreen';

export default function WelcomeScreen() {
  const router = useRouter();

  return <AuthEntryScreen onContinue={() => router.replace('/(auth)/sign-in')} />;
}
