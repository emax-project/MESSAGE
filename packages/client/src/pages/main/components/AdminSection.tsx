import { memo, useState } from 'react';
import { cn } from '../../../utils/cn';
import BulkUserRegisterSection from './BulkUserRegisterSection';
import OrgManageSection from './OrgManageSection';
import UserManageSection from './UserManageSection';

type Props = {
  isDark: boolean;
  isNarrowLayout?: boolean;
  /** 로그인한 관리자 본인 id. 사용자 관리에서 자기 자신을 못 고르게 하는 데 쓴다. */
  currentUserId?: string;
};

type TabKey = 'register' | 'org' | 'users';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'register', label: '사용자 등록' },
  { key: 'org', label: '부서 · 직급' },
  { key: 'users', label: '사용자 관리' },
];

/** 관리자 전용 도구 묶음. 세로로 쌓지 않고 탭으로 나눠 설정 화면이 길어지지 않게 한다. */
function AdminSection({ isDark, isNarrowLayout = false, currentUserId }: Props) {
  const [tab, setTab] = useState<TabKey>('register');

  const sectionBg = isDark ? 'bg-slate-700' : 'bg-slate-50';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={cn('flex flex-col gap-3 rounded-[10px] px-3.5 py-3', sectionBg)}>
      <div>
        <h4 className={cn('m-0 text-sm font-semibold', isDark ? 'text-slate-200' : 'text-slate-800')}>
          관리자
        </h4>
        <p className={cn('mt-1 mb-0 text-xs leading-relaxed', muted)}>
          관리자 계정에만 보이는 기능입니다.
        </p>
      </div>

      <div
        role="tablist"
        className={cn(
          'flex gap-1 rounded-lg p-1',
          isDark ? 'bg-slate-800' : 'bg-slate-200/60',
        )}
      >
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 whitespace-nowrap rounded-md border-none px-2 py-2 text-[12.5px] font-semibold cursor-pointer',
              isNarrowLayout && 'min-h-[40px]',
              tab === key
                ? isDark
                  ? 'bg-slate-600 text-slate-100'
                  : 'bg-white text-slate-900 shadow-sm'
                : cn('bg-transparent', muted),
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'register' && (
        <BulkUserRegisterSection isDark={isDark} isNarrowLayout={isNarrowLayout} embedded />
      )}
      {tab === 'org' && <OrgManageSection isDark={isDark} isNarrowLayout={isNarrowLayout} embedded />}
      {tab === 'users' && (
        <UserManageSection
          isDark={isDark}
          isNarrowLayout={isNarrowLayout}
          currentUserId={currentUserId}
          embedded
        />
      )}
    </div>
  );
}

export default memo(AdminSection);
