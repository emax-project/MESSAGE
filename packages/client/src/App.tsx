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

  // Electron: 첫 페인트 후 창 표시 (첫 실행 흰 화면 방지). Windows 첫 실행 시 타이밍 이슈 대비 백업 호출
  useEffect(() => {
    const api = (window as unknown as { electronAPI?: { notifyAppReady?: () => void; sendDebugLog?: (p: { message: string; data?: object; hypothesisId?: string }) => void } }).electronAPI;
    // #region agent log
    const log = (message: string, data?: object, hypothesisId?: string) => {
      if (api?.sendDebugLog) api.sendDebugLog({ message, data, hypothesisId });
      else fetch('http://127.0.0.1:7244/ingest/b7631e9b-8e84-4b47-8cc8-d7cb99d830c8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'App.tsx', message, data: data || {}, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
    };
    log('App notifyAppReady useEffect ran', { hasApi: !!api, hasNotifyAppReady: !!api?.notifyAppReady }, 'A');
    // #endregion
    if (!api?.notifyAppReady) return;
    const sendReady = () => {
      // #region agent log
      log('notifyAppReady called', {}, 'A');
      // #endregion
      api.notifyAppReady!();
    };
    requestAnimationFrame(() => {
      requestAnimationFrame(sendReady);
    });
    const backup = setTimeout(sendReady, 250);
    return () => clearTimeout(backup);
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
