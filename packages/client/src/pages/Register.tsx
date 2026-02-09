import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore } from '../store';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as { electronAPI?: { windowResize?: (w: number, h: number) => void } }).electronAPI?.windowResize) {
      (window as unknown as { electronAPI: { windowResize: (w: number, h: number) => void } }).electronAPI.windowResize(420, 520);
    }
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

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>04 Message</h1>
        <p style={styles.subtitle}>회원가입</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="text"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={styles.input}
            autoComplete="name"
          />
          <input
            type="email"
            placeholder="이메일"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
            autoComplete="email"
          />
          <input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={styles.input}
            autoComplete="new-password"
          />
          {error && <p style={styles.error}>{error}</p>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? '가입 중...' : '회원가입'}
          </button>
        </form>
        <p style={styles.footer}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#abc1d1',
  },
  card: {
    background: '#fff',
    padding: 40,
    borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
    width: '100%',
    maxWidth: 360,
  },
  title: { margin: '0 0 8px', fontSize: 24, fontWeight: 700, color: '#3c1e1e' },
  subtitle: { margin: '0 0 24px', color: '#666', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px',
    border: '1px solid #e0e0e0',
    borderRadius: 10,
    fontSize: 15,
  },
  error: { margin: 0, color: '#c00', fontSize: 13 },
  button: {
    padding: 14,
    background: '#fae100',
    color: '#3c1e1e',
    border: 'none',
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 8,
  },
  footer: { marginTop: 20, textAlign: 'center', fontSize: 14, color: '#666' },
};
