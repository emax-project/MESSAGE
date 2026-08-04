import { memo } from 'react';
import type { Dispatch, MouseEvent, ReactNode, SetStateAction } from 'react';
import type { OrgCompany, OrgUser } from '../../../api';
import UserAvatar from '../../../components/UserAvatar';
import { EmaxLogo } from '../../../components/EmaxLogo';
import UICloseButton from '../../../components/ui/UICloseButton';
import OrgTree from './OrgTree';
import { cn } from '../../../utils/cn';

type LeftSidebarUser = {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
} | null | undefined;

type LeftSidebarProps = {
  isDark: boolean;
  user: LeftSidebarUser;
  statusInput: string;
  statusLabel: string;
  showStatusBadge: boolean;
  statusBadge: ReactNode;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  onNavigateHome: () => void;
  onClose?: () => void;
  showOnlineOnly: boolean;
  onToggleOnlineOnly: () => void;
  orgLoading: boolean;
  orgError: boolean;
  orgTree: OrgCompany[];
  treeOpen: Record<string, boolean>;
  orgStarred: Set<string>;
  onToggleOrgStar: (id: string) => void;
  onlineUserIds: Set<string>;
  myId?: string;
  myEmail?: string;
  socketConnected: boolean;
  onRetryOrg: () => void;
  onToggleTree: (key: string) => void;
  onOpenDirectMessage: (userId: string) => void | Promise<void>;
  onUserContextMenu: (e: MouseEvent<HTMLButtonElement>, user: OrgUser) => void;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
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
  onClose,
  showOnlineOnly,
  onToggleOnlineOnly,
  orgLoading,
  orgError,
  orgTree,
  treeOpen,
  orgStarred,
  onToggleOrgStar,
  onlineUserIds,
  myId,
  myEmail,
  socketConnected,
  onRetryOrg,
  onToggleTree,
  onOpenDirectMessage,
  onUserContextMenu,
  hasStatusIcon,
  renderStatusIcon,
}: LeftSidebarProps) {
  return (
    <div className={cn(
      'w-full h-full flex flex-col border-r',
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
        {onClose && (
          <UICloseButton
            size="sm"
            variant="subtle"
            onClick={onClose}
            aria-label="조직도 닫기"
            title="닫기"
          />
        )}
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
        'shrink-0 flex items-center gap-2 px-3 py-2 border-b',
        isDark ? 'border-b-slate-600' : 'border-b-slate-200',
      )}>
        <input
          type="text"
          placeholder="이름 검색"
          aria-label="멤버 이름 검색"
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
            aria-label="검색어 지우기"
            title="검색어 지우기"
          />
        )}
        <button
          type="button"
          role="switch"
          aria-checked={showOnlineOnly}
          onClick={onToggleOnlineOnly}
          title="온라인만 보기"
          className={cn(
            'shrink-0 flex items-center gap-1 px-2 py-1 border rounded-2xl text-[11px] whitespace-nowrap',
            showOnlineOnly
              ? 'border-brand bg-brand text-white'
              : isDark ? 'border-slate-600 bg-transparent text-slate-300' : 'border-slate-200 bg-transparent text-slate-500',
          )}
        >
          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.7 }} />
          온라인
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <OrgTree
          isDark={isDark}
          orgLoading={orgLoading}
          orgError={orgError}
          orgTree={orgTree}
          treeOpen={treeOpen}
          orgStarred={orgStarred}
          onToggleOrgStar={onToggleOrgStar}
          onlineUserIds={onlineUserIds}
          myId={myId}
          myEmail={myEmail}
          socketConnected={socketConnected}
          onRetryOrg={onRetryOrg}
          onToggleTree={onToggleTree}
          onOpenDirectMessage={onOpenDirectMessage}
          onUserContextMenu={onUserContextMenu}
          hasStatusIcon={hasStatusIcon}
          renderStatusIcon={renderStatusIcon}
        />
      </div>
    </div>
  );
}

export default memo(LeftSidebar);
