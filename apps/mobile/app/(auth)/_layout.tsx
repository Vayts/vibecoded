import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '../../shared/stores/authStore';

export default function AuthLayout() {
  const user = useAuthStore((state) => state.user);

  if (user) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
