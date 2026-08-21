import { memo, useState } from 'react';
import type { OrgCompany, OrgGroup } from '../../../api';
import type { OnlinePresenceMap } from '../../../utils/presence';
import UICloseButton from '../../../components/ui/UICloseButton';
import OrgTree, { type OrgUserContextMenuHandler } from './OrgTree';
import {
  PanelNoDragWrap,
  PanelTitleRow,
  PanelToolbarRow,
} from '../../../components/PanelDragHeader';
import { cn } from '../../../utils/cn';

type OrgTab = 'org' | 'groups';

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
  orgGroups: OrgGroup[];
  companyMemberCounts?: Record<string, number>;
  treeOpen: Record<string, boolean>;
  orgStarred: Set<string>;
  onToggleOrgStar: (id: string) => void;
  onlineUserIds: Set<string>;
  onlinePresence?: OnlinePresenceMap;
  myId?: string;
  myEmail?: string;
  socketConnected: boolean;
  onRetryOrg: () => void;
  onToggleTree: (key: string) => void;
  onOpenDirectMessage: (userId: string) => void | Promise<void>;
  onUserContextMenu: OrgUserContextMenuHandler;
  onCreateOrgGroup: () => void;
  onRenameOrgGroup: (group: OrgGroup) => void;
  onDeleteOrgGroup: (group: OrgGroup) => void;
  onCreateChatFromOrgGroup: (group: OrgGroup) => void;
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
  orgGroups,
  companyMemberCounts,
  treeOpen,
  orgStarred,
  onToggleOrgStar,
  onlineUserIds,
  onlinePresence = {},
  myId,
  myEmail,
  socketConnected,
  onRetryOrg,
  onToggleTree,
  onOpenDirectMessage,
  onUserContextMenu,
  onCreateOrgGroup,
  onRenameOrgGroup,
  onDeleteOrgGroup,
  onCreateChatFromOrgGroup,
  hasStatusIcon,
  renderStatusIcon,
}: OrgPanelProps) {
  const wrap = panelWrapStyle(820);
  const [tab, setTab] = useState<OrgTab>('org');

  const tabBtn = (id: OrgTab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={cn(
        'px-3.5 py-1.5 rounded-full text-[13px] font-semibold border-none cursor-pointer',
        tab === id
          ? (isDark ? 'bg-slate-600 text-white' : 'bg-slate-700 text-white')
          : isDark
            ? 'bg-transparent text-slate-300'
            : 'bg-transparent text-slate-600',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={wrap.className} style={wrap.style}>
      <PanelTitleRow isDark={isDark} title={tab === 'org' ? '조직도' : '내 그룹'} compact />

      <div
        className={cn(
          'flex items-center gap-1 px-3 py-2 border-b',
          isDark ? 'border-slate-600' : 'border-slate-200',
        )}
      >
        <PanelNoDragWrap className="flex items-center gap-1">
          {tabBtn('org', '조직도')}
          {tabBtn('groups', '내 그룹')}
        </PanelNoDragWrap>
      </div>

      <PanelToolbarRow isDark={isDark} compact>
        <PanelNoDragWrap className="flex flex-1 min-w-0 items-stretch">
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-l-[6px] border border-r-0 px-2.5 text-[12px] font-medium whitespace-nowrap',
              isDark ? 'border-slate-600 bg-slate-800 text-slate-300' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            이름
          </span>
          <div className="relative min-w-0 flex-1">
            <span
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="검색"
              aria-label="멤버 이름 검색"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className={cn(
                'h-full w-full rounded-r-[6px] border py-1.5 pl-8 pr-8 text-[13px] outline-none',
                isDark
                  ? 'border-slate-600 bg-slate-700 text-slate-200 placeholder:text-slate-400'
                  : 'border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400',
              )}
            />
            {searchQuery.trim().length > 0 && (
              <span className="absolute right-1 top-1/2 -translate-y-1/2">
                <UICloseButton
                  size="sm"
                  variant="subtle"
                  onClick={() => onSearchQueryChange('')}
                  aria-label="검색어 지우기"
                  title="검색어 지우기"
                />
              </span>
            )}
          </div>
        </PanelNoDragWrap>
        <PanelNoDragWrap>
          <button
            type="button"
            role="switch"
            aria-checked={showOnlineOnly}
            onClick={onToggleOnlineOnly}
            title="온라인만 보기"
            className={cn(
              'shrink-0 flex items-center gap-1 px-2 py-1 border rounded-2xl text-[11px] whitespace-nowrap cursor-pointer',
              showOnlineOnly
                ? 'border-brand bg-brand text-white'
                : isDark ? 'border-slate-600 bg-transparent text-slate-300' : 'border-slate-200 bg-transparent text-slate-500',
            )}
          >
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.7 }} />
            온라인
          </button>
        </PanelNoDragWrap>
        {tab === 'groups' && (
          <PanelNoDragWrap>
            <button
              type="button"
              onClick={onCreateOrgGroup}
              title="내 그룹 만들기"
              className={cn(
                'shrink-0 px-2 py-1 border rounded-2xl text-[11px] font-semibold whitespace-nowrap cursor-pointer',
                isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-white text-slate-700',
              )}
            >
              + 그룹
            </button>
          </PanelNoDragWrap>
        )}
      </PanelToolbarRow>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <OrgTree
          isDark={isDark}
          view={tab}
          orgLoading={orgLoading}
          orgError={orgError}
          orgTree={orgTree}
          orgGroups={orgGroups}
          companyMemberCounts={companyMemberCounts}
          treeOpen={treeOpen}
          orgStarred={orgStarred}
          onToggleOrgStar={onToggleOrgStar}
          onlineUserIds={onlineUserIds}
          onlinePresence={onlinePresence}
          myId={myId}
          myEmail={myEmail}
          socketConnected={socketConnected}
          onRetryOrg={onRetryOrg}
          onToggleTree={onToggleTree}
          onOpenDirectMessage={onOpenDirectMessage}
          onUserContextMenu={onUserContextMenu}
          onRenameOrgGroup={onRenameOrgGroup}
          onDeleteOrgGroup={onDeleteOrgGroup}
          onCreateChatFromOrgGroup={onCreateChatFromOrgGroup}
          hasStatusIcon={hasStatusIcon}
          renderStatusIcon={renderStatusIcon}
        />
      </div>
    </div>
  );
}

export default memo(OrgPanel);
