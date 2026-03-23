import { Redirect } from 'expo-router';
import { ScreenSpinner } from '../shared/components/ScreenSpinner';
import { useAuthStore } from '../shared/stores/authStore';

export default function Index() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
