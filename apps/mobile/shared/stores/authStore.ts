import { create } from 'zustand';
import * as authClient from '../lib/auth/client';
import type { AuthUser } from '../lib/auth/client';
import { queryClient } from '../lib/query/queryClient';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const session = await authClient.getSession();
      set({ user: session?.user ?? null, isInitialized: true });
    } catch {

      console.error('Failed to initialize auth store');

      set({ user: null, isInitialized: true });
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authClient.signUp(name, email, password);
      set({ user: session.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign-up failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const session = await authClient.signIn(email, password);
      set({ user: session.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Sign-in failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authClient.signInWithGoogle();
      set({ user: session.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Google sign-in failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true, error: null });
    try {
      const session = await authClient.signInWithApple();
      set({ user: session.user });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Apple sign-in failed' });
      throw err;
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      await authClient.signOut();
      queryClient.clear();
      set({ user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  setUser: (user) => set({ user }),

  clearError: () => set({ error: null }),
}));
