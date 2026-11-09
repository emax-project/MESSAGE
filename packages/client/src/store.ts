import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, type User } from './api';
import { getStoredToken, removeStoredToken, setStoredToken } from './utils/authSession';

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
        if (token) setStoredToken(token);
        else removeStoredToken();
        set({ user, token });
      },
      logout: () => {
        authApi.logout().catch(() => {});
        removeStoredToken();
        set({ user: null, token: null });
      },
    }),
    {
      name: 'auth',
      // token은 암호화 저장소(authSession)가 단일 소스 — persist(localStorage 'auth')에
      // 평문으로 남지 않도록 저장 대상에서 제외하고, 복원 시 거기서 다시 읽는다.
      partialize: (state) => ({ user: state.user }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<AuthState> | undefined;
        const token = getStoredToken();
        if (!token) return { ...current, user: null, token: null };
        return { ...current, ...saved, token };
      },
    }
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
