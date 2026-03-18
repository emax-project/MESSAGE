import { memo } from 'react';
import type { CSSProperties, KeyboardEvent, MouseEvent } from 'react';
import type { Room } from '../../../api';
import GroupAvatar from '../../../components/GroupAvatar';
import RoomAvatar from '../../../components/RoomAvatar';
import UserAvatar from '../../../components/UserAvatar';

type RoomListItemProps = {
  room: Room;
  st: Record<string, CSSProperties>;
  myId?: string;
  mutedRoomIds: Set<string>;
  onOpenRoom: (room: Room) => void;
  onContextMenu: (e: MouseEvent<HTMLLIElement>, room: Room) => void;
};

function RoomListItem({
  room,
  st,
  myId,
  mutedRoomIds,
  onOpenRoom,
  onContextMenu,
}: RoomListItemProps) {
  const onKeyDown = (e: KeyboardEvent<HTMLLIElement>) => {
    if (e.key === 'Enter') onOpenRoom(room);
  };

  return (
    <li
      key={room.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpenRoom(room)}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => onContextMenu(e, room)}
      style={st.roomItem}
    >
      {room.isFavorite && (
        <span style={st.roomFavoriteIcon} aria-label="즐겨찾기">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      )}
      <div style={st.roomAvatar} aria-hidden>
        {room.isGroup && !room.isTopic && Array.isArray(room.members) && room.members.length > 0 ? (
          <GroupAvatar
            members={room.members.map((m) => ({
              id: m.id ?? (m as { user?: { id: string } }).user?.id ?? '',
              name: m.name ?? (m as { user?: { name: string } }).user?.name,
              avatarUrl: (m as { avatarUrl?: string }).avatarUrl,
            }))}
            myId={myId}
            size={32}
          />
        ) : !room.isGroup && Array.isArray(room.members) && room.members.length > 0 ? (
          (() => {
            const members = room.members as { id?: string; userId?: string; user?: { id: string; name: string; email: string }; name?: string; avatarUrl?: string }[];
            const other = members.find((m) => (m.id ?? m.user?.id) !== myId) ?? members[0];
            const otherId = other?.id ?? (other as { user?: { id: string } })?.user?.id;
            const otherName = other?.name ?? (other as { user?: { name: string } })?.user?.name;
            const hasUserAvatar = !!((other as { avatarUrl?: string })?.avatarUrl);
            return hasUserAvatar ? (
              <UserAvatar
                userId={otherId || ''}
                name={otherName || room.name || ''}
                avatarUrlPath={(other as { avatarUrl?: string }).avatarUrl}
                imgStyle={st.roomAvatarImg}
                initialStyle={st.roomAvatarInitial}
              />
            ) : (
              <RoomAvatar
                roomId={room.id}
                name={room.name || otherName || ''}
                initials={null}
                hasAvatar={false}
                avatarUrlPath={null}
                imgStyle={st.roomAvatarImg}
                initialStyle={st.roomAvatarInitial}
              />
            );
          })()
        ) : (
          <RoomAvatar
            roomId={room.id}
            name={room.name || ''}
            initials={room.initials}
            hasAvatar={!!room.avatarUrl}
            avatarUrlPath={room.avatarUrl}
            imgStyle={st.roomAvatarImg}
            initialStyle={st.roomAvatarInitial}
          />
        )}
      </div>
      <div style={st.roomInfo}>
        <div style={st.roomName}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: '1 1 0', minWidth: 0 }}>{room.name}</span>
          {room.isGroup && room.isTopic && room.viewMode && (
            <span style={st.roomViewModeBadge} title={room.viewMode === 'board' ? '보드뷰: 게시글 기반' : '챗뷰: 메시지 기반'}>
              {room.viewMode === 'board' ? '보드뷰' : '챗뷰'}
            </span>
          )}
        </div>
        <div style={st.roomPreview}>{room.lastMessage ? room.lastMessage.content : ''}</div>
      </div>
      <div style={st.roomMeta}>
        {room.lastMessage && <span style={st.roomTime}>{new Date(room.lastMessage.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>}
        {mutedRoomIds.has(room.id) && <span style={st.roomMuted} title="알림 꺼짐">음소거</span>}
        {(room.unreadCount ?? 0) > 0 && <span style={st.roomUnreadBadge}>{room.unreadCount! > 99 ? '99+' : room.unreadCount}</span>}
      </div>
    </li>
  );
}

export default memo(RoomListItem);
