import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, BASE } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import TitleBar from '../components/TitleBar';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const isDark = useThemeStore((s) => s.isDark);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { windowResize?: (w: number, h: number) => void } }).electronAPI?.windowResize) {
      (window as unknown as { electronAPI: { windowResize: (w: number, h: number) => void } }).electronAPI.windowResize(960, 700);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await authApi.login(email, password);
      setAuth(user, token);
      if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { showNotification?: (a: string, b: string) => void } }).electronAPI?.showNotification) {
        (window as unknown as { electronAPI: { showNotification: (a: string, b: string) => void } }).electronAPI.showNotification('로그인', `${user.name}님 로그인되었습니다.`);
      }
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isNetwork = /fetch|network|connection|refused/i.test(msg) || msg === '';
      setError(
        isNetwork
          ? `서버에 연결할 수 없습니다. (접속 주소: ${BASE}) 백엔드 서버가 실행 중인지, 방화벽/네트워크를 확인해 주세요.`
          : msg || '로그인 실패'
      );
    } finally {
      setLoading(false);
    }
  };

  const isElectron = typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI;
  const s = getStyles(isDark);

  return (
    <div style={s.container}>
      {isElectron && <TitleBar title="EMAX" isDark={isDark} />}
      <div style={s.body}>
        <div style={s.card}>
          <div style={s.logoWrap}>
            <img src={`${import.meta.env.BASE_URL}emax-logo.png?v=5`} alt="EMAX" style={s.logo} />
          </div>
          <h1 style={s.title}>EMAX</h1>
          <p style={s.subtitle}>업무 메신저에 로그인</p>
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>이메일</label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={s.input}
                autoComplete="email"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>비밀번호</label>
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={s.input}
                autoComplete="current-password"
              />
            </div>
            {error && <p style={s.error}>{error}</p>}
            <button type="submit" disabled={loading} style={{
              ...s.button,
              ...(loading ? { opacity: 0.7, cursor: 'not-allowed' } : {}),
            }}>
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
          <p style={s.footer}>
            계정이 없으신가요? <Link to="/register" style={s.link}>회원가입</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  return {
    container: {
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: isDark ? '#0f172a' : '#f1f5f9',
    },
    body: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: isDark ? '#1e293b' : '#fff',
      padding: '48px 40px 40px',
      borderRadius: 16,
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.3)'
        : '0 8px 32px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: 400,
      border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
    },
    logoWrap: {
      marginBottom: 16,
    },
    logo: {
      width: 72,
      height: 72,
      objectFit: 'contain',
      display: 'block',
      background: 'transparent',
    },
    title: {
      margin: '0 0 4px',
      fontSize: 22,
      fontWeight: 700,
      color: isDark ? '#f1f5f9' : '#0f172a',
    },
    subtitle: {
      margin: '0 0 28px',
      color: isDark ? '#94a3b8' : '#64748b',
      fontSize: 14,
    },
    form: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      width: '100%',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    },
    label: {
      fontSize: 13,
      fontWeight: 600,
      color: isDark ? '#cbd5e1' : '#475569',
    },
    input: {
      padding: '11px 14px',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      borderRadius: 10,
      fontSize: 14,
      background: isDark ? '#0f172a' : '#f8fafc',
      color: isDark ? '#e2e8f0' : '#1e293b',
      outline: 'none',
      transition: 'border-color 0.15s',
    },
    error: {
      margin: 0,
      padding: '8px 12px',
      background: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
      borderRadius: 8,
      color: '#ef4444',
      fontSize: 13,
      lineHeight: 1.5,
    },
    button: {
      padding: '12px 16px',
      background: '#475569',
      color: '#fff',
      border: 'none',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 700,
      cursor: 'pointer',
      transition: 'background 0.15s',
      marginTop: 4,
    },
    footer: {
      marginTop: 24,
      textAlign: 'center',
      fontSize: 13,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    link: {
      color: isDark ? '#93c5fd' : '#3b82f6',
      textDecoration: 'none',
      fontWeight: 600,
    },
  };
}
