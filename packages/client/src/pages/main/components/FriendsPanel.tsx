import { memo } from 'react';
import type { MouseEvent } from 'react';
import type { OrgCompany, OrgUser } from '../../../api';
import UIChevron from '../../../components/ui/UIChevron';
import UserAvatar from '../../../components/UserAvatar';
import { cn } from '../../../utils/cn';

type FriendsPanelProps = {
  isDark: boolean;
  isNarrowLayout: boolean;
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  searchQuery: string;
  showOnlineOnly: boolean;
  orgLoading: boolean;
  orgError: boolean;
  orgTree: OrgCompany[];
  treeOpen: Record<string, boolean>;
  onlineUserIds: Set<string>;
  myId?: string;
  myEmail?: string;
  socketConnected: boolean;
  onSearchQueryChange: (value: string) => void;
  onToggleOnlineOnly: () => void;
  onRetryOrg: () => void;
  onToggleTree: (key: string) => void;
  onOpenDirectMessage: (userId: string) => void | Promise<void>;
  onUserContextMenu: (e: MouseEvent<HTMLButtonElement>, user: OrgUser) => void;
  hasStatusIcon: (status?: string | null) => boolean;
  renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
};

function FriendsPanel({
  isDark,
  isNarrowLayout,
  panelWrapStyle,
  searchQuery,
  showOnlineOnly,
  orgLoading,
  orgError,
  orgTree,
  treeOpen,
  onlineUserIds,
  myId,
  myEmail,
  socketConnected,
  onSearchQueryChange,
  onToggleOnlineOnly,
  onRetryOrg,
  onToggleTree,
  onOpenDirectMessage,
  onUserContextMenu,
  hasStatusIcon,
  renderStatusIcon,
}: FriendsPanelProps) {
  const wrap = panelWrapStyle(820);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
        <h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>멤버</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end', width: isNarrowLayout ? '100%' : 'auto' }}>
          <input
            type="text"
            placeholder="이름 검색"
            aria-label="멤버 이름 검색"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            style={{ padding: '5px 10px', border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`, borderRadius: 6, fontSize: 12, background: isDark ? '#334155' : '#f5f5f5', color: isDark ? '#e2e8f0' : '#0f172a', outline: 'none', width: isNarrowLayout ? '100%' : 140, minWidth: 0, boxSizing: 'border-box' }}
          />
          <button type="button" role="switch" aria-checked={showOnlineOnly} onClick={onToggleOnlineOnly} className={cn('flex items-center gap-1.5 px-2 py-1 border rounded-2xl bg-transparent text-[12px]', showOnlineOnly && 'border-brand bg-brand text-white')}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: 'currentColor', opacity: 0.7 }} />
            온라인만
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0 overflow-auto">
        {orgLoading ? (
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, padding: 16 }}>로딩 중...</p>
        ) : orgError ? (
          <div style={{ padding: 20, textAlign: 'center' }}>
            <p style={{ color: '#c62828', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>조직 데이터를 불러올 수 없습니다</p>
            <button type="button" onClick={onRetryOrg} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>
              다시 시도
            </button>
          </div>
        ) : orgTree.length === 0 ? (
          <p style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, padding: 16 }}>표시할 조직이 없습니다.</p>
        ) : (
          <div style={{ padding: '8px 12px' }}>
            {orgTree.map((company) => {
              const companyKey = `company-${company.id}`;
              const companyOpen = treeOpen[companyKey] !== false;
              return (
                <div key={company.id} style={{ marginBottom: 6 }}>
                  <button type="button" className="flex items-center gap-1.5 px-2 py-[5px] rounded-md bg-transparent text-[13px]" onClick={() => onToggleTree(companyKey)}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <UIChevron open={companyOpen} size={9} color={isDark ? '#64748b' : '#9ca3af'} />
                    </span>
                    <span style={{ fontWeight: 600, fontSize: 13, color: isDark ? '#f1f5f9' : '#111827' }}>{company.name}</span>
                  </button>
                  {companyOpen && company.departments.map((dept) => {
                    const deptKey = `dept-${dept.id}`;
                    const deptOpen = treeOpen[deptKey] !== false;
                    return (
                      <div key={dept.id} style={{ marginLeft: 14, marginTop: 2 }}>
                        <button type="button" className="flex items-center gap-1.5 px-2 py-[5px] rounded-md bg-transparent text-[13px]" onClick={() => onToggleTree(deptKey)}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <UIChevron open={deptOpen} size={9} color={isDark ? '#64748b' : '#9ca3af'} />
                          </span>
                          <span style={{ fontWeight: 500, fontSize: 13, color: isDark ? '#94a3b8' : '#6b7280' }}>{dept.name}</span>
                        </button>
                        {deptOpen && (
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, marginTop: 2 }}>
                            {dept.users.map((u) => {
                              const isOnline = onlineUserIds.has(String(u.id)) || (String(u.id) === String(myId) && socketConnected);
                              return (
                                <li key={u.id} style={{ marginBottom: 1 }}>
                                  <button
                                    type="button"
                                    className={cn('flex items-center gap-2 px-2 py-[5px] rounded-md bg-transparent text-[13px] w-full border-none cursor-pointer text-left', !isOnline && 'opacity-70', !isOnline && (isDark ? 'text-[#64748b]' : 'text-[#9ca3af]'))}
                                    onClick={() => void onOpenDirectMessage(u.id)}
                                    onContextMenu={(e) => onUserContextMenu(e, u)}
                                  >
                                    <div style={{ position: 'relative', width: 28, height: 28, flexShrink: 0 }}>
                                      <div style={{ width: 28, height: 28, borderRadius: 8, background: isDark ? '#475569' : '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280', overflow: 'hidden' }}>
                                        <UserAvatar userId={u.id} name={u.name} avatarUrlPath={u.avatarUrl} imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }} initialStyle={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#6b7280' }} />
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
                            })}
                          </ul>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FriendsPanel);
