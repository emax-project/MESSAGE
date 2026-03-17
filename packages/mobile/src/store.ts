import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { User } from '@emax/shared';
import { authApi } from './api';

const asyncStorage = {
  getItem: async (name: string) => AsyncStorage.getItem(name),
  setItem: async (name: string, value: string) => AsyncStorage.setItem(name, value),
  removeItem: async (name: string) => AsyncStorage.removeItem(name),
};

type AuthState = {
  user: User | null;
  token: string | null;
  _hasHydrated: boolean;
  setAuth: (user: User | null, token: string | null) => void;
  logout: () => void;
  setHasHydrated: (v: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      _hasHydrated: false,
      setAuth: (user, token) => set({ user, token }),
      logout: () => {
        authApi.logout().catch(() => {});
        set({ user: null, token: null });
      },
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => asyncStorage),
      partialize: (s) => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => () => {
        useAuthStore.getState().setHasHydrated(true);
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
    {
      name: 'theme',
      storage: createJSONStorage(() => asyncStorage),
    }
  )
);

/** 현재 보고 있는 채팅방 ID (로컬 알림 표시 여부 판단용) */
type ViewingRoomState = {
  viewingRoomId: string | null;
  setViewingRoomId: (id: string | null) => void;
};

export const useViewingRoomStore = create<ViewingRoomState>((set) => ({
  viewingRoomId: null,
  setViewingRoomId: (id) => set({ viewingRoomId: id }),
}));
