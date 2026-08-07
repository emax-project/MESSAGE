import { memo } from 'react';
import type { MouseEvent } from 'react';
import type { OrgCompany, OrgUser } from '../../../api';
import UICloseButton from '../../../components/ui/UICloseButton';
import OrgTree from './OrgTree';
import { electronNoDragClass } from '../../../components/MacElectronDragBar';
import {
  electronDragStyle,
  electronNoDragStyle,
  isMacElectron,
} from '../../../utils/electronChrome';
import { cn } from '../../../utils/cn';

type OrgPanelProps = {
  isDark: boolean;
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  showOnlineOnly: boolean;
  onToggleOnlineOnly: () => void;
  orgLoading: boolean;
  orgError: boolean;
  orgTree: OrgCompany[];
  companyMemberCounts?: Record<string, number>;
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

function OrgPanel({
  isDark,
  panelWrapStyle,
  searchQuery,
  onSearchQueryChange,
  showOnlineOnly,
  onToggleOnlineOnly,
  orgLoading,
  orgError,
  orgTree,
  companyMemberCounts,
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
}: OrgPanelProps) {
  const macDrag = isMacElectron();
  const wrap = panelWrapStyle(820);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div
        className={cn(
          'shrink-0 flex items-center justify-between px-5 py-3.5 border-b electron-drag',
          isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]',
        )}
        style={macDrag ? electronDragStyle : undefined}
      >
        <h3 className={cn('m-0 text-base font-bold pointer-events-none', isDark ? 'text-white' : 'text-slate-900')}>조직도</h3>
      </div>

      <div
        className={cn(
          'shrink-0 flex items-center gap-2 px-5 py-2.5 border-b electron-drag',
          isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]',
        )}
        style={macDrag ? electronDragStyle : undefined}
      >
        <input
          type="text"
          placeholder="이름 검색"
          aria-label="멤버 이름 검색"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className={cn(
            electronNoDragClass,
            'flex-1 px-2.5 py-1.5 border rounded-[6px] text-[13px] outline-none min-w-0',
            isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-900',
          )}
          style={macDrag ? electronNoDragStyle : undefined}
        />
        {searchQuery.trim().length > 0 && (
          <UICloseButton
            size="sm"
            variant="subtle"
            onClick={() => onSearchQueryChange('')}
            aria-label="검색어 지우기"
            title="검색어 지우기"
            className={electronNoDragClass}
            style={macDrag ? electronNoDragStyle : undefined}
          />
        )}
        <button
          type="button"
          role="switch"
          aria-checked={showOnlineOnly}
          onClick={onToggleOnlineOnly}
          title="온라인만 보기"
          style={macDrag ? electronNoDragStyle : undefined}
          className={cn(
            electronNoDragClass,
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
          companyMemberCounts={companyMemberCounts}
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

export default memo(OrgPanel);
