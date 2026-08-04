// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Event } from '../../../api';
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

vi.mock('./RoomsPanel', () => ({
  default: () => <div data-testid="rooms-panel">rooms-panel</div>,
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
  activePanel: 'none' as 'none' | 'mention' | 'bookmark' | 'rooms' | 'schedule' | 'settings',
  selectedRoomId: undefined as string | undefined,
  panelWrapStyle: () => ({ className: '', style: {} }),
  onOpenInNewWindow: vi.fn<(roomId: string) => void>(),
  mentions: [],
  onSelectMention: vi.fn(),
  bookmarks: [],
  onSelectBookmark: vi.fn(),
  onRemoveBookmark: vi.fn(),
  roomsProps: {
    isDark: false,
    roomsError: false,
    folders: [],
    topicRooms: [],
    chatRooms: [],
    topicUnreadCount: 0,
    chatUnreadCount: 0,
    sectionOpen: { topic: true, chat: true },
    roomsByFolder: new Map(),
    folderOpen: {},
    publicRooms: [],
    allRooms: [],
    toggleSection: vi.fn(),
    toggleFolder: vi.fn(),
    setShowFolderManageModal: vi.fn(),
    setCreateGroupFor: vi.fn(),
    setShowCreateGroupModal: vi.fn(),
    renderRoomItem: vi.fn(() => <li />),
    onJoinPublicRoom: vi.fn(),
    roomSearchQuery: '',
    onRoomSearchQueryChange: vi.fn(),
  },
  dashboardProps: {
    userName: 'Test User',
    topicCount: 0,
    chatCount: 0,
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

  it('routes schedule panel when active panel is schedule', async () => {
    const props = baseProps();
    props.activePanel = 'schedule';
    props.scheduleProps.eventsByDate = new Map([['2026-03-18', [makeEvent()]]]);

    render(<RightContentRouter {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId('schedule-panel')).toHaveTextContent('2026-03-18');
    });
  });

  it('routes rooms panel when active panel is rooms', async () => {
    const props = baseProps();
    props.activePanel = 'rooms';

    render(<RightContentRouter {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId('rooms-panel')).toBeInTheDocument();
    });
  });

  it('routes settings panel when active panel is settings', async () => {
    const props = baseProps();
    props.activePanel = 'settings';

    render(<RightContentRouter {...props} />);
    await waitFor(() => {
      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
  });
});
