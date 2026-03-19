import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import TitleBar from '../components/TitleBar';
import { EmaxLogo } from '../components/EmaxLogo';
import UIButton from '../components/ui/UIButton';
import UITextInput from '../components/ui/UITextInput';
import { cn } from '../utils/cn';

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

  return (
    <div className={cn('min-h-screen flex flex-col', isDark ? 'bg-[#1d1c1d]' : 'bg-[#f8f8f8]')}>
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
            새 계정 만들기
          </p>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
            <div className="flex flex-col gap-1.5">
              <label className={cn('text-[13px] font-semibold', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>
                이름
              </label>
              <UITextInput
                type="text"
                placeholder="이름 입력"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
                className="!px-[14px] !py-[11px] !rounded-[10px]"
              />
            </div>
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
                autoComplete="new-password"
                className="!px-[14px] !py-[11px] !rounded-[10px]"
              />
            </div>
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
              {loading ? '가입 중...' : '회원가입'}
            </UIButton>
          </form>
          <p className={cn('mt-6 text-center text-[13px]', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
            이미 계정이 있으신가요?{' '}
            <Link
              to="/login"
              className={cn('no-underline font-semibold', isDark ? 'text-blue-300' : 'text-blue-500')}
            >
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
