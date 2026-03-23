import { Redirect, Stack } from 'expo-router';
import { ScreenSpinner } from '../../shared/components/ScreenSpinner';
import { useAuthStore } from '../../shared/stores/authStore';

export default function AuthLayout() {
  const { user, isInitialized } = useAuthStore();

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
