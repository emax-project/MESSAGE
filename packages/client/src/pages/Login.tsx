import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, getBaseUrl, setBaseUrl } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import TitleBar from '../components/TitleBar';
import { EmaxLogo } from '../components/EmaxLogo';
import UIButton from '../components/ui/UIButton';
import UITextInput from '../components/ui/UITextInput';
import { cn } from '../utils/cn';

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

  return (
    <div className={cn('w-full min-h-screen flex flex-col', isDark ? 'bg-[#1d1c1d]' : 'bg-[#f8f8f8]')}>
      {isElectron && <TitleBar title="EMAX" isDark={isDark} />}
      <div className="flex-1 flex items-center justify-center p-6">
        <div
          className={cn(
            'flex flex-col items-center pt-12 px-10 pb-10 rounded-2xl w-full max-w-[400px] border',
            isDark ? 'bg-[#222529] border-[#3a3f46] shadow-[0_8px_32px_rgba(0,0,0,0.3)]' : 'bg-white border-[#dde1e6] shadow-[0_8px_32px_rgba(0,0,0,0.08)]',
          )}
        >
          <div className="mb-[18px]">
            <EmaxLogo variant={isDark ? 'light' : 'accent'} size="lg" />
          </div>
          <p className={cn('mb-7 text-sm', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
            업무 메신저에 로그인
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>
                이메일
              </label>
              <UITextInput
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="!px-[14px] !py-[11px] !rounded-[10px]"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>
                비밀번호
              </label>
              <UITextInput
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="!px-[14px] !py-[11px] !rounded-[10px]"
              />
            </div>
            {isElectron && (
              <div className="flex flex-col gap-1.5">
                <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>
                  서버 주소
                </label>
                <UITextInput
                  type="url"
                  placeholder="http://203.254.98.92:3001"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  onBlur={() => { if (serverUrl.trim()) setBaseUrl(serverUrl.trim()); }}
                  className="!px-[14px] !py-[11px] !rounded-[10px]"
                />
                <p className={cn('mt-1 text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
                  예: http://203.254.98.92:3001
                </p>
              </div>
            )}
            {error && (
              <p className={cn(
                'px-3 py-2 rounded-lg text-[13px] leading-relaxed text-red-500',
                isDark ? 'bg-red-500/15' : 'bg-red-500/[0.08]',
              )}>
                {error}
              </p>
            )}
            <UIButton
              type="submit"
              disabled={loading}
              variant="primary"
              className="mt-1 !px-4 !py-3 !text-[15px] !font-bold"
            >
              {loading ? '로그인 중...' : '로그인'}
            </UIButton>
          </form>
          <p className={cn('mt-6 text-center text-[13px]', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
            계정이 없으신가요?{' '}
            <Link
              to="/register"
              className={cn('no-underline font-semibold', isDark ? 'text-blue-300' : 'text-blue-500')}
            >
              회원가입
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
