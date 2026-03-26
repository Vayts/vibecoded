import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ScreenHeader } from '../../../shared/components/ScreenHeader';

export default function ProfileLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: true,
          header: () => <ScreenHeader />,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
