import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import '../global.css';
import { SheetProvider } from 'react-native-actions-sheet';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { useSessionBootstrap } from '../shared/hooks/useSessionBootstrap';
import { Sheets } from '../shared/components/Sheets/Sheets';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Toasts } from '@backpackapp-io/react-native-toast';

export default function RootLayout() {
  useSessionBootstrap();

  return (
    <KeyboardProvider>
      <GestureHandlerRootView style={styles.container}>
        <SheetProvider>
          <Sheets />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
          <StatusBar style="auto" />
        </SheetProvider>
        <Toasts overrideDarkMode />
      </GestureHandlerRootView>
    </KeyboardProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
