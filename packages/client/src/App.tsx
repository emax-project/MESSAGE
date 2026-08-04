import { useEffect, useState, Component, lazy, Suspense, type ReactNode } from 'react';
import { useThemeStore } from './store';
import { BrowserRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
import { authApi } from './api';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Main = lazy(() => import('./pages/Main'));
const ChatWindow = lazy(() => import('./pages/ChatWindow'));
const KanbanPage = lazy(() => import('./pages/KanbanPage'));
const GanttPage = lazy(() => import('./pages/GanttPage'));

/** 메인/인증 화면: PC에서도 모바일 maxWidth로 중앙 정렬. 칸반·간트·독립 채팅 창은 전체 폭. */
function MobileShell({ children }: { children: ReactNode }) {
  return <div className="app-mobile-shell">{children}</div>;
}

// Electron: MemoryRouter 사용 (URL을 전혀 건드리지 않음 → file://C:/login ERR_FILE_NOT_FOUND 근본 차단)
// HashRouter/BrowserRouter는 file:// 에서 History API 제한으로 전체 페이지 이동 발생
const isElectron = typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

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
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{ marginTop: 16, padding: '10px 20px', background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          >
            새로고침
          </button>
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

  // Electron: API 401 시 handleForcedLogout이 emax-force-logout 이벤트 발송 → logout() 호출
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('emax-force-logout', handler);
    return () => window.removeEventListener('emax-force-logout', handler);
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

  const initialPath = typeof window !== 'undefined' && window.location.hash
    ? window.location.hash.slice(1) || '/'
    : '/';
  const routerProps = isElectron ? { initialEntries: [initialPath], initialIndex: 0 } : {};
  const RouterWrapper = isElectron ? MemoryRouter : BrowserRouter;

  const fallback = (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#94a3b8', fontSize: 15 }}>
      로딩 중...
    </div>
  );

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: '100%', width: '100%', overflow: 'hidden' }}>
        <RouterWrapper {...routerProps}>
          <Suspense fallback={fallback}>
          <Routes>
        <Route path="/login" element={<MobileShell><Login /></MobileShell>} />
        <Route path="/register" element={<MobileShell><Register /></MobileShell>} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MobileShell><Main /></MobileShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <PrivateRoute>
              <MobileShell><Main /></MobileShell>
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
          </Suspense>
        {forcedLogoutMsg && (
        <div style={toastStyle(isDark, true)}>
          <span style={toastIconStyle(isDark)}>⚠</span>
          <span>{forcedLogoutMsg}</span>
        </div>
      )}
        </RouterWrapper>
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
