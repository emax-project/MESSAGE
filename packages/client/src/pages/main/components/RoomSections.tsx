import { memo, useMemo } from 'react';
import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { Folder, PublicRoom, Room } from '../../../api';
import UIChevron from '../../../components/ui/UIChevron';

type SectionOpen = { topic: boolean; chat: boolean };
type CreateGroupFor = 'topic' | 'chat';

export type RoomSectionsProps = {
  st: Record<string, CSSProperties>;
  isDark: boolean;
  roomsError: unknown;
  folders: Folder[];
  topicRooms: Room[];
  chatRooms: Room[];
  topicUnreadCount: number;
  chatUnreadCount: number;
  sectionOpen: SectionOpen;
  roomsByFolder: Map<string | null, Room[]>;
  folderOpen: Record<string, boolean>;
  publicRooms: PublicRoom[];
  allRooms: Room[];
  toggleSection: (key: 'topic' | 'chat') => void;
  toggleFolder: (folderId: string) => void;
  setShowFolderManageModal: Dispatch<SetStateAction<boolean>>;
  setCreateGroupFor: Dispatch<SetStateAction<CreateGroupFor>>;
  setShowCreateGroupModal: Dispatch<SetStateAction<boolean>>;
  renderRoomItem: (room: Room) => JSX.Element;
  onJoinPublicRoom: (roomId: string) => Promise<void>;
};

function PlusIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" fill="none" aria-hidden style={{ display: 'block', flexShrink: 0 }}>
      <path d="M6 2.5V9.5M2.5 6H9.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function RoomSections({
  st,
  isDark,
  roomsError,
  folders,
  topicRooms,
  chatRooms,
  topicUnreadCount,
  chatUnreadCount,
  sectionOpen,
  roomsByFolder,
  folderOpen,
  publicRooms,
  allRooms,
  toggleSection,
  toggleFolder,
  setShowFolderManageModal,
  setCreateGroupFor,
  setShowCreateGroupModal,
  renderRoomItem,
  onJoinPublicRoom,
}: RoomSectionsProps) {
  const joinablePublicRooms = useMemo(() => {
    const roomIds = new Set(allRooms.map((r) => r.id));
    return (Array.isArray(publicRooms) ? publicRooms : []).filter((pr) => !roomIds.has(pr.id));
  }, [publicRooms, allRooms]);

  const openCreateModal = (mode: CreateGroupFor) => {
    setCreateGroupFor(mode);
    setShowCreateGroupModal(true);
  };

  return (
    <div style={st.sidebarContent}>
      {/* TOPIC Section - JANDI 스타일 폴더 구조 */}
      <div>
        <button type="button" style={st.sectionHeader} onClick={() => toggleSection('topic')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={st.sectionChevron}><UIChevron open={sectionOpen.topic} size={11} color={isDark ? '#94a3b8' : '#64748b'} /></span>
            <span style={st.sectionTitle}>아젠다</span>
            <span style={st.sectionCount}>{topicRooms.length}개</span>
            {topicUnreadCount > 0 && <span style={st.sectionUnreadBadge}>{topicUnreadCount > 99 ? '99+' : topicUnreadCount}</span>}
          </span>
          <span style={{ display: 'flex', gap: 4 }}>
            <button
              type="button"
              style={st.sectionTextBtn}
              onClick={(e) => { e.stopPropagation(); setShowFolderManageModal(true); }}
              title="폴더 관리"
            >폴더</button>
            <button
              type="button"
              style={st.sectionAddBtn}
              onClick={(e) => { e.stopPropagation(); openCreateModal('topic'); }}
              title="아젠다 만들기"
              aria-label="아젠다 만들기"
            ><PlusIcon /></button>
          </span>
        </button>
        {sectionOpen.topic && (
          <>
            {roomsError ? (
              <div style={{ padding: '8px 16px', fontSize: 12, color: '#c62828' }}>목록을 불러올 수 없습니다</div>
            ) : topicRooms.length === 0 && (folders?.length ?? 0) === 0 ? (
              <div style={{ padding: '8px 16px', fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>아젠다가 없습니다</div>
            ) : (
              <div style={{ paddingLeft: 4 }}>
                {(folders ?? []).map((f) => {
                  const rooms = roomsByFolder.get(f.id) ?? [];
                  const isOpen = folderOpen[f.id] !== false;
                  const folderUnread = rooms.reduce((s, r) => s + (r.unreadCount ?? 0), 0);
                  return (
                    <div key={f.id}>
                      <button
                        type="button"
                        style={st.folderHeader}
                        onClick={() => toggleFolder(f.id)}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                          <UIChevron open={isOpen} size={10} color={isDark ? '#94a3b8' : '#64748b'} />
                        </span>
                        <span>{f.name}</span>
                        <span style={{ fontSize: 11, opacity: 0.8 }}>({rooms.length})</span>
                        {folderUnread > 0 && <span style={st.sectionUnreadBadge}>{folderUnread > 99 ? '99+' : folderUnread}</span>}
                      </button>
                      {isOpen && <ul style={st.roomList}>{rooms.map(renderRoomItem)}</ul>}
                    </div>
                  );
                })}
                {(roomsByFolder.get(null) ?? []).length > 0 && (
                  <div>
                    <div style={{ padding: '6px 12px', fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>미분류</div>
                    <ul style={st.roomList}>{(roomsByFolder.get(null) ?? []).map(renderRoomItem)}</ul>
                  </div>
                )}
              </div>
            )}
            {joinablePublicRooms.length > 0 && (
              <div style={{ padding: '4px 16px 8px' }}>
                <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af', marginBottom: 4 }}>공개 채널</div>
                {joinablePublicRooms.map((pr) => (
                  <div key={pr.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', fontSize: 12 }}>
                    <span style={{ color: isDark ? '#94a3b8' : '#6b7280' }}>{pr.name}</span>
                    <button
                      type="button"
                      style={{ border: 'none', background: isDark ? '#475569' : '#e5e7eb', color: isDark ? '#e2e8f0' : '#333', fontSize: 11, padding: '2px 8px', borderRadius: 4, cursor: 'pointer' }}
                      onClick={() => void onJoinPublicRoom(pr.id)}
                    >참가</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* CHAT Section */}
      <div style={{ borderTop: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`, marginTop: 4 }}>
        <button type="button" style={st.sectionHeader} onClick={() => toggleSection('chat')}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={st.sectionChevron}><UIChevron open={sectionOpen.chat} size={11} color={isDark ? '#94a3b8' : '#64748b'} /></span>
            <span style={st.sectionTitle}>채팅</span>
            <span style={st.sectionCount}>{chatRooms.length}개</span>
            {chatUnreadCount > 0 && <span style={st.sectionUnreadBadge}>{chatUnreadCount > 99 ? '99+' : chatUnreadCount}</span>}
          </span>
          <button
            type="button"
            style={st.sectionAddBtn}
            onClick={(e) => { e.stopPropagation(); openCreateModal('chat'); }}
            title="1:1 채팅 만들기"
            aria-label="1:1 채팅 만들기"
          ><PlusIcon /></button>
        </button>
        {sectionOpen.chat && (
          chatRooms.length === 0 ? (
            <div style={{ padding: '8px 16px', fontSize: 12, color: isDark ? '#64748b' : '#9ca3af' }}>채팅이 없습니다</div>
          ) : (
            <ul style={st.roomList}>{chatRooms.map(renderRoomItem)}</ul>
          )
        )}
      </div>
    </div>
  );
}

export default memo(RoomSections);
