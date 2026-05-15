import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

export const useBarcodeScannerAppState = (onActive?: () => void) => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (appState === 'active') {
      onActive?.();
    }
  }, [appState, onActive]);

  return {
    appState,
    isAppActive: appState === 'active',
  };
};

