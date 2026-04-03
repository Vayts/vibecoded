import { useCallback, useEffect, useState } from 'react';
import * as Network from 'expo-network';

interface NetworkStatusState {
  isConnected: boolean | null;
  isRefreshing: boolean;
}

export function useNetworkStatus() {
  const [state, setState] = useState<NetworkStatusState>({
    isConnected: null,
    isRefreshing: true,
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, isRefreshing: true }));

    try {
      const nextState = await Network.getNetworkStateAsync();
      setState({
        isConnected: nextState.isConnected === true,
        isRefreshing: false,
      });
    } catch {
      setState({
        isConnected: true,
        isRefreshing: false,
      });
    }
  }, []);

  useEffect(() => {
    void refresh();

    const subscription = Network.addNetworkStateListener((nextState) => {
      setState({
        isConnected: nextState.isConnected === true,
        isRefreshing: false,
      });
    });

    return () => {
      subscription.remove();
    };
  }, [refresh]);

  return {
    isConnected: state.isConnected,
    isRefreshing: state.isRefreshing,
    refresh,
  };
}