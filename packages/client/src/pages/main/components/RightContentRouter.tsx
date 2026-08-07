import { lazy, memo, Suspense } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AnnouncementItem, Event, OrgCompany, OrgUser } from '../../../api';
import { getCommonMessages } from '../../../i18n';
import type { UpdateStatus } from '../hooks/useUpdateManager';
import type { ScheduleCreateOptions } from '../hooks/useMainContentActions';
import ChatWindow from '../../ChatWindow';
import type { MentionItem } from './MentionPanel';
import type { MemoItem } from './MemoPanel';
import type { RoomSectionsProps } from './RoomSections';

const NotificationPanel = lazy(() => import('./NotificationPanel'));
const RoomsPanel = lazy(() => import('./RoomsPanel'));
const OrgPanel = lazy(() => import('./OrgPanel'));
const SchedulePanel = lazy(() => import('./SchedulePanel'));
const MemoPanel = lazy(() => import('./MemoPanel'));
const SettingsPanel = lazy(() => import('./SettingsPanel'));

function PanelLoadingFallback() {
  const c = getCommonMessages();
  return (
    <div className="flex flex-1 min-h-0 items-center justify-center text-sm text-slate-500" role="status" aria-live="polite">
      {c.loading}
    </div>
  );
}

type ActivePanel = 'none' | 'notifications' | 'memo' | 'rooms' | 'schedule' | 'settings';
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
  unreadMentionCount: number;
  notificationProps: {
    items: AnnouncementItem[];
    isAdmin?: boolean;
    announcementEdit: string;
    announcementTitle: string;
    editingAnnouncementId: string | null;
    announcementSaving: boolean;
    onAnnouncementEditChange: (value: string) => void;
    onAnnouncementTitleChange: (value: string) => void;
    onStartCreateAnnouncement: () => void;
    onStartEditAnnouncement: (item: AnnouncementItem) => void;
    onCancelEditAnnouncement: () => void;
    onSaveAnnouncement: () => void | Promise<void>;
  };
  memoProps: {
    inbox: MemoItem[];
    sent: MemoItem[];
    onOpenCompose: () => void;
    onMarkRead: (memo: MemoItem) => void | Promise<void>;
    onDelete: (memo: MemoItem) => void | Promise<void>;
  };
  roomsProps: RoomSectionsProps & {
    roomSearchQuery: string;
    onRoomSearchQueryChange: (value: string) => void;
  };
  orgProps: {
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    showOnlineOnly: boolean;
    onToggleOnlineOnly: () => void;
    orgLoading: boolean;
    orgError: boolean;
    orgTree: OrgCompany[];
    companyMemberCounts?: Record<string, number>;
    treeOpen: Record<string, boolean>;
    orgStarred: Set<string>;
    onToggleOrgStar: (id: string) => void;
    onlineUserIds: Set<string>;
    myId?: string;
    myEmail?: string;
    socketConnected: boolean;
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
  settingsProps: {
    notificationsSnoozedUntil: number;
    notificationSoundEnabled: boolean;
    snoozeNotifications: (minutes: number) => void;
    clearSnooze: () => void;
    toggleNotificationSound: () => void;
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
  unreadMentionCount,
  notificationProps,
  memoProps,
  roomsProps,
  orgProps,
  scheduleProps,
  settingsProps,
}: RightContentRouterProps) {
  if (selectedRoomId && activePanel === 'none') {
    return <ChatWindow key={selectedRoomId} embedded onOpenInNewWindow={() => onOpenInNewWindow(selectedRoomId)} />;
  }

  return (
    <>
      {activePanel === 'none' && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <OrgPanel
            isDark={isDark}
            panelWrapStyle={panelWrapStyle}
            searchQuery={orgProps.searchQuery}
            onSearchQueryChange={orgProps.onSearchQueryChange}
            showOnlineOnly={orgProps.showOnlineOnly}
            onToggleOnlineOnly={orgProps.onToggleOnlineOnly}
            orgLoading={orgProps.orgLoading}
            orgError={orgProps.orgError}
            orgTree={orgProps.orgTree}
            companyMemberCounts={orgProps.companyMemberCounts}
            treeOpen={orgProps.treeOpen}
            orgStarred={orgProps.orgStarred}
            onToggleOrgStar={orgProps.onToggleOrgStar}
            onlineUserIds={orgProps.onlineUserIds}
            myId={orgProps.myId}
            myEmail={orgProps.myEmail}
            socketConnected={orgProps.socketConnected}
            onRetryOrg={orgProps.onRetryOrg}
            onToggleTree={orgProps.onToggleTree}
            onOpenDirectMessage={orgProps.onOpenDirectMessage}
            onUserContextMenu={orgProps.onUserContextMenu}
            hasStatusIcon={orgProps.hasStatusIcon}
            renderStatusIcon={orgProps.renderStatusIcon}
          />
        </Suspense>
      )}

      {activePanel === 'notifications' && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <NotificationPanel
            isDark={isDark}
            mentions={mentions}
            unreadMentionCount={unreadMentionCount}
            items={notificationProps.items}
            isAdmin={notificationProps.isAdmin}
            announcementEdit={notificationProps.announcementEdit}
            announcementTitle={notificationProps.announcementTitle}
            editingAnnouncementId={notificationProps.editingAnnouncementId}
            announcementSaving={notificationProps.announcementSaving}
            onAnnouncementEditChange={notificationProps.onAnnouncementEditChange}
            onAnnouncementTitleChange={notificationProps.onAnnouncementTitleChange}
            onStartCreateAnnouncement={notificationProps.onStartCreateAnnouncement}
            onStartEditAnnouncement={notificationProps.onStartEditAnnouncement}
            onCancelEditAnnouncement={notificationProps.onCancelEditAnnouncement}
            onSaveAnnouncement={notificationProps.onSaveAnnouncement}
            panelWrapStyle={panelWrapStyle}
            onSelectMention={onSelectMention}
          />
        </Suspense>
      )}

      {activePanel === 'memo' && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <MemoPanel
            isDark={isDark}
            inbox={memoProps.inbox}
            sent={memoProps.sent}
            panelWrapStyle={panelWrapStyle}
            onOpenCompose={memoProps.onOpenCompose}
            onMarkRead={memoProps.onMarkRead}
            onDelete={memoProps.onDelete}
          />
        </Suspense>
      )}

      {activePanel === 'rooms' && (
        <Suspense fallback={<PanelLoadingFallback />}>
          <RoomsPanel
            panelWrapStyle={panelWrapStyle}
            {...roomsProps}
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
            notificationSoundEnabled={settingsProps.notificationSoundEnabled}
            snoozeNotifications={settingsProps.snoozeNotifications}
            clearSnooze={settingsProps.clearSnooze}
            toggleNotificationSound={settingsProps.toggleNotificationSound}
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
