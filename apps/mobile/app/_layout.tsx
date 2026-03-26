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

export default function RootLayout() {
  useSessionBootstrap();

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <GestureHandlerRootView style={styles.container}>
            <SheetProvider>
              <Sheets />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(auth)" />
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
  },
});
