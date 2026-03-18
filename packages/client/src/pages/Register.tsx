import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import TitleBar from '../components/TitleBar';
import UIButton from '../components/ui/UIButton';
import UITextInput from '../components/ui/UITextInput';
import { getThemeTokens } from '../components/ui/themeTokens';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const isDark = useThemeStore((s) => s.isDark);
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI?.windowResize?.(960, 700);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await authApi.register(email, password, name);
      setAuth(user, token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입 실패');
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
            <div style={s.logo}>E</div>
          </div>
          <h1 style={s.title}>EMAX</h1>
          <p style={s.subtitle}>새 계정 만들기</p>
          <form onSubmit={handleSubmit} style={s.form}>
            <div style={s.fieldGroup}>
              <label style={s.label}>이름</label>
              <UITextInput
                type="text"
                placeholder="이름 입력"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={s.input as React.CSSProperties}
                autoComplete="name"
              />
            </div>
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
                autoComplete="new-password"
              />
            </div>
            {error && <p style={s.error}>{error}</p>}
            <UIButton type="submit" disabled={loading} variant="primary" style={s.button as React.CSSProperties}>
              {loading ? '가입 중...' : '회원가입'}
            </UIButton>
          </form>
          <p style={s.footer}>
            이미 계정이 있으신가요? <Link to="/login" style={s.link}>로그인</Link>
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
      width: 48,
      height: 48,
      borderRadius: 12,
      background: '#475569',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 22,
      fontWeight: 800,
      letterSpacing: '-0.02em',
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
