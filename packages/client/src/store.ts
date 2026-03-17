import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type User } from './api';

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
        authApi.logout().catch(() => {});
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

// Toast
type Toast = {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error';
};

type ToastState = {
  toasts: Toast[];
  show: (message: string, type?: Toast['type']) => void;
  remove: (id: number) => void;
};

let toastIdCounter = 1;

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  show: (message, type = 'info') => {
    const id = toastIdCounter++;
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 3500);
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
