import { memo } from 'react';
import UICloseButton from '../../../components/ui/UICloseButton';
import RoomSections, { type RoomSectionsProps } from './RoomSections';
import {
  PanelNoDragWrap,
  PanelTitleRow,
  PanelToolbarRow,
  usePanelNoDrag,
} from '../../../components/PanelDragHeader';
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
  const { noDragClass, noDragStyle } = usePanelNoDrag();
  const wrap = panelWrapStyle(820);
  return (
    <div className={wrap.className} style={wrap.style}>
      <PanelTitleRow isDark={isDark} title="대화" />

      <PanelToolbarRow isDark={isDark}>
        <input
          type="text"
          placeholder="대화방 검색"
          aria-label="대화방 검색"
          value={roomSearchQuery}
          onChange={(e) => onRoomSearchQueryChange(e.target.value)}
          className={cn(
            noDragClass,
            'flex-1 px-2.5 py-1.5 border rounded-[6px] text-[13px] outline-none min-w-0',
            isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-900',
          )}
          style={noDragStyle}
        />
        {roomSearchQuery.trim().length > 0 && (
          <PanelNoDragWrap>
            <UICloseButton
              size="sm"
              variant="subtle"
              onClick={() => onRoomSearchQueryChange('')}
              aria-label="검색어 지우기"
              title="검색어 지우기"
            />
          </PanelNoDragWrap>
        )}
      </PanelToolbarRow>

      <RoomSections isDark={isDark} {...roomSectionsProps} />
    </div>
  );
}

export default memo(RoomsPanel);
