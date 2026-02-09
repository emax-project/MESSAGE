import { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store';
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
  const logout = useAuthStore((s) => s.logout);
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
    </Router>
  );
}
