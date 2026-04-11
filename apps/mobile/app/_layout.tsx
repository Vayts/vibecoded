import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import '../global.css';
import { SheetProvider } from 'react-native-actions-sheet';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSessionBootstrap } from '../shared/hooks/useSessionBootstrap';
import { Sheets } from '../shared/components/Sheets/Sheets';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { queryClient } from '../shared/lib/query/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { ScreenSpinner } from '../shared/components/ScreenSpinner';
import { NoInternetScreen } from '../shared/components/NoInternetScreen';
import { COLORS } from '../shared/constants/colors';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useNetworkStatus } from '../shared/hooks/useNetworkStatus';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useSessionBootstrap();
  const { isConnected, isRefreshing, refresh } = useNetworkStatus();

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if (isConnected === null) {
    return <ScreenSpinner />;
  }

  if (!isConnected) {
    return <NoInternetScreen onRetry={() => void refresh()} isRetrying={isRefreshing} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <GestureHandlerRootView style={styles.container} className="font-sans">
            <SheetProvider>
              <Sheets />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="comparison" />
                <Stack.Screen
                  name="scanner"
                />
              </Stack>
              <StatusBar style="auto" />
            </SheetProvider>
            <Toasts overrideDarkMode />
          </GestureHandlerRootView>
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.appBackground,
  },
});
