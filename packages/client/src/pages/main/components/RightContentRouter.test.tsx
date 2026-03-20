// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event, OrgCompany, OrgUser } from '../../../api';
import RightContentRouter from './RightContentRouter';

afterEach(() => {
  cleanup();
});

vi.mock('../../ChatWindow', () => ({
  default: ({ onOpenInNewWindow }: { onOpenInNewWindow: () => void }) => (
    <button type="button" onClick={onOpenInNewWindow}>open-chat-window</button>
  ),
}));

vi.mock('./MentionPanel', () => ({
  default: () => <div data-testid="mention-panel">mention-panel</div>,
}));

vi.mock('./BookmarkPanel', () => ({
  default: () => <div data-testid="bookmark-panel">bookmark-panel</div>,
}));

vi.mock('./FriendsPanel', () => ({
  default: () => <div data-testid="friends-panel">friends-panel</div>,
}));

vi.mock('./SchedulePanel', () => ({
  default: ({ selectedDate }: { selectedDate: string }) => <div data-testid="schedule-panel">{selectedDate}</div>,
}));

vi.mock('./SettingsPanel', () => ({
  default: () => <div data-testid="settings-panel">settings-panel</div>,
}));

vi.mock('./DashboardHome', () => ({
  default: () => <div data-testid="dashboard-home">dashboard-home</div>,
}));

const makeEvent = (): Event => ({
  id: 'ev-1',
  userId: 'user-1',
  title: 'test',
  startAt: '2026-03-18T09:00:00',
  endAt: '2026-03-18T10:00:00',
  description: 'desc',
});

const baseProps = () => ({
  isDark: false,
  isNarrowLayout: false,
  activePanel: 'none' as 'none' | 'mention' | 'bookmark' | 'friends' | 'schedule' | 'settings',
  selectedRoomId: undefined as string | undefined,
  panelWrapStyle: () => ({ className: '', style: {} }),
  onOpenInNewWindow: vi.fn<(roomId: string) => void>(),
  mentions: [],
  onSelectMention: vi.fn(),
  bookmarks: [],
  onSelectBookmark: vi.fn(),
  onRemoveBookmark: vi.fn(),
  friendsProps: {
    searchQuery: '',
    showOnlineOnly: false,
    orgLoading: false,
    orgError: false,
    orgTree: [] as OrgCompany[],
    treeOpen: {},
    onlineUserIds: new Set<string>(),
    myId: 'me',
    myEmail: 'me@emax.com',
    socketConnected: true,
    onSearchQueryChange: vi.fn(),
    onToggleOnlineOnly: vi.fn(),
    onRetryOrg: vi.fn(),
    onToggleTree: vi.fn(),
    onOpenDirectMessage: vi.fn(),
    onUserContextMenu: vi.fn<(e: React.MouseEvent<HTMLButtonElement>, user: OrgUser) => void>(),
    hasStatusIcon: vi.fn(() => false),
    renderStatusIcon: vi.fn(() => null),
  },
  dashboardProps: {
    userName: 'Test User',
    topicCount: 0,
    chatCount: 0,
    topicUnreadCount: 0,
    chatUnreadCount: 0,
    totalUnread: 0,
    unreadMentionCount: 0,
    todayEvents: [],
    weekEvents: [],
    setActivePanel: vi.fn(),
  },
  scheduleProps: {
    calendarMonth: new Date('2026-03-01T00:00:00'),
    selectedDate: '2026-03-18',
    eventsByDate: new Map<string, Event[]>(),
    eventForm: { title: '', startAt: '', endAt: '', description: '' },
    editingEventId: null,
    setCalendarMonth: vi.fn(),
    setSelectedDate: vi.fn(),
    setEventForm: vi.fn(),
    onUpdateEvent: vi.fn(),
    onCreateEvent: vi.fn(),
    onCancelEdit: vi.fn(),
    onEditEvent: vi.fn(),
    onDeleteEvent: vi.fn(),
  },
  settingsProps: {
    notificationsSnoozedUntil: 0,
    snoozeNotifications: vi.fn(),
    clearSnooze: vi.fn(),
    toggleDark: vi.fn(),
    hasElectron: false,
    appVersion: null,
    updateStatus: 'idle' as const,
    updateVersion: null,
    updateError: null,
    handleCheckForUpdates: vi.fn(),
    handleQuitAndInstall: vi.fn(),
    statusInput: '',
    statusOptions: [],
    renderStatusIcon: vi.fn(() => null),
    handleSetStatus: vi.fn(),
    notificationStatus: '지원되지 않음',
    announcementEdit: '',
    setAnnouncementEdit: vi.fn(),
    announcementSaving: false,
    onSaveAnnouncement: vi.fn(async () => {}),
    onSelectAvatarFile: vi.fn(),
    onDeleteAvatar: vi.fn(async () => {}),
    onTestNotification: vi.fn(),
    onRequestNotificationPermission: vi.fn(async () => {}),
    onLogout: vi.fn(),
    user: null,
  },
});

describe('RightContentRouter', () => {
  it('renders chat window and forwards open-in-new-window action', async () => {
    const user = userEvent.setup();
    const props = baseProps();
    props.selectedRoomId = 'room-1';

    render(<RightContentRouter {...props} />);
    await user.click(screen.getByRole('button', { name: 'open-chat-window' }));

    expect(props.onOpenInNewWindow).toHaveBeenCalledWith('room-1');
  });

  it('renders dashboard when no active panel and no selected room', () => {
    render(<RightContentRouter {...baseProps()} />);
    expect(screen.getByTestId('dashboard-home')).toBeInTheDocument();
  });

  it('routes schedule panel when active panel is schedule', () => {
    const props = baseProps();
    props.activePanel = 'schedule';
    props.scheduleProps.eventsByDate = new Map([['2026-03-18', [makeEvent()]]]);

    render(<RightContentRouter {...props} />);
    expect(screen.getByTestId('schedule-panel')).toHaveTextContent('2026-03-18');
  });

  it('routes settings panel when active panel is settings', () => {
    const props = baseProps();
    props.activePanel = 'settings';

    render(<RightContentRouter {...props} />);
    expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
  });
});
