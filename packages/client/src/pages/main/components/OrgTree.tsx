import { memo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { OrgCompany, OrgDepartment, OrgGroup, OrgUser } from '../../../api';
import type { OnlinePresenceMap } from '../../../utils/presence';
import { cn } from '../../../utils/cn';
import { allOrgUsers, companyUsers, departmentUsers } from '../../../utils/orgTree';

const ACTIVE_BLUE = '#3b9eff';
const INACTIVE_GRAY = '#c5c9d0';
const FOLDER_BLUE = '#4da3ff';

function FolderIcon({ size = 15, active = true }: { size?: number; active?: boolean }) {
  const color = active ? FOLDER_BLUE : INACTIVE_GRAY;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden style={{ flexShrink: 0 }}>
      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
    </svg>
  );
}

function MobileIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_BLUE : INACTIVE_GRAY;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="7" y="2" width="10" height="20" rx="2" />
      <line x1="12" y1="18" x2="12" y2="18.01" />
    </svg>
  );
}

function DesktopIcon({ active }: { active: boolean }) {
  const color = active ? ACTIVE_BLUE : INACTIVE_GRAY;
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function ExpandBox({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex h-[14px] w-[14px] shrink-0 items-center justify-center border border-slate-400 bg-white p-0 text-[11px] leading-none text-slate-600 cursor-pointer"
      aria-label={open ? '접기' : '펼치기'}
    >
      {open ? '−' : '+'}
    </button>
  );
}

export type OrgUserContextMenuHandler = (
  e: MouseEvent,
  user: OrgUser,
  opts?: { orgGroupId?: string; selectedUsers?: OrgUser[] },
) => void;

export type OrgTreeProps = {
  isDark: boolean;
  orgLoading: boolean;
  orgError: boolean;
  orgTree: OrgCompany[];
  orgGroups?: OrgGroup[];
  view?: 'org' | 'groups';
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
  onRenameOrgGroup?: (group: OrgGroup) => void;
  onDeleteOrgGroup?: (group: OrgGroup) => void;
  onCreateChatFromOrgGroup?: (group: OrgGroup) => void;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
};

const countCompanyUsers = (company: OrgCompany) => companyUsers(company).length;

function OrgUserRow({
  u,
  isDark,
  onlinePresence,
  onlineUserIds,
  myId,
  myEmail,
  socketConnected,
  selected,
  selectedUsers,
  onToggleSelect,
  onOpenDirectMessage,
  onUserContextMenu,
  orgGroupId,
  hasStatusIcon,
  renderStatusIcon,
}: {
  u: OrgUser;
  isDark: boolean;
  onlinePresence: OnlinePresenceMap;
  onlineUserIds: Set<string>;
  myId?: string;
  myEmail?: string;
  socketConnected: boolean;
  selected: boolean;
  selectedUsers: OrgUser[];
  onToggleSelect: (userId: string) => void;
  onOpenDirectMessage: (userId: string) => void | Promise<void>;
  onUserContextMenu: OrgUserContextMenuHandler;
  orgGroupId?: string;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
}) {
  const isMe = String(u.id) === String(myId) || u.email === myEmail;
  const devices = onlinePresence[String(u.id)];
  const selfDesktop = isMe && socketConnected && detectSelfDesktop();
  const selfMobile = isMe && socketConnected && detectSelfMobile();
  const pcActive = devices ? !!devices.desktop : (selfDesktop || (onlineUserIds.has(String(u.id)) && !selfMobile));
  const mobileActive = devices ? !!devices.mobile : selfMobile;
  const isOnline = pcActive || mobileActive || onlineUserIds.has(String(u.id)) || (isMe && socketConnected);

  const openContextMenu = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const multi =
      selected && selectedUsers.length > 1
        ? selectedUsers
        : [u];
    onUserContextMenu(e, u, {
      orgGroupId,
      selectedUsers: multi,
    });
  };

  return (
    <li className="list-none">
      <div
        className={cn(
          'flex items-center gap-1.5 rounded px-1.5 py-[3px]',
          isMe || (isOnline && selected)
            ? (isDark ? 'bg-blue-500/15' : 'bg-[#e8f4ff]')
            : selected
              ? (isDark ? 'bg-slate-700/80' : 'bg-slate-100')
              : 'bg-transparent',
        )}
        onContextMenu={openContextMenu}
      >
        <label className="flex shrink-0 cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(u.id)}
            className="h-3.5 w-3.5 cursor-pointer accent-brand"
          />
        </label>
        <span className="inline-flex shrink-0 items-center gap-0.5">
          <span title={mobileActive ? '모바일 접속 중' : '모바일 오프라인'}>
            <MobileIcon active={mobileActive} />
          </span>
          <span title={pcActive ? 'PC 접속 중' : 'PC 오프라인'}>
            <DesktopIcon active={pcActive} />
          </span>
        </span>
        {u.statusMessage && hasStatusIcon(u.statusMessage) && (
          <span className="inline-flex shrink-0" title={u.statusMessage}>
            {renderStatusIcon(u.statusMessage, 12)}
          </span>
        )}
        <button
          type="button"
          className={cn(
            'min-w-0 flex-1 truncate border-none bg-transparent p-0 text-left text-[13px] cursor-pointer',
            isOnline
              ? (isDark ? 'text-slate-100 font-medium' : 'text-slate-800 font-medium')
              : (isDark ? 'text-slate-500' : 'text-slate-400'),
          )}
          onClick={() => void onOpenDirectMessage(u.id)}
          onContextMenu={openContextMenu}
        >
          {u.name}
          {isMe ? ' (나)' : ''}
        </button>
      </div>
    </li>
  );
}

function detectSelfDesktop() {
  if (typeof window === 'undefined') return true;
  if (window.electronAPI) return true;
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

function detectSelfMobile() {
  return !detectSelfDesktop();
}

function OrgTree({
  isDark,
  orgLoading,
  orgError,
  orgTree,
  orgGroups = [],
  view = 'org',
  companyMemberCounts,
  treeOpen,
  onlineUserIds,
  onlinePresence = {},
  myId,
  myEmail,
  socketConnected,
  onRetryOrg,
  onToggleTree,
  onOpenDirectMessage,
  onUserContextMenu,
  onRenameOrgGroup,
  onDeleteOrgGroup,
  onCreateChatFromOrgGroup,
  hasStatusIcon,
  renderStatusIcon,
}: OrgTreeProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggleSelect = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleSelectMany = (ids: string[], checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const usersById = (() => {
    const map = new Map<string, OrgUser>();
    if (view === 'groups') {
      orgGroups.forEach((g) => g.members.forEach((u) => map.set(u.id, u)));
    } else {
      allOrgUsers(orgTree).forEach((u) => map.set(u.id, u));
    }
    return map;
  })();

  const selectedUsers = [...selectedIds]
    .map((id) => usersById.get(id))
    .filter(Boolean) as OrgUser[];

  if (orgLoading && view === 'org') {
    return <p className={cn('p-4 text-[13px]', isDark ? 'text-slate-400' : 'text-slate-500')}>로딩 중...</p>;
  }
  if (orgError && view === 'org') {
    return (
      <div className="p-5 text-center">
        <p className="mb-1.5 text-sm font-semibold text-red-600">조직 데이터를 불러올 수 없습니다</p>
        <button
          type="button"
          onClick={onRetryOrg}
          className="cursor-pointer rounded-lg border-none bg-slate-600 px-4 py-2 text-[13px] font-semibold text-white"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const userRowProps = {
    isDark,
    onlinePresence,
    onlineUserIds,
    myId,
    myEmail,
    socketConnected,
    selectedUsers,
    onToggleSelect: toggleSelect,
    onOpenDirectMessage,
    onUserContextMenu,
    hasStatusIcon,
    renderStatusIcon,
  };

  if (view === 'groups') {
    if (orgGroups.length === 0) {
      return (
        <p className={cn('p-4 text-[13px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
          그룹이 없습니다. 상단 + 그룹으로 만들어 보세요.
        </p>
      );
    }
    return (
      <div className="px-2.5 py-1">
        {orgGroups.map((group) => {
          const groupKey = `orggroup-${group.id}`;
          const groupOpen = treeOpen[groupKey] !== false;
          const memberIds = group.members.map((m) => m.id);
          const allSelected = memberIds.length > 0 && memberIds.every((id) => selectedIds.has(id));
          return (
            <div key={group.id} className="mb-0.5">
              <div className="flex items-center gap-1.5 px-1 py-0.5">
                <ExpandBox open={groupOpen} onClick={() => onToggleTree(groupKey)} />
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleSelectMany(memberIds, e.target.checked)}
                  className="h-3.5 w-3.5 cursor-pointer accent-brand"
                />
                <FolderIcon active={groupOpen} />
                <button
                  type="button"
                  onClick={() => onToggleTree(groupKey)}
                  className={cn(
                    'min-w-0 flex-1 truncate border-none bg-transparent p-0 text-left text-[13px] font-semibold cursor-pointer',
                    groupOpen ? 'text-[#007aff]' : (isDark ? 'text-slate-100' : 'text-slate-900'),
                  )}
                >
                  {group.name}
                </button>
                <span className={cn('shrink-0 text-[11px] tabular-nums', isDark ? 'text-slate-500' : 'text-slate-400')}>
                  {group.members.length}
                </span>
                {onCreateChatFromOrgGroup && (
                  <button
                    type="button"
                    title="그룹 채팅 만들기"
                    onClick={() => onCreateChatFromOrgGroup(group)}
                    className="shrink-0 border-none bg-transparent px-1 text-[11px] font-semibold text-[#007aff] cursor-pointer"
                  >
                    채팅
                  </button>
                )}
                {onRenameOrgGroup && (
                  <button
                    type="button"
                    onClick={() => onRenameOrgGroup(group)}
                    className={cn('shrink-0 border-none bg-transparent px-1 text-[11px] cursor-pointer', isDark ? 'text-slate-400' : 'text-slate-500')}
                  >
                    수정
                  </button>
                )}
                {onDeleteOrgGroup && (
                  <button
                    type="button"
                    onClick={() => onDeleteOrgGroup(group)}
                    className="shrink-0 border-none bg-transparent px-1 text-[11px] text-red-600 cursor-pointer"
                  >
                    삭제
                  </button>
                )}
              </div>
              {groupOpen && (
                <ul className="m-0 list-none border-l border-dashed border-slate-300 py-0.5 pl-3 ml-[7px]">
                  {group.members.length === 0 ? (
                    <li className={cn('px-2 py-1 text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
                      멤버 없음 · 조직도 탭에서 우클릭으로 추가
                    </li>
                  ) : (
                    group.members.map((u) => (
                      <OrgUserRow
                        key={u.id}
                        u={u}
                        orgGroupId={group.id}
                        selected={selectedIds.has(u.id)}
                        {...userRowProps}
                      />
                    ))
                  )}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (orgTree.length === 0) {
    return <p className={cn('p-4 text-[13px]', isDark ? 'text-slate-400' : 'text-slate-500')}>표시할 조직이 없습니다.</p>;
  }

  /**
   * 부서는 하위 부서를 가질 수 있으므로 재귀로 그린다.
   * 체크박스는 하위 부서 인원까지 포함해 한 번에 선택되게 한다.
   */
  const renderDept = (dept: OrgDepartment) => {
    const deptKey = `dept-${dept.id}`;
    const deptOpen = treeOpen[deptKey] !== false;
    const children = dept.children ?? [];
    // 이 부서 + 모든 하위 부서의 인원
    const deptIds = departmentUsers(dept).map((u) => u.id);
    const deptAllSelected = deptIds.length > 0 && deptIds.every((id) => selectedIds.has(id));
    const hasContent = dept.users.length > 0 || children.length > 0;

    return (
      <div key={dept.id} className="mt-0.5">
        <div className="flex items-center gap-1.5 px-1 py-0.5">
          <ExpandBox open={deptOpen} onClick={() => onToggleTree(deptKey)} />
          <input
            type="checkbox"
            checked={deptAllSelected}
            onChange={(e) => toggleSelectMany(deptIds, e.target.checked)}
            className="h-3.5 w-3.5 cursor-pointer accent-brand"
          />
          <FolderIcon active={deptOpen} />
          <button
            type="button"
            onClick={() => onToggleTree(deptKey)}
            className={cn(
              'min-w-0 flex-1 truncate border-none bg-transparent p-0 text-left text-[13px] font-medium cursor-pointer',
              deptOpen ? 'text-[#007aff]' : (isDark ? 'text-slate-300' : 'text-slate-600'),
            )}
          >
            {dept.name}
          </button>
          {children.length > 0 && (
            <span className={cn('shrink-0 text-[11px] tabular-nums', isDark ? 'text-slate-500' : 'text-slate-400')}>
              {deptIds.length}
            </span>
          )}
        </div>
        {deptOpen && hasContent && (
          <div className="ml-[7px] border-l border-dashed border-slate-300 pl-2">
            {dept.users.length > 0 && (
              <ul className="m-0 list-none py-0.5 pl-1">
                {dept.users.map((u) => (
                  <OrgUserRow key={u.id} u={u} selected={selectedIds.has(u.id)} {...userRowProps} />
                ))}
              </ul>
            )}
            {children.map((child) => renderDept(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="px-2.5 py-1">
      {orgTree.map((company) => {
        const companyKey = `company-${company.id}`;
        const companyOpen = treeOpen[companyKey] !== false;
        const memberCount = companyMemberCounts?.[company.id] ?? countCompanyUsers(company);
        const companyUserIds = companyUsers(company).map((u) => u.id);
        const companyAllSelected =
          companyUserIds.length > 0 && companyUserIds.every((id) => selectedIds.has(id));

        return (
          <div key={company.id} className="mb-0.5">
            <div className="flex items-center gap-1.5 px-1 py-0.5">
              <ExpandBox open={companyOpen} onClick={() => onToggleTree(companyKey)} />
              <input
                type="checkbox"
                checked={companyAllSelected}
                onChange={(e) => toggleSelectMany(companyUserIds, e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-brand"
              />
              <FolderIcon active={companyOpen} />
              <button
                type="button"
                onClick={() => onToggleTree(companyKey)}
                className={cn(
                  'min-w-0 flex-1 truncate border-none bg-transparent p-0 text-left text-[13px] font-semibold cursor-pointer',
                  companyOpen ? 'text-[#007aff]' : (isDark ? 'text-slate-100' : 'text-slate-900'),
                )}
              >
                {company.name}
              </button>
              <span className={cn('shrink-0 text-[11px] tabular-nums', isDark ? 'text-slate-500' : 'text-slate-400')}>
                {memberCount}
              </span>
            </div>

            {companyOpen && (
              <div className="ml-[7px] border-l border-dashed border-slate-300 pl-2">
                {company.departments.map((dept) => renderDept(dept))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(OrgTree);
