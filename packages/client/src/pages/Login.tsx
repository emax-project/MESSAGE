import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, getBaseUrl, setBaseUrl } from '../api';
import { useAuthStore } from '../store';
import TitleBar from '../components/TitleBar';
import { AuthCard } from '../components/AuthCard';
import UITextInput from '../components/ui/UITextInput';

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverUrl, setServerUrl] = useState(() => getBaseUrl() || 'http://203.254.98.92:3001');
  const setAuth = useAuthStore((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    window.electronAPI?.windowResize?.(1000, 640);
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

  return (
    <div className="w-full min-h-screen flex flex-col bg-black">
      {isElectron && <TitleBar title="EMAX" isDark />}
      <div className="flex-1 flex items-center justify-center p-6">
        <AuthCard
          title="로그인"
          subtext={
            <>
              계정이 없으신가요?{' '}
              <Link to="/register" className="text-brand font-semibold no-underline hover:underline">
                회원가입
              </Link>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <div className="relative">
              <UITextInput
                type="email"
                placeholder="이메일 주소"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="!px-4 !py-3 !rounded-xl !border !border-[#e2e8f0] !bg-[#f8fafc] !text-black placeholder:!text-[#94a3b8]"
              />
            </div>
            <div className="relative">
              <UITextInput
                type={showPassword ? 'text' : 'password'}
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="!px-4 !py-3 !pr-12 !rounded-xl !border !border-[#e2e8f0] !bg-[#f8fafc] !text-black placeholder:!text-[#94a3b8]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-[#334155] p-1"
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {isElectron && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-[#64748b]">서버 주소</label>
                <UITextInput
                  type="url"
                  placeholder="http://203.254.98.92:3001"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  onBlur={() => { if (serverUrl.trim()) setBaseUrl(serverUrl.trim()); }}
                  className="!px-4 !py-3 !rounded-xl !border !border-[#e2e8f0] !bg-[#f8fafc] !text-black placeholder:!text-[#94a3b8]"
                />
              </div>
            )}
            {error && (
              <p className="px-3 py-2 rounded-xl text-[13px] text-red-600 bg-red-50/80">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full bg-black text-white font-semibold text-[15px] disabled:opacity-60 transition-opacity"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>
        </AuthCard>
      </div>
    </div>
  );
}
