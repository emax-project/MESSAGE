import type { CSSProperties, Dispatch, SetStateAction } from 'react';
import type { OrgUser, Room } from '../../../api';
import CreateGroupModal from '../../../components/CreateGroupModal';
import FolderManageModal from '../../../components/FolderManageModal';
import AvatarEditModal from '../../../components/AvatarEditModal';
import UICloseButton from '../../../components/ui/UICloseButton';

type CtxUserMenu = { x: number; y: number; user: OrgUser } | null;
type CtxRoomMenu = { x: number; y: number; room: Room } | null;

type MainOverlaysProps = {
  st: Record<string, CSSProperties>;
  isDark: boolean;
  showAnnouncementModal: boolean;
  announcementContent?: string | null;
  setShowAnnouncementModal: Dispatch<SetStateAction<boolean>>;
  showCreateGroupModal: boolean;
  createGroupFor: 'topic' | 'chat';
  setShowCreateGroupModal: Dispatch<SetStateAction<boolean>>;
  onTopicCreated: (id: string) => void;
  onGroupCreated: (roomId: string, viewMode?: 'chat' | 'board', options?: { skipRoomsInvalidate?: boolean }) => void;
  avatarEditFile: File | null;
  setAvatarEditFile: Dispatch<SetStateAction<File | null>>;
  onConfirmAvatar: (croppedFile: File) => Promise<void>;
  showFolderManageModal: boolean;
  setShowFolderManageModal: Dispatch<SetStateAction<boolean>>;
  topicRooms: Room[];
  contextMenu: CtxUserMenu;
  setContextMenu: Dispatch<SetStateAction<CtxUserMenu>>;
  setProfileModalUser: Dispatch<SetStateAction<OrgUser | null>>;
  roomContextMenu: CtxRoomMenu;
  setRoomContextMenu: Dispatch<SetStateAction<CtxRoomMenu>>;
  mutedRoomIds: Set<string>;
  onToggleFavorite: (room: Room) => void | Promise<void>;
  onToggleMuteRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void | Promise<void>;
  profileModalUser: OrgUser | null;
  onlineUserIds: Set<string>;
};

export default function MainOverlays({
  st,
  isDark,
  showAnnouncementModal,
  announcementContent,
  setShowAnnouncementModal,
  showCreateGroupModal,
  createGroupFor,
  setShowCreateGroupModal,
  onTopicCreated,
  onGroupCreated,
  avatarEditFile,
  setAvatarEditFile,
  onConfirmAvatar,
  showFolderManageModal,
  setShowFolderManageModal,
  topicRooms,
  contextMenu,
  setContextMenu,
  setProfileModalUser,
  roomContextMenu,
  setRoomContextMenu,
  mutedRoomIds,
  onToggleFavorite,
  onToggleMuteRoom,
  onLeaveRoom,
  profileModalUser,
  onlineUserIds,
}: MainOverlaysProps) {
  return (
    <>
      {showAnnouncementModal && announcementContent?.trim() && (
        <div style={st.overlay} onClick={() => setShowAnnouncementModal(false)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>공지</h3>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#555', marginBottom: 16 }}>{announcementContent}</div>
            <button type="button" style={{ ...st.formBtn, width: '100%' }} onClick={() => setShowAnnouncementModal(false)}>확인</button>
          </div>
        </div>
      )}

      {showCreateGroupModal && (
        <CreateGroupModal
          mode={createGroupFor}
          onClose={() => setShowCreateGroupModal(false)}
          onTopicCreated={onTopicCreated}
          onCreated={onGroupCreated}
        />
      )}

      {avatarEditFile && (
        <AvatarEditModal
          file={avatarEditFile}
          onClose={() => setAvatarEditFile(null)}
          onConfirm={onConfirmAvatar}
        />
      )}

      {showFolderManageModal && <FolderManageModal topicRooms={topicRooms} onClose={() => setShowFolderManageModal(false)} />}

      {contextMenu && (() => {
        const estH = 50;
        const top = contextMenu.y + estH > window.innerHeight - 8 ? contextMenu.y - estH : contextMenu.y;
        const left = Math.min(Math.max(contextMenu.x, 8), window.innerWidth - 130);
        return (
          <div style={{ ...st.ctxMenu, left, top }} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={st.ctxMenuItem} onClick={() => { setProfileModalUser(contextMenu.user); setContextMenu(null); }}>프로필 보기</button>
          </div>
        );
      })()}

      {roomContextMenu && (() => {
        const estH = 180;
        const top = roomContextMenu.y + estH > window.innerHeight - 8 ? roomContextMenu.y - estH : roomContextMenu.y;
        const left = Math.min(Math.max(roomContextMenu.x, 8), window.innerWidth - 210);
        return (
          <div style={{ ...st.ctxMenu, left, top }} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={st.ctxMenuItem} onClick={() => void onToggleFavorite(roomContextMenu.room)}>{roomContextMenu.room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}</button>
            <button type="button" style={st.ctxMenuItem} onClick={() => onToggleMuteRoom(roomContextMenu.room.id)}>{mutedRoomIds.has(roomContextMenu.room.id) ? '알림 켜기' : '알림 끄기'}</button>
            {roomContextMenu.room.isGroup && roomContextMenu.room.isTopic && (
              <button type="button" style={st.ctxMenuItem} onClick={() => { setShowFolderManageModal(true); setRoomContextMenu(null); }}>폴더로 이동</button>
            )}
            <button type="button" style={{ ...st.ctxMenuItem, color: '#c62828' }} onClick={() => void onLeaveRoom(roomContextMenu.room.id)}>나가기</button>
          </div>
        );
      })()}

      {profileModalUser && (
        <div style={st.overlay} onClick={() => setProfileModalUser(null)}>
          <div style={st.modal} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>사용자 프로필</h3>
              <UICloseButton onClick={() => setProfileModalUser(null)} />
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>이름</strong> {profileModalUser.name}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>이메일</strong> {profileModalUser.email}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>상태</strong> {onlineUserIds.has(String(profileModalUser.id)) ? <span style={{ color: '#4caf50', fontWeight: 600 }}>● 온라인</span> : <span style={{ color: isDark ? '#64748b' : '#999' }}>○ 오프라인</span>}</p>
            {profileModalUser.statusMessage && <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#555' }}><strong>상태 메시지</strong> {profileModalUser.statusMessage}</p>}
          </div>
        </div>
      )}
    </>
  );
}
