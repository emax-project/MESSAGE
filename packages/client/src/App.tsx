import { useEffect, useState } from 'react';
import { useThemeStore } from './store';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { authApi } from './api';
import Login from './pages/Login';
import Register from './pages/Register';
import Main from './pages/Main';
import ChatWindow from './pages/ChatWindow';
import KanbanPage from './pages/KanbanPage';
import GanttPage from './pages/GanttPage';

const isFileProtocol = typeof window !== 'undefined' && window.location?.protocol === 'file:';
const Router = isFileProtocol ? HashRouter : BrowserRouter;

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const logout = useAuthStore((s) => s.logout);
  const [forcedLogoutMsg, setForcedLogoutMsg] = useState<string | null>(null);
  const isDark = useThemeStore((s) => s.isDark);

  useEffect(() => {
    if (!token) return;
    authApi.me()
      .then(({ user }) => setAuth(user, token))
      .catch(() => {});
  }, [token, setAuth]);

  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { onLogout?: (cb: () => void) => () => void } }).electronAPI;
    if (!api?.onLogout) return;
    const unsubscribe = api.onLogout(() => {
      logout();
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [logout]);

  useEffect(() => {
    try {
      const msg = localStorage.getItem('forcedLogoutMessage');
      if (msg) {
        localStorage.removeItem('forcedLogoutMessage');
        setForcedLogoutMsg(msg);
        setTimeout(() => setForcedLogoutMsg(null), 3000);
      }
    } catch {
      // ignore
    }
  }, []);

  // Electron: 첫 페인트 후 창 표시 (첫 실행 흰 화면 방지)
  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { notifyAppReady?: () => void } }).electronAPI;
    if (!api?.notifyAppReady) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        api.notifyAppReady();
      });
    });
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Main />
            </PrivateRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <PrivateRoute>
              <Main />
            </PrivateRoute>
          }
        />
        <Route
          path="/chat/:roomId"
          element={
            <PrivateRoute>
              <ChatWindow />
            </PrivateRoute>
          }
        />
        <Route
          path="/kanban/:roomId"
          element={
            <PrivateRoute>
              <KanbanPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/gantt/:roomId"
          element={
            <PrivateRoute>
              <GanttPage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {forcedLogoutMsg && (
        <div style={toastStyle(isDark, true)}>
          <span style={toastIconStyle(isDark)}>⚠</span>
          <span>{forcedLogoutMsg}</span>
        </div>
      )}
    </Router>
  );
}

const toastStyle = (dark: boolean, fading: boolean): React.CSSProperties => ({
  position: 'fixed',
  bottom: 16,
  left: '50%',
  transform: 'translateX(-50%)',
  background: dark ? '#e2e8f0' : '#0f172a',
  color: dark ? '#0f172a' : '#fff',
  padding: '10px 14px',
  borderRadius: 999,
  fontSize: 12,
  boxShadow: dark ? '0 6px 18px rgba(0,0,0,0.25)' : '0 6px 18px rgba(0,0,0,0.2)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  animation: fading ? 'toast-slide 220ms ease-out, toast-fade 220ms ease-in 2.7s' : 'toast-slide 220ms ease-out',
  zIndex: 100000,
});

const toastIconStyle = (dark: boolean): React.CSSProperties => ({
  fontSize: 13,
  color: dark ? '#0f172a' : '#f8fafc',
  lineHeight: 1,
});
