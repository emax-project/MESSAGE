import { memo } from 'react';
import UICloseButton from '../../../components/ui/UICloseButton';
import RoomSections, { type RoomSectionsProps } from './RoomSections';
import { cn } from '../../../utils/cn';

type RoomsPanelProps = RoomSectionsProps & {
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  roomSearchQuery: string;
  onRoomSearchQueryChange: (value: string) => void;
};

function RoomsPanel({
  panelWrapStyle,
  roomSearchQuery,
  onRoomSearchQueryChange,
  isDark,
  ...roomSectionsProps
}: RoomsPanelProps) {
  const wrap = panelWrapStyle(820);
  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
        <h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>대화</h3>
      </div>

      <div className={cn(
        'shrink-0 flex items-center px-5 py-2.5 border-b gap-2',
        isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]',
      )}>
        <input
          type="text"
          placeholder="대화방 검색"
          aria-label="대화방 검색"
          value={roomSearchQuery}
          onChange={(e) => onRoomSearchQueryChange(e.target.value)}
          className={cn(
            'flex-1 px-2.5 py-1.5 border rounded-[6px] text-[13px] outline-none min-w-0',
            isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-900',
          )}
        />
        {roomSearchQuery.trim().length > 0 && (
          <UICloseButton
            size="sm"
            variant="subtle"
            onClick={() => onRoomSearchQueryChange('')}
            aria-label="검색어 지우기"
            title="검색어 지우기"
          />
        )}
      </div>

      <RoomSections isDark={isDark} {...roomSectionsProps} />
    </div>
  );
}

export default memo(RoomsPanel);
