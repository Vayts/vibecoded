import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export function useSessionBootstrap() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    initialize().catch(() => undefined);
  }, [initialize]);
}
