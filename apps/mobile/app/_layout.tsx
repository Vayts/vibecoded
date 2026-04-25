import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import '../global.css';
import { SheetProvider } from 'react-native-actions-sheet';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClientProvider } from '@tanstack/react-query';
import { useSessionBootstrap } from '../shared/hooks/useSessionBootstrap';
import { useAuthStore } from '../shared/stores/authStore';
import { useOnboardingQuery } from '../modules/onboarding/api/onboardingQueries';
import { Sheets } from '../shared/components/Sheets/Sheets';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toasts } from '@backpackapp-io/react-native-toast';
import { queryClient } from '../shared/lib/query/queryClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { NoInternetScreen } from '../shared/components/NoInternetScreen';
import { COLORS } from '../shared/constants/colors';
import { LaunchSplashScreen } from '../modules/auth/components/LaunchSplashScreen';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useNetworkStatus } from '../shared/hooks/useNetworkStatus';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  return (
    <SheetProvider>
      <Sheets />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="comparison" />
        <Stack.Screen name="scanner" />
      </Stack>
      <StatusBar style="auto" />
    </SheetProvider>
  );
}

interface AppStartupGateProps {
  hasCompletedMinimumSplash: boolean;
}

function AppStartupGate({ hasCompletedMinimumSplash }: AppStartupGateProps) {
  const { user, isInitialized } = useAuthStore();
  const { isConnected, isRefreshing, refresh } = useNetworkStatus();
  const onboardingQuery = useOnboardingQuery(user?.id);
  const [isSplashOverlayVisible, setIsSplashOverlayVisible] = useState(true);
  const hasStartedSplashExit = useRef(false);
  const splashOpacity = useSharedValue(1);
  const splashTranslateY = useSharedValue(0);

  const isOnboardingResolved = !user || onboardingQuery.isSuccess || onboardingQuery.isError;
  const isAppReady =
    hasCompletedMinimumSplash && isInitialized && isConnected !== null && isOnboardingResolved;

  const splashAnimatedStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    transform: [{ translateY: splashTranslateY.value }],
  }));

  useEffect(() => {
    if (!isAppReady || !isSplashOverlayVisible || hasStartedSplashExit.current) {
      return;
    }

    hasStartedSplashExit.current = true;

    const exitEasing = Easing.bezier(0.22, 1, 0.36, 1);

    splashOpacity.value = withTiming(0, {
      duration: 360,
      easing: exitEasing,
    });

    splashTranslateY.value = withTiming(
      -36,
      {
        duration: 360,
        easing: exitEasing,
      },
      (finished) => {
        if (finished) {
          runOnJS(setIsSplashOverlayVisible)(false);
        }
      },
    );
  }, [isAppReady, isSplashOverlayVisible, splashOpacity, splashTranslateY]);

  if (!isAppReady) {
    return <LaunchSplashScreen />;
  }

  const content = !isConnected ? (
    <NoInternetScreen onRetry={() => void refresh()} isRetrying={isRefreshing} />
  ) : (
    <RootNavigator />
  );

  return (
    <>
      {content}
      {isSplashOverlayVisible ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.launchSplashOverlay, splashAnimatedStyle]}
        >
          <LaunchSplashScreen />
        </Animated.View>
      ) : null}
    </>
  );
}

export default function RootLayout() {
  useSessionBootstrap();
  const [isNativeSplashHidden, setIsNativeSplashHidden] = useState(false);
  const [hasCompletedMinimumSplash, setHasCompletedMinimumSplash] = useState(false);

  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (!fontsLoaded || isNativeSplashHidden) {
      return;
    }

    SplashScreen.hideAsync()
      .catch(() => undefined)
      .finally(() => {
        setIsNativeSplashHidden(true);
      });
  }, [fontsLoaded, isNativeSplashHidden]);

  useEffect(() => {
    if (!isNativeSplashHidden) {
      return;
    }

    const timeout = setTimeout(() => {
      setHasCompletedMinimumSplash(true);
    }, 1500);

    return () => {
      clearTimeout(timeout);
    };
  }, [isNativeSplashHidden]);

  if (!fontsLoaded || !isNativeSplashHidden) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <GestureHandlerRootView style={styles.container} className="font-sans">
            <AppStartupGate hasCompletedMinimumSplash={hasCompletedMinimumSplash} />
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
  launchSplashOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});
