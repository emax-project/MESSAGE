import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from './api';

type AuthState = {
  user: User | null;
  token: string | null;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        if (token) localStorage.setItem('token', token);
        else localStorage.removeItem('token');
        set({ user, token });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
    }),
    { name: 'auth' }
  )
);

type ThemeState = {
  isDark: boolean;
  toggleDark: () => void;
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      isDark: false,
      toggleDark: () => set((s) => ({ isDark: !s.isDark })),
    }),
    { name: 'theme' }
  )
);
