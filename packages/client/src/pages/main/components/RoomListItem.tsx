import { memo } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Room } from '../../../api';
import GroupAvatar from '../../../components/GroupAvatar';
import RoomAvatar from '../../../components/RoomAvatar';
import UserAvatar from '../../../components/UserAvatar';
import { useThemeStore } from '../../../store';
import { cn } from '../../../utils/cn';

type RoomListItemProps = {
  room: Room;
  myId?: string;
  mutedRoomIds: Set<string>;
  onOpenRoom: (room: Room) => void;
  onContextMenu: (e: MouseEvent<HTMLLIElement>, room: Room) => void;
};

const avatarImgStyle = { width: '100%', height: '100%', objectFit: 'cover' as const, borderRadius: 10 };

function RoomListItem({
  room,
  myId,
  mutedRoomIds,
  onOpenRoom,
  onContextMenu,
}: RoomListItemProps) {
  const isDark = useThemeStore((s) => s.isDark);

  const initialStyle = { fontSize: 12, fontWeight: 700 as const, color: isDark ? '#e2e8f0' : 'rgba(60,30,30,0.85)' };

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
      className={cn(
        'px-3.5 py-2 border-b cursor-pointer flex items-center gap-2',
        isDark ? 'border-b-[#334155]' : 'border-b-slate-200',
      )}
    >
      {room.isFavorite && (
        <span
          className={cn('w-5 h-5 shrink-0 flex items-center justify-center', isDark ? 'text-[#fbbf24]' : 'text-[#f59e0b]')}
          aria-label="즐겨찾기"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </span>
      )}
      <div
        className={cn(
          'w-8 h-8 rounded-[10px] shrink-0 flex items-center justify-center overflow-hidden',
          isDark ? 'bg-[#475569]' : 'bg-[#e2e8f0]',
        )}
        aria-hidden
      >
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
                imgStyle={avatarImgStyle}
                initialStyle={initialStyle}
              />
            ) : (
              <RoomAvatar
                roomId={room.id}
                name={room.name || otherName || ''}
                initials={null}
                hasAvatar={false}
                avatarUrlPath={null}
                imgStyle={avatarImgStyle}
                initialStyle={initialStyle}
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
            imgStyle={avatarImgStyle}
            initialStyle={initialStyle}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('font-semibold text-xs mb-px flex items-center gap-1.5', isDark ? 'text-slate-200' : 'text-slate-900')}>
          <span className="overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">{room.name}</span>
          {room.isGroup && room.isTopic && room.viewMode && (
            <span
              className={cn(
                'text-[10px] shrink-0 py-px px-[5px] rounded',
                isDark ? 'text-slate-400 bg-white/[0.08]' : 'text-slate-500 bg-slate-100',
              )}
              title={room.viewMode === 'board' ? '보드뷰: 게시글 기반' : '챗뷰: 메시지 기반'}
            >
              {room.viewMode === 'board' ? '보드뷰' : '챗뷰'}
            </span>
          )}
        </div>
        <div className={cn('text-[11px] overflow-hidden text-ellipsis whitespace-nowrap', isDark ? 'text-slate-400' : 'text-slate-500')}>
          {room.lastMessage ? room.lastMessage.content : ''}
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-[3px]">
        {room.lastMessage && (
          <span className={cn('text-[10px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {new Date(room.lastMessage.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
        {mutedRoomIds.has(room.id) && <span className="text-[10px] text-[#94a3b8]" title="알림 꺼짐">음소거</span>}
        {(room.unreadCount ?? 0) > 0 && (
          <span className="min-w-[18px] h-[18px] px-[5px] rounded-[9px] bg-[#74A0FF] text-white text-[10px] font-bold flex items-center justify-center">
            {room.unreadCount! > 99 ? '99+' : room.unreadCount}
          </span>
        )}
      </div>
    </li>
  );
}

export default memo(RoomListItem);
