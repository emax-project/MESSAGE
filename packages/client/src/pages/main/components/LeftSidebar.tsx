import { memo } from 'react';
import type { CSSProperties, Dispatch, ReactNode, SetStateAction } from 'react';
import UserAvatar from '../../../components/UserAvatar';
import { EmaxLogo } from '../../../components/EmaxLogo';
import UICloseButton from '../../../components/ui/UICloseButton';
import RoomSections, { type RoomSectionsProps } from './RoomSections';

type LeftSidebarUser = {
  id: string;
  name?: string | null;
  avatarUrl?: string | null;
} | null | undefined;

type LeftSidebarProps = RoomSectionsProps & {
  st: Record<string, CSSProperties>;
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
  st,
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
    <div style={st.sidebar}>
      <div style={st.sidebarHeader}>
        <button
          type="button"
          onClick={onNavigateHome}
          style={{ display: 'flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', padding: 0, margin: 0, cursor: 'pointer' }}
          title="대시보드로 이동"
        >
          <EmaxLogo variant={isDark ? 'light' : 'accent'} size="sm" />
        </button>
      </div>

      <div style={st.profileSection}>
        <div style={{ position: 'relative' as const, flexShrink: 0 }}>
          <div style={st.profileAvatar}>
            {user?.avatarUrl ? (
              <UserAvatar userId={user.id} name={user.name || ''} avatarUrlPath={user.avatarUrl} imgStyle={st.profileAvatarImg} initialStyle={st.profileInitial} />
            ) : (
              <span style={st.profileInitial}>{user?.name?.trim()[0]?.toUpperCase() || '?'}</span>
            )}
          </div>
          {showStatusBadge && (
            <span style={{ position: 'absolute' as const, top: -2, right: -2, display: 'block', borderRadius: '50%', border: `1.5px solid ${isDark ? '#1e293b' : '#f1f5f9'}`, lineHeight: 0 }}>
              {statusBadge}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={st.profileName}>{user?.name || '사용자'}</div>
          {statusInput && <div style={st.profileStatus}>{statusLabel}</div>}
        </div>
      </div>

      <div style={st.searchWrap}>
        <input
          type="text"
          placeholder="대화방 검색"
          aria-label="대화방 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={st.searchInput}
        />
        {searchQuery.trim().length > 0 && (
          <UICloseButton
            size="sm"
            variant="subtle"
            onClick={() => setSearchQuery('')}
            style={st.searchClearBtn}
            aria-label="검색어 지우기"
            title="검색어 지우기"
          />
        )}
      </div>

      <RoomSections
        st={st}
        isDark={isDark}
        {...roomSectionsProps}
      />
    </div>
  );
}

export default memo(LeftSidebar);
