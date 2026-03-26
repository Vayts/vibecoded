import { Stack } from 'expo-router';

import { ScreenHeader } from '../../../shared/components/ScreenHeader';

export default function ScansLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: true,
          header: () => <ScreenHeader title="Scan Details" />,
        }}
      />
    </Stack>
  );
}
