import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, getBaseUrl, setBaseUrl } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import TitleBar from '../components/TitleBar';
import UIButton from '../components/ui/UIButton';
import UITextInput from '../components/ui/UITextInput';
import { getThemeTokens } from '../components/ui/themeTokens';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => getBaseUrl() || 'http://203.254.98.92:3001');
  const setAuth = useAuthStore((s) => s.setAuth);
  const isDark = useThemeStore((s) => s.isDark);
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI?.windowResize?.(960, 700);
  }, []);
  useEffect(() => {
    setServerUrl(getBaseUrl() || '');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (serverUrl.trim()) setBaseUrl(serverUrl.trim());
    setLoading(true);
    try {
      const { user, token } = await authApi.login(email, password);
      setAuth(user, token);
      window.electronAPI?.showNotification('로그인', `${user.name}님 로그인되었습니다.`);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      const isNetwork = /fetch|network|connection|refused/i.test(msg) || msg === '';
      setError(isNetwork ? '서버에 연결할 수 없습니다. 아래에서 서버 주소를 확인·수정 후 다시 시도해 주세요.' : msg || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  const isElectron = !!window.electronAPI;
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
              <UITextInput
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={s.input as React.CSSProperties}
                autoComplete="email"
              />
            </div>
            <div style={s.fieldGroup}>
              <label style={s.label}>비밀번호</label>
              <UITextInput
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={s.input as React.CSSProperties}
                autoComplete="current-password"
              />
            </div>
            {isElectron && (
              <div style={s.fieldGroup}>
                <label style={s.label}>서버 주소</label>
                <UITextInput
                  type="url"
                  placeholder="http://203.254.98.92:3001"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  style={s.input as React.CSSProperties}
                  onBlur={() => { if (serverUrl.trim()) setBaseUrl(serverUrl.trim()); }}
                />
                <p style={s.hint}>예: http://203.254.98.92:3001</p>
              </div>
            )}
            {error && <p style={s.error}>{error}</p>}
            <UIButton type="submit" disabled={loading} variant="primary" style={s.button as React.CSSProperties}>
              {loading ? '로그인 중...' : '로그인'}
            </UIButton>
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
  const t = getThemeTokens(isDark);
  return {
    container: {
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: t.bgBase,
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
      background: t.bgSurface,
      padding: '48px 40px 40px',
      borderRadius: 16,
      boxShadow: isDark
        ? '0 8px 32px rgba(0,0,0,0.3)'
        : '0 8px 32px rgba(0,0,0,0.08)',
      width: '100%',
      maxWidth: 400,
      border: `1px solid ${t.border}`,
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
      color: t.textStrong,
    },
    subtitle: {
      margin: '0 0 28px',
      color: t.textMuted,
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
      color: t.text,
    },
    input: {
      padding: '11px 14px',
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      fontSize: 14,
      background: t.bgMuted,
      color: t.text,
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
    hint: {
      margin: '4px 0 0',
      fontSize: 12,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    button: {
      padding: '12px 16px',
      borderRadius: 10,
      fontSize: 15,
      fontWeight: 700,
      marginTop: 4,
    },
    footer: {
      marginTop: 24,
      textAlign: 'center',
      fontSize: 13,
      color: t.textMuted,
    },
    link: {
      color: isDark ? '#93c5fd' : '#3b82f6',
      textDecoration: 'none',
      fontWeight: 600,
    },
  };
}
