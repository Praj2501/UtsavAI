import { create } from 'zustand';
import {
  AuthUser,
  signInWithGoogle,
  signOutUser,
  subscribeToAuthState,
  handleRedirectResult,
} from '../services/auth.service';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  initAuth: () => () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  initAuth: () => {
    set({ isLoading: true });
    handleRedirectResult()
      .then((res) => {
        if (!res.ok) {
          set({ error: res.error.message, isLoading: false });
        } else if (res.value) {
          set({ user: res.value, isLoading: false, error: null });
        }
      })
      .catch(() => {});

    const unsubscribe = subscribeToAuthState((user) => {
      set({ user, isLoading: false, error: null });
    });
    return unsubscribe;
  },

  signIn: async () => {
    set({ isLoading: true, error: null });
    const res = await signInWithGoogle();
    if (res.ok) {
      set({ user: res.value, isLoading: false, error: null });
    } else {
      set({ error: res.error.message, isLoading: false });
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null });
    await signOutUser();
    set({ user: null, isLoading: false });
  },

  clearError: () => set({ error: null }),
}));
