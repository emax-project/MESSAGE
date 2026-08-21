import type { Dispatch, SetStateAction } from 'react';
import type { OrgGroup, OrgUser, Room } from '../../../api';
import CreateGroupModal from '../../../components/CreateGroupModal';
import CreateOrgContactGroupModal from '../../../components/CreateOrgContactGroupModal';
import DeleteOrgContactGroupModal from '../../../components/DeleteOrgContactGroupModal';
import FolderManageModal from '../../../components/FolderManageModal';
import AvatarEditModal from '../../../components/AvatarEditModal';
import UICloseButton from '../../../components/ui/UICloseButton';
import { cn } from '../../../utils/cn';

type CtxUserMenu = { x: number; y: number; user: OrgUser; orgGroupId?: string; selectedUsers?: OrgUser[] } | null;
type CtxRoomMenu = { x: number; y: number; room: Room } | null;

type MainOverlaysProps = {
  isDark: boolean;
  showAnnouncementModal: boolean;
  announcementTitle?: string | null;
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
  orgGroups: OrgGroup[];
  addToGroupUsers: OrgUser[] | null;
  setAddToGroupUsers: Dispatch<SetStateAction<OrgUser[] | null>>;
  onAddToOrgGroup: (groupId: string, userIds: string[]) => void | Promise<void>;
  onRemoveFromOrgGroup: (groupId: string, userId: string) => void | Promise<void>;
  showCreateOrgGroupModal: boolean;
  setShowCreateOrgGroupModal: Dispatch<SetStateAction<boolean>>;
  onCreateOrgGroup: (name: string) => Promise<void>;
  onOpenCreateOrgGroupModal: () => void;
  renamingOrgGroup: OrgGroup | null;
  setRenamingOrgGroup: Dispatch<SetStateAction<OrgGroup | null>>;
  onRenameOrgGroupSubmit: (name: string) => Promise<void>;
  deletingOrgGroup: OrgGroup | null;
  setDeletingOrgGroup: Dispatch<SetStateAction<OrgGroup | null>>;
  onDeleteOrgGroupConfirm: () => Promise<void>;
  roomContextMenu: CtxRoomMenu;
  setRoomContextMenu: Dispatch<SetStateAction<CtxRoomMenu>>;
  mutedRoomIds: Set<string>;
  onToggleFavorite: (room: Room) => void | Promise<void>;
  onToggleMuteRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void | Promise<void>;
  profileModalUser: OrgUser | null;
  onlineUserIds: Set<string>;
  onSendMemoToUser: (userId: string) => void;
};

export default function MainOverlays({
  isDark,
  showAnnouncementModal,
  announcementTitle,
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
  orgGroups,
  addToGroupUsers,
  setAddToGroupUsers,
  onAddToOrgGroup,
  onRemoveFromOrgGroup,
  showCreateOrgGroupModal,
  setShowCreateOrgGroupModal,
  onCreateOrgGroup,
  onOpenCreateOrgGroupModal,
  renamingOrgGroup,
  setRenamingOrgGroup,
  onRenameOrgGroupSubmit,
  deletingOrgGroup,
  setDeletingOrgGroup,
  onDeleteOrgGroupConfirm,
  roomContextMenu,
  setRoomContextMenu,
  mutedRoomIds,
  onToggleFavorite,
  onToggleMuteRoom,
  onLeaveRoom,
  profileModalUser,
  onlineUserIds,
  onSendMemoToUser,
}: MainOverlaysProps) {
  const overlayCls = 'fixed inset-0 z-[10002] bg-black/40 flex items-center justify-center';
  const modalCls = cn(
    'rounded-xl shadow-lg min-w-[320px] max-w-[90%] max-h-[80vh] overflow-auto p-5',
    isDark ? 'bg-slate-800' : 'bg-white',
  );
  const ctxMenuCls = cn(
    'fixed z-[10000] min-w-[140px] max-w-[220px] p-1 rounded-lg shadow-lg border whitespace-nowrap',
    isDark ? 'bg-slate-700 border-slate-600' : 'bg-white border-slate-200',
  );
  const ctxMenuItemCls = cn(
    'block w-full py-2 px-3 border-none bg-transparent rounded-md text-[13px] text-left cursor-pointer',
    isDark ? 'text-slate-200' : 'text-slate-900',
  );

  return (
    <>
      {showAnnouncementModal && announcementContent?.trim() && (
        <div className={overlayCls} onClick={() => setShowAnnouncementModal(false)}>
          <div className={modalCls} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>
              {announcementTitle?.trim() || '공지'}
            </h3>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, lineHeight: 1.5, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 16 }}>{announcementContent}</div>
            <button
              type="button"
              className="w-full py-2 px-4 border-none rounded-lg bg-gradient-to-br from-brand-light to-brand-dark text-white text-[13px] font-bold cursor-pointer"
              onClick={() => setShowAnnouncementModal(false)}
            >
              확인
            </button>
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

      {showCreateOrgGroupModal && (
        <CreateOrgContactGroupModal
          mode="create"
          onClose={() => setShowCreateOrgGroupModal(false)}
          onSubmit={onCreateOrgGroup}
        />
      )}

      {renamingOrgGroup && (
        <CreateOrgContactGroupModal
          mode="rename"
          initialName={renamingOrgGroup.name}
          onClose={() => setRenamingOrgGroup(null)}
          onSubmit={onRenameOrgGroupSubmit}
        />
      )}

      {deletingOrgGroup && (
        <DeleteOrgContactGroupModal
          groupName={deletingOrgGroup.name}
          onClose={() => setDeletingOrgGroup(null)}
          onConfirm={onDeleteOrgGroupConfirm}
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
        const targets = contextMenu.selectedUsers?.length
          ? contextMenu.selectedUsers
          : [contextMenu.user];
        const multiCount = targets.length;
        const estH = contextMenu.orgGroupId ? 140 : 110;
        const top = contextMenu.y + estH > window.innerHeight - 8 ? contextMenu.y - estH : contextMenu.y;
        const left = Math.min(Math.max(contextMenu.x, 8), window.innerWidth - 180);
        return (
          <div className={ctxMenuCls} style={{ left, top }} onClick={(e) => e.stopPropagation()}>
            {multiCount === 1 && (
              <>
                <button type="button" className={ctxMenuItemCls} onClick={() => { setProfileModalUser(contextMenu.user); setContextMenu(null); }}>프로필 보기</button>
                <button type="button" className={ctxMenuItemCls} onClick={() => onSendMemoToUser(contextMenu.user.id)}>쪽지 보내기</button>
              </>
            )}
            <button
              type="button"
              className={ctxMenuItemCls}
              onClick={() => {
                setAddToGroupUsers(targets);
                setContextMenu(null);
              }}
            >
              {multiCount > 1 ? `내 그룹에 추가 (${multiCount}명)` : '내 그룹에 추가'}
            </button>
            {contextMenu.orgGroupId && multiCount === 1 && (
              <button
                type="button"
                className={cn(ctxMenuItemCls, 'text-[#c62828]')}
                onClick={() => void onRemoveFromOrgGroup(contextMenu.orgGroupId!, contextMenu.user.id)}
              >
                그룹에서 제거
              </button>
            )}
            {contextMenu.orgGroupId && multiCount > 1 && (
              <button
                type="button"
                className={cn(ctxMenuItemCls, 'text-[#c62828]')}
                onClick={() => {
                  void (async () => {
                    for (const u of targets) {
                      await onRemoveFromOrgGroup(contextMenu.orgGroupId!, u.id);
                    }
                  })();
                }}
              >
                그룹에서 제거 ({multiCount}명)
              </button>
            )}
          </div>
        );
      })()}

      {addToGroupUsers && addToGroupUsers.length > 0 && (() => {
        const targets = addToGroupUsers;
        const title =
          targets.length === 1
            ? `${targets[0].name} → 그룹 선택`
            : `${targets.length}명 → 그룹 선택`;
        return (
          <div className={overlayCls} onClick={() => setAddToGroupUsers(null)}>
            <div className={modalCls} onClick={(e) => e.stopPropagation()}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>
                  {title}
                </h3>
                <UICloseButton onClick={() => setAddToGroupUsers(null)} />
              </div>
              {targets.length > 1 && (
                <p style={{ margin: '0 0 10px', fontSize: 12, color: isDark ? '#94a3b8' : '#64748b' }}>
                  {targets.map((u) => u.name).join(', ')}
                </p>
              )}
              {orgGroups.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
                    아직 그룹이 없습니다. 먼저 그룹을 만들어 주세요.
                  </p>
                  <button
                    type="button"
                    className="w-full py-2 px-4 border-none rounded-lg bg-gradient-to-br from-brand-light to-brand-dark text-white text-[13px] font-bold cursor-pointer"
                    onClick={() => {
                      setAddToGroupUsers(null);
                      onOpenCreateOrgGroupModal();
                    }}
                  >
                    + 그룹 만들기
                  </button>
                </div>
              ) : (
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {orgGroups.map((g) => {
                    const alreadyCount = targets.filter((u) => g.members.some((m) => m.id === u.id)).length;
                    const allAlready = alreadyCount === targets.length;
                    return (
                      <li key={g.id}>
                        <button
                          type="button"
                          disabled={allAlready}
                          className={cn(
                            'w-full text-left py-2.5 px-3 rounded-lg border-none cursor-pointer text-[13px] mb-1',
                            allAlready
                              ? (isDark ? 'bg-slate-700/50 text-slate-500' : 'bg-slate-100 text-slate-400')
                              : (isDark ? 'bg-slate-700 text-slate-100 hover:bg-slate-600' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'),
                          )}
                          onClick={() => void onAddToOrgGroup(g.id, targets.map((u) => u.id))}
                        >
                          {g.name}
                          <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.7 }}>
                            {allAlready
                              ? '이미 포함됨'
                              : alreadyCount > 0
                                ? `${targets.length - alreadyCount}명 추가 · ${alreadyCount}명 포함됨`
                                : `${g.members.length}명`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        );
      })()}

      {roomContextMenu && (() => {
        const estH = 180;
        const top = roomContextMenu.y + estH > window.innerHeight - 8 ? roomContextMenu.y - estH : roomContextMenu.y;
        const left = Math.min(Math.max(roomContextMenu.x, 8), window.innerWidth - 210);
        return (
          <div className={ctxMenuCls} style={{ left, top }} onClick={(e) => e.stopPropagation()}>
            <button type="button" className={ctxMenuItemCls} onClick={() => void onToggleFavorite(roomContextMenu.room)}>{roomContextMenu.room.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}</button>
            <button type="button" className={ctxMenuItemCls} onClick={() => onToggleMuteRoom(roomContextMenu.room.id)}>{mutedRoomIds.has(roomContextMenu.room.id) ? '알림 켜기' : '알림 끄기'}</button>
            {roomContextMenu.room.isGroup && roomContextMenu.room.isTopic && (
              <button type="button" className={ctxMenuItemCls} onClick={() => { setShowFolderManageModal(true); setRoomContextMenu(null); }}>폴더로 이동</button>
            )}
            <button type="button" className={cn(ctxMenuItemCls, 'text-[#c62828]')} onClick={() => void onLeaveRoom(roomContextMenu.room.id)}>나가기</button>
          </div>
        );
      })()}

      {profileModalUser && (
        <div className={overlayCls} onClick={() => setProfileModalUser(null)}>
          <div className={modalCls} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: isDark ? '#e2e8f0' : '#0f172a' }}>사용자 프로필</h3>
              <UICloseButton onClick={() => setProfileModalUser(null)} />
            </div>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}><strong>이름</strong> {profileModalUser.name}{profileModalUser.jobTitle ? ` ${profileModalUser.jobTitle}` : ''}</p>
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}><strong>이메일</strong> {profileModalUser.email}</p>
            {profileModalUser.phone && <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}><strong>연락처</strong> {profileModalUser.phone}</p>}
            <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}><strong>상태</strong> {onlineUserIds.has(String(profileModalUser.id)) ? <span style={{ color: '#4caf50', fontWeight: 600 }}>● 온라인</span> : <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>○ 오프라인</span>}</p>
            {profileModalUser.statusMessage && <p style={{ margin: '0 0 12px', fontSize: 14, color: isDark ? '#94a3b8' : '#64748b' }}><strong>상태 메시지</strong> {profileModalUser.statusMessage}</p>}
          </div>
        </div>
      )}
    </>
  );
}
