import { useEffect, useState, Component, type ReactNode } from 'react';
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

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(err: Error) { return { error: err }; }
  componentDidCatch(err: Error, info: React.ErrorInfo) { console.error('App ErrorBoundary:', err, info); }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, background: '#fff', color: '#1e293b', minHeight: '100vh' }}>
          <h2 style={{ color: '#dc2626' }}>오류가 발생했습니다</h2>
          <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', fontSize: 13 }}>
            {this.state.error.toString()}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
      .catch((err) => {
        // 401은 api.ts의 handleForcedLogout이 자동 처리
        // 네트워크 오류 등 일시적 실패는 조용히 무시
        if (!(err instanceof Error && err.message === 'Unauthorized')) {
          console.warn('[auth/me] 사용자 정보 갱신 실패:', err.message);
        }
      });
  }, [token, setAuth]);

  useEffect(() => {
    if (!window.electronAPI?.onLogout) return;
    const unsubscribe = window.electronAPI.onLogout(() => {
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

  // Electron: React 마운트 완료 후 main process에 창 표시 신호 전송
  // requestAnimationFrame은 숨겨진 창에서 throttle되므로 setTimeout 사용
  useEffect(() => {
    if (!window.electronAPI?.notifyAppReady) return;
    const t = setTimeout(() => {
      window.electronAPI!.notifyAppReady();
    }, 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh', width: '100%' }}>
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
      </div>
    </ErrorBoundary>
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
