import { Stack, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ScreenSpinner } from '../../shared/components/ScreenSpinner';
import { useAuthStore } from '../../shared/stores/authStore';

export default function AuthLayout() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/');
    }
  }, [isInitialized, router, user]);

  if (!isInitialized) {
    return <ScreenSpinner />;
  }

  if (user) {
    return <ScreenSpinner />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
