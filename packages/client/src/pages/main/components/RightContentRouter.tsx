import { memo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Event, OrgCompany, OrgUser } from '../../../api';
import type { UpdateStatus } from '../hooks/useUpdateManager';
import type { ScheduleCreateOptions } from '../hooks/useMainContentActions';
import ChatWindow from '../../ChatWindow';
import MentionPanel, { type MentionItem } from './MentionPanel';
import BookmarkPanel, { type BookmarkItem } from './BookmarkPanel';
import FriendsPanel from './FriendsPanel';
import SchedulePanel from './SchedulePanel';
import SettingsPanel from './SettingsPanel';
import DashboardHome from './DashboardHome';

type ActivePanel = 'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'settings';
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
  dashboardProps: {
    userName?: string | null;
    topicCount: number;
    chatCount: number;
    topicUnreadCount: number;
    chatUnreadCount: number;
    totalUnread: number;
    unreadMentionCount: number;
    todayEvents: Event[];
    weekEvents: { dateKey: string; label: string; count: number }[];
    setActivePanel: (panel: ActivePanel) => void;
    onEventClick?: (event: Event) => void;
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
  dashboardProps,
  settingsProps,
}: RightContentRouterProps) {
  if (selectedRoomId && activePanel === 'none') {
    return <ChatWindow key={selectedRoomId} embedded onOpenInNewWindow={() => onOpenInNewWindow(selectedRoomId)} />;
  }

  return (
    <>
      {activePanel === 'none' && (
        <DashboardHome
          isDark={isDark}
          userName={dashboardProps.userName}
          topicCount={dashboardProps.topicCount}
          chatCount={dashboardProps.chatCount}
          topicUnreadCount={dashboardProps.topicUnreadCount}
          chatUnreadCount={dashboardProps.chatUnreadCount}
          totalUnread={dashboardProps.totalUnread}
          unreadMentionCount={dashboardProps.unreadMentionCount}
          todayEvents={dashboardProps.todayEvents}
          weekEvents={dashboardProps.weekEvents}
          setActivePanel={dashboardProps.setActivePanel}
          onEventClick={dashboardProps.onEventClick}
        />
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
