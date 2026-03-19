import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Event, OrgCompany, OrgUser } from '../../../api';
import type { OllamaMessage } from '../../../ollama';
import type { UpdateStatus } from '../hooks/useUpdateManager';
import type { ScheduleCreateOptions } from '../hooks/useMainContentActions';
import { cn } from '../../../utils/cn';
import ChatWindow from '../../ChatWindow';
import MentionPanel, { type MentionItem } from './MentionPanel';
import BookmarkPanel, { type BookmarkItem } from './BookmarkPanel';
import FriendsPanel from './FriendsPanel';
import SchedulePanel from './SchedulePanel';
import AiPanel from './AiPanel';
import SettingsPanel from './SettingsPanel';

type ActivePanel = 'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'ai' | 'settings';
type EventFormState = { title: string; startAt: string; endAt: string; description: string };

type RightContentRouterProps = {
  isDark: boolean;
  isNarrowLayout: boolean;
  activePanel: ActivePanel;
  selectedRoomId?: string;
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  onOpenInNewWindow: (roomId: string) => void;
  mentions: MentionItem[];
  onSelectMention: (mention: MentionItem) => void | Promise<void>;
  bookmarks: BookmarkItem[];
  onSelectBookmark: (bookmark: BookmarkItem) => void;
  onRemoveBookmark: (bookmark: BookmarkItem) => void | Promise<void>;
  friendsProps: {
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
    onUserContextMenu: (e: React.MouseEvent<HTMLButtonElement>, user: OrgUser) => void;
    hasStatusIcon: (status?: string | null) => boolean;
    renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
  };
  scheduleProps: {
    calendarMonth: Date;
    selectedDate: string;
    eventsByDate: Map<string, Event[]>;
    eventForm: EventFormState;
    editingEventId: string | null;
    setCalendarMonth: Dispatch<SetStateAction<Date>>;
    setSelectedDate: Dispatch<SetStateAction<string>>;
    setEventForm: Dispatch<SetStateAction<EventFormState>>;
    onUpdateEvent: () => void | Promise<void>;
    onCreateEvent: (options?: ScheduleCreateOptions) => void | Promise<void>;
    onCancelEdit: () => void;
    onEditEvent: (ev: Event) => void;
    onDeleteEvent: (eventId: string) => void | Promise<void>;
  };
  aiProps: {
    modelName: string;
    aiMessages: OllamaMessage[];
    aiInput: string;
    aiLoading: boolean;
    setAiInput: (value: string) => void;
    onSubmitAi: () => void | Promise<void>;
    onResetAi: () => void;
  };
  settingsProps: {
    notificationsSnoozedUntil: number;
    snoozeNotifications: (minutes: number) => void;
    clearSnooze: () => void;
    toggleDark: () => void;
    hasElectron: boolean;
    appVersion: string | null;
    updateStatus: UpdateStatus;
    updateVersion: string | null;
    updateError: string | null;
    handleCheckForUpdates: () => void;
    handleQuitAndInstall: () => void;
    statusInput: string;
    statusOptions: { id: string; label: string }[];
    renderStatusIcon: (status: string, size?: number) => JSX.Element | null;
    handleSetStatus: (msg: string) => void | Promise<void>;
    notificationStatus: string;
    announcementEdit: string;
    setAnnouncementEdit: Dispatch<SetStateAction<string>>;
    announcementSaving: boolean;
    onSaveAnnouncement: () => Promise<void>;
    onSelectAvatarFile: (file: File) => void;
    onDeleteAvatar: () => Promise<void>;
    onTestNotification: () => void;
    onRequestNotificationPermission: () => void | Promise<void>;
    onLogout: () => void;
    user: { id: string; name?: string | null; avatarUrl?: string | null } | null | undefined;
  };
};

function RightContentRouter({
  isDark,
  isNarrowLayout,
  activePanel,
  selectedRoomId,
  panelWrapStyle,
  onOpenInNewWindow,
  mentions,
  onSelectMention,
  bookmarks,
  onSelectBookmark,
  onRemoveBookmark,
  friendsProps,
  scheduleProps,
  aiProps,
  settingsProps,
}: RightContentRouterProps) {
  if (selectedRoomId && activePanel === 'none') {
    return <ChatWindow key={selectedRoomId} embedded onOpenInNewWindow={() => onOpenInNewWindow(selectedRoomId)} />;
  }

  return (
    <>
      {activePanel === 'none' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className={cn(
            'w-14 h-14 rounded-full flex items-center justify-center',
            isDark ? 'bg-slate-700 text-[#a7adb4]' : 'bg-slate-100 text-[#5e6470]',
          )}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <p className={cn('text-base font-semibold m-0', isDark ? 'text-[#d1d2d3]' : 'text-[#1d1c1d]')}>채팅방을 선택하세요</p>
          <p className={cn('text-[13px] m-0', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>왼쪽 아젠다 또는 채팅에서 대화를 시작하세요</p>
        </div>
      )}

      {activePanel === 'mention' && (
        <MentionPanel isDark={isDark} mentions={mentions} panelWrapStyle={panelWrapStyle} onSelectMention={onSelectMention} />
      )}

      {activePanel === 'bookmark' && (
        <BookmarkPanel isDark={isDark} bookmarks={bookmarks} panelWrapStyle={panelWrapStyle} onSelectBookmark={onSelectBookmark} onRemoveBookmark={onRemoveBookmark} />
      )}

      {activePanel === 'friends' && (
        <FriendsPanel
          isDark={isDark}
          isNarrowLayout={isNarrowLayout}
          panelWrapStyle={panelWrapStyle}
          searchQuery={friendsProps.searchQuery}
          showOnlineOnly={friendsProps.showOnlineOnly}
          orgLoading={friendsProps.orgLoading}
          orgError={friendsProps.orgError}
          orgTree={friendsProps.orgTree}
          treeOpen={friendsProps.treeOpen}
          onlineUserIds={friendsProps.onlineUserIds}
          myId={friendsProps.myId}
          myEmail={friendsProps.myEmail}
          socketConnected={friendsProps.socketConnected}
          onSearchQueryChange={friendsProps.onSearchQueryChange}
          onToggleOnlineOnly={friendsProps.onToggleOnlineOnly}
          onRetryOrg={friendsProps.onRetryOrg}
          onToggleTree={friendsProps.onToggleTree}
          onOpenDirectMessage={friendsProps.onOpenDirectMessage}
          onUserContextMenu={friendsProps.onUserContextMenu}
          hasStatusIcon={friendsProps.hasStatusIcon}
          renderStatusIcon={friendsProps.renderStatusIcon}
        />
      )}

      {activePanel === 'schedule' && (
        <SchedulePanel
          isDark={isDark}
          isNarrowLayout={isNarrowLayout}
          panelWrapStyle={panelWrapStyle}
          calendarMonth={scheduleProps.calendarMonth}
          selectedDate={scheduleProps.selectedDate}
          eventsByDate={scheduleProps.eventsByDate}
          eventForm={scheduleProps.eventForm}
          editingEventId={scheduleProps.editingEventId}
          setCalendarMonth={scheduleProps.setCalendarMonth}
          setSelectedDate={scheduleProps.setSelectedDate}
          setEventForm={scheduleProps.setEventForm}
          onUpdateEvent={scheduleProps.onUpdateEvent}
          onCreateEvent={scheduleProps.onCreateEvent}
          onCancelEdit={scheduleProps.onCancelEdit}
          onEditEvent={scheduleProps.onEditEvent}
          onDeleteEvent={scheduleProps.onDeleteEvent}
        />
      )}

      {activePanel === 'ai' && (
        <AiPanel
          isDark={isDark}
          panelWrapStyle={panelWrapStyle}
          modelName={aiProps.modelName}
          aiMessages={aiProps.aiMessages}
          aiInput={aiProps.aiInput}
          aiLoading={aiProps.aiLoading}
          setAiInput={aiProps.setAiInput}
          onSubmitAi={aiProps.onSubmitAi}
          onResetAi={aiProps.onResetAi}
        />
      )}

      {activePanel === 'settings' && (
        <SettingsPanel
          panelWrapStyle={panelWrapStyle}
          isDark={isDark}
          isNarrowLayout={isNarrowLayout}
          user={settingsProps.user}
          notificationsSnoozedUntil={settingsProps.notificationsSnoozedUntil}
          snoozeNotifications={settingsProps.snoozeNotifications}
          clearSnooze={settingsProps.clearSnooze}
          toggleDark={settingsProps.toggleDark}
          hasElectron={settingsProps.hasElectron}
          appVersion={settingsProps.appVersion}
          updateStatus={settingsProps.updateStatus}
          updateVersion={settingsProps.updateVersion}
          updateError={settingsProps.updateError}
          handleCheckForUpdates={settingsProps.handleCheckForUpdates}
          handleQuitAndInstall={settingsProps.handleQuitAndInstall}
          statusInput={settingsProps.statusInput}
          statusOptions={settingsProps.statusOptions}
          renderStatusIcon={settingsProps.renderStatusIcon}
          handleSetStatus={settingsProps.handleSetStatus}
          notificationStatus={settingsProps.notificationStatus}
          announcementEdit={settingsProps.announcementEdit}
          setAnnouncementEdit={settingsProps.setAnnouncementEdit}
          announcementSaving={settingsProps.announcementSaving}
          onSaveAnnouncement={settingsProps.onSaveAnnouncement}
          onSelectAvatarFile={settingsProps.onSelectAvatarFile}
          onDeleteAvatar={settingsProps.onDeleteAvatar}
          onTestNotification={settingsProps.onTestNotification}
          onRequestNotificationPermission={settingsProps.onRequestNotificationPermission}
          onLogout={settingsProps.onLogout}
        />
      )}
    </>
  );
}

export default memo(RightContentRouter);
