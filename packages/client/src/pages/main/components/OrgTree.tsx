import { memo } from 'react';
import type { MouseEvent } from 'react';
import type { OrgCompany, OrgGroup, OrgUser } from '../../../api';
import UIChevron from '../../../components/ui/UIChevron';
import UserAvatar from '../../../components/UserAvatar';
import { cn } from '../../../utils/cn';

function PersonIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FolderIcon({ size = 14, color }: { size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flexShrink: 0 }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function StarIcon({ filled, size = 16, color }: { filled: boolean; size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }} fill={filled ? color : 'none'} stroke={color} strokeWidth={filled ? 0 : 1.5} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

export type OrgUserContextMenuHandler = (
  e: MouseEvent<HTMLButtonElement>,
  user: OrgUser,
  opts?: { orgGroupId?: string },
) => void;

export type OrgTreeProps = {
  isDark: boolean;
  orgLoading: boolean;
  orgError: boolean;
  orgTree: OrgCompany[];
  orgGroups?: OrgGroup[];
  /** org = 회사/부서, groups = 내 그룹 (탭으로 분리) */
  view?: 'org' | 'groups';
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
  onUserContextMenu: OrgUserContextMenuHandler;
  onRenameOrgGroup?: (group: OrgGroup) => void;
  onDeleteOrgGroup?: (group: OrgGroup) => void;
  onCreateChatFromOrgGroup?: (group: OrgGroup) => void;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
};

const countCompanyUsers = (company: OrgCompany) =>
  company.departments.reduce((sum, dept) => sum + dept.users.length, 0);

function OrgUserRow({
  u,
  isDark,
  onlineUserIds,
  myId,
  myEmail,
  socketConnected,
  onOpenDirectMessage,
  onUserContextMenu,
  orgGroupId,
  hasStatusIcon,
  renderStatusIcon,
}: {
  u: OrgUser;
  isDark: boolean;
  onlineUserIds: Set<string>;
  myId?: string;
  myEmail?: string;
  socketConnected: boolean;
  onOpenDirectMessage: (userId: string) => void | Promise<void>;
  onUserContextMenu: OrgUserContextMenuHandler;
  orgGroupId?: string;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
}) {
  const isOnline = onlineUserIds.has(String(u.id)) || (String(u.id) === String(myId) && socketConnected);
  return (
    <li>
      <button
        type="button"
        className={cn('flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-transparent text-[13px] w-full border-none cursor-pointer text-left', !isOnline && 'opacity-70', !isOnline && (isDark ? 'text-[#64748b]' : 'text-[#9ca3af]'))}
        onClick={() => void onOpenDirectMessage(u.id)}
        onContextMenu={(e) => onUserContextMenu(e, u, orgGroupId ? { orgGroupId } : undefined)}
      >
        <div style={{ position: 'relative', width: 24, height: 24, flexShrink: 0 }}>
          <div style={{ width: 24, height: 24, borderRadius: 6, background: isDark ? '#475569' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden' }}>
            <UserAvatar userId={u.id} name={u.name} avatarUrlPath={u.avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 6 }} initialStyle={{ fontSize: 10, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280' }} />
          </div>
          {u.statusMessage && hasStatusIcon(u.statusMessage) ? (
            <span style={{ position: 'absolute', top: -2, right: -2, display: 'block', borderRadius: '50%', border: `1.5px solid ${isDark ? '#1e293b' : '#fff'}`, lineHeight: 0 }}>
              {renderStatusIcon(u.statusMessage, 11)}
            </span>
          ) : isOnline ? (
            <span style={{ position: 'absolute', top: -1, right: -1, width: 8, height: 8, borderRadius: '50%', background: '#22c55e', border: `1.5px solid ${isDark ? '#1e293b' : '#fff'}`, display: 'block' }} title="온라인" />
          ) : null}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ color: isDark ? '#cbd5e1' : '#374151', fontWeight: 500, fontSize: 13 }}>{u.name}</span>
          {u.statusMessage && <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.statusMessage}</div>}
        </div>
        {(String(u.id) === String(myId) || u.email === myEmail) && <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>(나)</span>}
      </button>
    </li>
  );
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
  onRenameOrgGroup,
  onDeleteOrgGroup,
  onCreateChatFromOrgGroup,
  hasStatusIcon,
  renderStatusIcon,
}: OrgTreeProps) {
  if (orgLoading && view === 'org') {
    return <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, padding: 16 }}>로딩 중...</p>;
  }
  if (orgError && view === 'org') {
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <p style={{ color: '#c62828', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>조직 데이터를 불러올 수 없습니다</p>
        <button type="button" onClick={onRetryOrg} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
          다시 시도
        </button>
      </div>
    );
  }

  const userRowProps = {
    isDark,
    onlineUserIds,
    myId,
    myEmail,
    socketConnected,
    onOpenDirectMessage,
    onUserContextMenu,
    hasStatusIcon,
    renderStatusIcon,
  };

  if (view === 'groups') {
    if (orgGroups.length === 0) {
      return (
        <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, padding: 16 }}>
          그룹이 없습니다. 상단 + 그룹으로 만들어 보세요.
        </p>
      );
    }
    return (
      <div style={{ padding: '4px 10px' }}>
        {orgGroups.map((group) => {
          const groupKey = `orggroup-${group.id}`;
          const groupOpen = treeOpen[groupKey] !== false;
          return (
            <div key={group.id} style={{ marginBottom: 3 }}>
              <button type="button" className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-transparent text-[13px] w-full" onClick={() => onToggleTree(groupKey)}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <UIChevron open={groupOpen} size={9} color={groupOpen ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
                </span>
                <FolderIcon size={14} color={groupOpen ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
                <span style={{ fontWeight: 600, fontSize: 13, color: groupOpen ? '#007aff' : (isDark ? '#f1f5f9' : '#111827'), flex: 1, textAlign: 'left', minWidth: 0 }} className="truncate">
                  {group.name}
                </span>
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                    groupOpen
                      ? (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600')
                      : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'),
                  )}
                >
                  <PersonIcon size={11} />
                  {group.members.length}
                </span>
                {onCreateChatFromOrgGroup && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="그룹 채팅 만들기"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onCreateChatFromOrgGroup(group); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', fontSize: 11, color: groupOpen ? '#007aff' : (isDark ? '#94a3b8' : '#64748b'), padding: '0 2px', fontWeight: 600 }}
                  >
                    채팅
                  </span>
                )}
                {onRenameOrgGroup && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="이름 변경"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRenameOrgGroup(group); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', fontSize: 11, color: isDark ? '#94a3b8' : '#64748b', padding: '0 2px' }}
                  >
                    수정
                  </span>
                )}
                {onDeleteOrgGroup && (
                  <span
                    role="button"
                    tabIndex={0}
                    title="그룹 삭제"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteOrgGroup(group); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ cursor: 'pointer', fontSize: 11, color: '#c62828', padding: '0 2px' }}
                  >
                    삭제
                  </span>
                )}
              </button>
              {groupOpen && (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: 1, marginLeft: 12 }}>
                  {group.members.length === 0 ? (
                    <li style={{ padding: '4px 8px', fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>
                      멤버 없음 · 조직도 탭에서 우클릭으로 추가
                    </li>
                  ) : (
                    group.members.map((u) => (
                      <OrgUserRow key={u.id} u={u} orgGroupId={group.id} {...userRowProps} />
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
    return <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, padding: 16 }}>표시할 조직이 없습니다.</p>;
  }

  return (
    <div style={{ padding: '4px 10px' }}>
      {orgTree.map((company) => {
        const companyKey = `company-${company.id}`;
        const companyOpen = treeOpen[companyKey] !== false;
        const memberCount = companyMemberCounts?.[company.id] ?? countCompanyUsers(company);
        return (
          <div key={company.id} style={{ marginBottom: 3 }}>
            <button type="button" className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-transparent text-[13px] w-full" onClick={() => onToggleTree(companyKey)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <UIChevron open={companyOpen} size={9} color={companyOpen ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
              </span>
              <span style={{ fontWeight: 600, fontSize: 13, color: companyOpen ? '#007aff' : (isDark ? '#f1f5f9' : '#111827'), flex: 1, minWidth: 0, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="truncate">{company.name}</span>
                <span
                  className={cn(
                    'shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium tabular-nums',
                    companyOpen
                      ? (isDark ? 'bg-blue-500/20 text-blue-300' : 'bg-blue-50 text-blue-600')
                      : (isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'),
                  )}
                  title={`총 ${memberCount}명`}
                >
                  <PersonIcon size={11} />
                  {memberCount}
                </span>
              </span>
              <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleOrgStar(company.id); }} onMouseDown={(e) => e.stopPropagation()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                <StarIcon filled={orgStarred.has(company.id)} size={16} color={orgStarred.has(company.id) ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
              </span>
            </button>
            {companyOpen && company.departments.map((dept) => {
              const deptKey = `dept-${dept.id}`;
              const deptOpen = treeOpen[deptKey] !== false;
              return (
                <div key={dept.id} style={{ marginLeft: 12, marginTop: 1 }}>
                  <button type="button" className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-transparent text-[13px] w-full" onClick={() => onToggleTree(deptKey)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UIChevron open={deptOpen} size={9} color={deptOpen ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
                    </span>
                    <FolderIcon size={14} color={deptOpen ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
                    <span style={{ fontWeight: 500, fontSize: 13, color: deptOpen ? '#007aff' : (isDark ? '#94a3b8' : '#6b7280'), flex: 1, textAlign: 'left' }}>{dept.name}</span>
                    <span role="button" tabIndex={0} onClick={(e) => { e.stopPropagation(); e.preventDefault(); onToggleOrgStar(dept.id); }} onMouseDown={(e) => e.stopPropagation()} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <StarIcon filled={orgStarred.has(dept.id)} size={14} color={orgStarred.has(dept.id) ? '#007aff' : (isDark ? '#64748b' : '#9ca3af')} />
                    </span>
                  </button>
                  {deptOpen && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: 1 }}>
                      {dept.users.map((u) => (
                        <OrgUserRow key={u.id} u={u} {...userRowProps} />
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export default memo(OrgTree);
