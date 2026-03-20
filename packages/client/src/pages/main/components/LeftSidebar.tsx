import { memo } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import UserAvatar from '../../../components/UserAvatar';
import { EmaxLogo } from '../../../components/EmaxLogo';
import UICloseButton from '../../../components/ui/UICloseButton';
import RoomSections, { type RoomSectionsProps } from './RoomSections';
import { cn } from '../../../utils/cn';

type LeftSidebarUser = {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
} | null | undefined;

type LeftSidebarProps = RoomSectionsProps & {
  isDark: boolean;
  user: LeftSidebarUser;
  statusInput: string;
  statusLabel: string;
  showStatusBadge: boolean;
  statusBadge: ReactNode;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  onNavigateHome: () => void;
};

function LeftSidebar({
  isDark,
  user,
  statusInput,
  statusLabel,
  showStatusBadge,
  statusBadge,
  searchQuery,
  setSearchQuery,
  onNavigateHome,
  ...roomSectionsProps
}: LeftSidebarProps) {
  return (
    <div className={cn(
      'w-[260px] shrink-0 flex flex-col border-r',
      isDark ? 'bg-slate-800 border-r-slate-600' : 'bg-white border-r-slate-200',
    )}>
      <div className={cn(
        'shrink-0 h-[46px] flex items-center justify-between px-4 border-b',
        isDark ? 'bg-slate-800 border-b-slate-600' : 'bg-white border-b-slate-200',
      )}>
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2 border-none bg-transparent p-0 m-0 cursor-pointer"
          title="대시보드로 이동"
        >
          <EmaxLogo variant={isDark ? 'light' : 'accent'} size="lg" />
        </button>
      </div>

      <div className={cn(
        'shrink-0 flex items-center gap-2.5 px-4 py-2.5 border-b',
        isDark ? 'border-b-slate-600' : 'border-b-slate-200',
      )}>
        <div className="relative shrink-0">
          <div className={cn(
            'w-[34px] h-[34px] rounded-[10px] shrink-0 flex items-center justify-center overflow-hidden',
            isDark ? 'bg-[#475569]' : 'bg-[#e2e8f0]',
          )}>
            {user?.avatarUrl ? (
              <UserAvatar
                userId={user.id}
                name={user.name || ''}
                avatarUrlPath={user.avatarUrl}
                imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 10 }}
                initialStyle={{ fontSize: 13, fontWeight: 700, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' }}
              />
            ) : (
              <span className={cn(
                'text-[13px] font-bold',
                isDark ? 'text-[#e2e8f0]' : 'text-[#3c1e1ed9]',
              )}>
                {user?.name?.trim()[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          {showStatusBadge && (
            <span
              className="absolute -top-0.5 -right-0.5 block rounded-full leading-[0]"
              style={{ border: `1.5px solid ${isDark ? '#1e293b' : '#f1f5f9'}` }}
            >
              {statusBadge}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className={cn(
            'text-[13px] font-semibold overflow-hidden text-ellipsis whitespace-nowrap',
            isDark ? 'text-slate-200' : 'text-slate-900',
          )}>
            {user?.name || '사용자'}
          </div>
          {statusInput && (
            <div className={cn(
              'text-[11px] overflow-hidden text-ellipsis whitespace-nowrap',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}>
              {statusLabel}
            </div>
          )}
        </div>
      </div>

      <div className={cn(
        'shrink-0 flex items-center px-3 py-2 border-b',
        isDark ? 'border-b-slate-600' : 'border-b-slate-200',
      )}>
        <input
          type="text"
          placeholder="대화방 검색"
          aria-label="대화방 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={cn(
            'flex-1 px-2 py-1.5 border-none rounded-[6px] text-[13px] outline-none min-w-0',
            isDark ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-900',
          )}
        />
        {searchQuery.trim().length > 0 && (
          <UICloseButton
            size="sm"
            variant="subtle"
            onClick={() => setSearchQuery('')}
            className="ml-1"
            aria-label="검색어 지우기"
            title="검색어 지우기"
          />
        )}
      </div>

      <RoomSections
        isDark={isDark}
        {...roomSectionsProps}
      />
    </div>
  );
}

export default memo(LeftSidebar);
