import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ComparisonResultScreen } from '../modules/scanner/components/ComparisonResultSheet';
import { ComparisonStackHeader } from '../modules/scanner/components/ComparisonResultSheet/ComparisonStackHeader';
import { COLORS } from '../shared/constants/colors';

export default function ComparisonRoute() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/(tabs)/scans');
  }, [router]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          contentStyle: { backgroundColor: COLORS.appBackground },
          header: () => <ComparisonStackHeader onBackPress={handleBack} />,
        }}
      />
      <ComparisonResultScreen />
    </>
  );
}