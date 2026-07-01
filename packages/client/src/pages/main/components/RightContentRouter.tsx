import { lazy, memo, Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Event, OrgCompany, OrgUser } from '../../../api';
import { getCommonMessages } from '../../../i18n';
import type { UpdateStatus } from '../hooks/useUpdateManager';
import type { ScheduleCreateOptions } from '../hooks/useMainContentActions';
import ChatWindow from '../../ChatWindow';
import type { MentionItem } from './MentionPanel';
import type { BookmarkItem } from './BookmarkPanel';
import DashboardHome from './DashboardHome';

const MentionPanel = lazy(() => import('./MentionPanel'));
const BookmarkPanel = lazy(() => import('./BookmarkPanel'));
const FriendsPanel = lazy(() => import('./FriendsPanel'));
const SchedulePanel = lazy(() => import('./SchedulePanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));

function PanelLoadingFallback() {
  const c = getCommonMessages();
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center text-sm text-slate-500" role="status" aria-live="polite">
      {c.loading}
    </div>
  );
}

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
    orgStarred: Set<string>;
    onToggleOrgStar: (id: string) => void;
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
        <Suspense fallback={<PanelLoadingFallback />}>
          <MentionPanel isDark={isDark} mentions={mentions} panelWrapStyle={panelWrapStyle} onSelectMention={onSelectMention} />
        </Suspense>
      )}

      {activePanel === 'bookmark' && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <BookmarkPanel isDark={isDark} bookmarks={bookmarks} panelWrapStyle={panelWrapStyle} onSelectBookmark={onSelectBookmark} onRemoveBookmark={onRemoveBookmark} />
        </Suspense>
      )}

      {activePanel === 'friends' && (
        <Suspense fallback={<PanelLoadingFallback />}>
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
            orgStarred={friendsProps.orgStarred}
            onToggleOrgStar={friendsProps.onToggleOrgStar}
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
        </Suspense>
      )}

      {activePanel === 'schedule' && (
        <Suspense fallback={<PanelLoadingFallback />}>
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
        </Suspense>
      )}

      {activePanel === 'settings' && (
        <Suspense fallback={<PanelLoadingFallback />}>
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
        </Suspense>
      )}
    </>
  );
}

export default memo(RightContentRouter);
