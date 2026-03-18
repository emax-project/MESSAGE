import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient, useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useThemeStore, useToastStore } from '../store';
import { roomsApi, filesApi, eventsApi, pollsApi, projectsApi, bookmarksApi, getSocketUrl, getBaseUrl, navigateToLogin, type Room, type Message, type ReactionGroup, type FileInfo, type User, type PinnedMessageItem } from '../api';
import { ollamaSummarize } from '../ollama';
import FileMessage from '../components/FileMessage';
import FileUploadButton from '../components/FileUploadButton';
import InviteModal from '../components/InviteModal';
import RoomSettingsModal from '../components/RoomSettingsModal';
import EventCard from '../components/EventCard';
import PollCard from '../components/PollCard';
import PollCreateModal from '../components/PollCreateModal';
import ForwardModal from '../components/ForwardModal';
import EmojiPicker from '../components/EmojiPicker';
import MentionPopup from '../components/MentionPopup';
import PinnedMessages from '../components/PinnedMessages';
import TaskCreateModal from '../components/TaskCreateModal';
import TitleBar from '../components/TitleBar';
import LinkPreview, { extractFirstUrl } from '../components/LinkPreview';
import ContextAttachModal, { type MessageContext } from '../components/ContextAttachModal';
import { getThemeTokens } from '../components/ui/themeTokens';
import UICloseButton from '../components/ui/UICloseButton';

const MAX_DROP_SIZE = 2 * 1024 * 1024 * 1024;
const EDIT_LIMIT_MS = 5 * 60 * 1000;
const SCROLL_BOTTOM_THRESHOLD = 80;
const RIGHT_SIDEBAR_PANEL_WIDTH = 280;
const RIGHT_SIDEBAR_ICON_WIDTH = 48;

function isSystemMessage(content: string): boolean {
  return /님이\s.+님을\s초대했습니다$/.test(content) || content === '[파일 만료됨]' || /님이 채팅방을 나갔습니다$/.test(content);
}

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function canEditOrDelete(msg: Message, myId?: string): boolean {
  if (!myId || msg.senderId !== myId || msg.deletedAt) return false;
  return Date.now() - new Date(msg.createdAt).getTime() < EDIT_LIMIT_MS;
}

// Style functions for dark mode support (must be before components that use them)
const chatWindowStyles = {
  appWrap: (dark: boolean): React.CSSProperties => {
    const t = getThemeTokens(dark);
    return { display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: t.bgBase };
  },
  layout: (dark: boolean): React.CSSProperties => {
    const t = getThemeTokens(dark);
    return { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, background: t.bgBase, position: 'relative' };
  },
  loading: (dark: boolean): React.CSSProperties => ({ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: getThemeTokens(dark).textMuted, fontSize: 16 }),
  chatHeader: (dark: boolean): React.CSSProperties => {
    const t = getThemeTokens(dark);
    return { padding: '0 20px', height: 56, minHeight: 56, borderBottom: `1px solid ${t.border}`, background: t.bgSurface, boxShadow: dark ? 'none' : '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
  },
  chatHeaderName: (dark: boolean): React.CSSProperties => ({ fontSize: 16, fontWeight: 700, color: getThemeTokens(dark).textStrong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }),
  headerIconBtn: (dark: boolean): React.CSSProperties => ({ width: 34, height: 34, borderRadius: 8, border: 'none', background: dark ? '#334155' : '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'background 0.15s' }),
  messages: (dark: boolean): React.CSSProperties => ({ flex: 1, overflowX: 'hidden', overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10, background: getThemeTokens(dark).bgBase }),
  scrollToBottomBtn: (dark: boolean): React.CSSProperties => ({
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: dark ? '#334155' : '#fff',
    color: dark ? '#e2e8f0' : '#475569',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  }),
  dateSeparator: (): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0' }),
  dateSeparatorText: (): React.CSSProperties => ({ fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '4px 14px', borderRadius: 12 }),
  unreadDivider: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '10px 16px',
    margin: '8px 16px',
    borderLeft: '4px solid #171717',
    background: dark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
    borderRadius: 8,
    animation: 'unread-divider-pulse 2s ease-in-out 3',
  }),
  unreadDividerText: (dark: boolean): React.CSSProperties => ({
    fontSize: 12,
    fontWeight: 600,
    color: dark ? '#404040' : '#171717',
  }),
  systemMessageRow: (): React.CSSProperties => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0' }),
  systemMessageText: (): React.CSSProperties => ({ fontSize: 12, color: '#fff', background: 'rgba(0,0,0,0.25)', padding: '4px 14px', borderRadius: 12, textAlign: 'center' }),
  messageRow: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%' }),
  messageRowMine: (): React.CSSProperties => ({ alignItems: 'flex-end' }),
  messageRowInner: (): React.CSSProperties => ({ display: 'flex', alignItems: 'flex-start', gap: 8, width: '100%' }),
  avatarWrap: (): React.CSSProperties => ({ width: 34, height: 34, flexShrink: 0 }),
  avatarSpacer: (): React.CSSProperties => ({ width: 34, height: 34, flexShrink: 0 }),
  avatarCircle: (dark: boolean): React.CSSProperties => ({ width: 34, height: 34, borderRadius: '50%', background: dark ? '#334155' : '#e2e8f0', color: dark ? '#94a3b8' : '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }),
  messageBubble: (dark: boolean): React.CSSProperties => ({ minWidth: 80, padding: '10px 14px', borderRadius: 16, borderTopLeftRadius: 4, background: dark ? '#334155' : '#fff', color: dark ? '#e2e8f0' : '#1e293b', boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)', wordBreak: 'break-word', overflowWrap: 'break-word' }),
  messageBubbleMine: (dark: boolean): React.CSSProperties => ({ borderTopLeftRadius: 16, borderTopRightRadius: 4, background: dark ? '#475569' : '#475569', color: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }),
  senderLabel: (dark: boolean): React.CSSProperties => ({ fontSize: 12, color: dark ? '#94a3b8' : '#475569', marginBottom: 4, marginLeft: 42 }),
  metaCol: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4, fontSize: 11, color: '#64748b', flexShrink: 0, minWidth: 36 }),
  metaColMine: (): React.CSSProperties => ({ alignItems: 'flex-end' }),
  metaTime: (dark: boolean): React.CSSProperties => ({ fontSize: 11, color: dark ? '#64748b' : '#64748b' }),
  messageContent: (): React.CSSProperties => ({ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.4 }),
  // Board card footer background is neutral, so use accent color.
  readStatusMineBoard: (dark: boolean): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, color: getThemeTokens(dark).primary }),
  // My chat bubble background is slate (#475569), so keep unread count near-white for contrast.
  readStatusMineBubble: (): React.CSSProperties => ({ fontSize: 12, fontWeight: 700, color: '#f8fafc' }),
  replyPreview: (dark: boolean, isMine: boolean): React.CSSProperties => ({
    marginLeft: isMine ? 0 : 42,
    marginBottom: 6,
    padding: '8px 12px',
    borderRadius: 10,
    background: dark ? 'rgba(51, 65, 85, 0.6)' : 'rgba(241, 245, 249, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    maxWidth: '85%',
    overflow: 'hidden',
    boxShadow: dark ? '0 1px 2px rgba(0,0,0,0.1)' : '0 1px 3px rgba(0,0,0,0.06)',
    cursor: 'pointer',
  }),
  replyPreviewLabel: (dark: boolean): React.CSSProperties => ({
    fontSize: 11,
    fontWeight: 600,
    color: dark ? '#94a3b8' : '#64748b',
    letterSpacing: '0.02em',
  }),
  replyPreviewContent: (dark: boolean): React.CSSProperties => ({
    fontSize: 13,
    color: dark ? '#94a3b8' : '#475569',
    lineHeight: 1.35,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  reactionsRow: (isMine: boolean): React.CSSProperties => ({ display: 'flex', gap: 4, flexWrap: 'wrap', marginLeft: isMine ? 0 : 42, marginTop: 4 }),
  reactionBadge: (dark: boolean, voted: boolean): React.CSSProperties => ({ border: `1px solid ${voted ? (dark ? '#60a5fa' : '#2563eb') : (dark ? '#475569' : '#e5e7eb')}`, borderRadius: 12, padding: '2px 8px', fontSize: 13, background: voted ? (dark ? 'rgba(96,165,250,0.15)' : 'rgba(37,99,235,0.08)') : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }),
  hoverActionBtn: (dark: boolean): React.CSSProperties => ({ width: 28, height: 28, borderRadius: '50%', border: 'none', background: dark ? '#475569' : '#f0f0f0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: dark ? '#94a3b8' : '#555', padding: 0 }),
  ctxMenu: (dark: boolean): React.CSSProperties => ({ position: 'fixed', zIndex: 10000, minWidth: 120, padding: 4, background: dark ? '#334155' : '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.15)', border: `1px solid ${dark ? '#475569' : '#eee'}` }),
  ctxMenuItem: (dark: boolean): React.CSSProperties => ({ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', borderRadius: 6, fontSize: 13, color: dark ? '#e2e8f0' : '#333', textAlign: 'left', cursor: 'pointer' }),
  searchBar: (dark: boolean): React.CSSProperties => ({ display: 'flex', gap: 6, padding: '8px 16px', borderBottom: `1px solid ${getThemeTokens(dark).border}`, background: getThemeTokens(dark).bgSurface }),
  searchInput: (dark: boolean): React.CSSProperties => ({ flex: 1, padding: '8px 12px', border: `1px solid ${getThemeTokens(dark).border}`, borderRadius: 8, fontSize: 13, background: getThemeTokens(dark).bgMuted, color: getThemeTokens(dark).text, outline: 'none' }),
  searchBtn: (dark: boolean): React.CSSProperties => ({
    height: 32,
    minHeight: 32,
    padding: '0 14px',
    border: 'none',
    borderRadius: 8,
    background: getThemeTokens(dark).primary,
    color: '#fff',
    fontSize: 13,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  }),
  searchResults: (dark: boolean): React.CSSProperties => ({ maxHeight: 200, overflow: 'auto', borderBottom: `1px solid ${dark ? '#334155' : '#eee'}`, background: dark ? '#1e293b' : '#fff' }),
  searchResultItem: (dark: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', borderBottom: `1px solid ${dark ? '#334155' : '#f0f0f0'}`, fontSize: 13 }),
  replyIndicator: (dark: boolean): React.CSSProperties => ({ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderTop: `1px solid ${dark ? '#334155' : '#eee'}`, background: dark ? '#1e293b' : '#f8fafc' }),
  inputRow: (dark: boolean): React.CSSProperties => ({
    padding: '10px 16px 14px',
    display: 'flex',
    gap: 10,
    alignItems: 'center',
    background: getThemeTokens(dark).bgSurface,
    borderTop: `1px solid ${getThemeTokens(dark).border}`,
  }),
  inputRowLeft: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  }),
  inputRowCenter: (): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  }),
  inputRowRight: (): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
  }),
  plusWrap: (): React.CSSProperties => ({ position: 'relative', flexShrink: 0 }),
  plusBtn: (dark: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: dark ? '#334155' : '#f1f5f9',
    color: dark ? '#94a3b8' : '#475569',
    fontSize: 20,
    lineHeight: '40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'background 0.15s',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }),
  plusMenu: (dark: boolean): React.CSSProperties => ({ position: 'absolute', bottom: 48, left: 0, background: dark ? '#334155' : '#fff', border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`, borderRadius: 12, boxShadow: dark ? '0 6px 24px rgba(0,0,0,0.3)' : '0 6px 24px rgba(0,0,0,0.1)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 150, zIndex: 50 }),
  plusMenuItem: (dark: boolean): React.CSSProperties => ({ border: 'none', background: 'transparent', borderRadius: 8, padding: '9px 12px', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: dark ? '#e2e8f0' : '#334155', transition: 'background 0.1s' }),
  input: (dark: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '10px 16px',
    border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`,
    borderRadius: 20,
    fontSize: 14,
    lineHeight: 1.4,
    minHeight: 42,
    maxHeight: 120,
    resize: 'none',
    background: dark ? '#0f172a' : '#f8fafc',
    color: dark ? '#e2e8f0' : '#1e293b',
    outline: 'none',
    transition: 'border-color 0.15s, box-shadow 0.15s',
    fontFamily: 'inherit',
  }),
  sendBtn: (dark: boolean, disabled: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    background: disabled ? (dark ? '#334155' : '#cbd5e1') : '#475569',
    color: '#fff',
    border: 'none',
    borderRadius: 20,
    fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: 14,
    transition: 'background 0.15s, opacity 0.15s',
    opacity: disabled ? 0.9 : 1,
    whiteSpace: 'nowrap',
  }),
  dropOverlay: (): React.CSSProperties => ({ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }),
  dropContent: (): React.CSSProperties => ({ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }),
  dropText: (): React.CSSProperties => ({ color: '#fff', fontSize: 16, fontWeight: 600 }),
  shareEventOverlay: (): React.CSSProperties => ({ position: 'absolute', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  shareEventModal: (dark: boolean): React.CSSProperties => ({ background: dark ? '#1e293b' : '#fff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', minWidth: 320, maxWidth: '90%', maxHeight: '70vh', overflow: 'auto', padding: 20 }),
  boardCard: (dark: boolean): React.CSSProperties => ({
    width: '100%',
    maxWidth: '100%',
    padding: 16,
    borderRadius: 12,
    background: dark ? '#1e293b' : '#fff',
    border: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
    boxShadow: dark ? '0 1px 3px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  }),
  boardCardHeader: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
    borderColor: dark ? 'transparent' : 'transparent',
  }),
  boardCardHeaderLeft: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    color: dark ? 'inherit' : 'inherit',
  }),
  boardCardAvatar: (dark: boolean): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: dark ? '#334155' : '#e5e7eb',
    color: dark ? '#94a3b8' : '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 15,
    fontWeight: 700,
    flexShrink: 0,
  }),
  boardCardAuthor: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
    minWidth: 0,
    color: dark ? 'inherit' : 'inherit',
  }),
  boardCardAuthorName: (dark: boolean): React.CSSProperties => ({ fontSize: 14, fontWeight: 600, color: dark ? '#e2e8f0' : '#111827' }),
  boardCardTime: (dark: boolean): React.CSSProperties => ({ fontSize: 12, color: dark ? '#94a3b8' : '#6b7280', flexShrink: 0 }),
  boardCardBody: (dark: boolean): React.CSSProperties => ({
    fontSize: 14,
    color: dark ? '#e2e8f0' : '#374151',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.6,
    paddingLeft: 0,
  }),
  boardCardFooter: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTop: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
    fontSize: 12,
    color: dark ? '#94a3b8' : '#6b7280',
  }),
  boardCardFooterBtn: (dark: boolean): React.CSSProperties => ({
    padding: '4px 10px',
    border: `1px solid ${dark ? '#475569' : '#e5e7eb'}`,
    borderRadius: 8,
    background: dark ? '#334155' : '#f9fafb',
    color: dark ? '#94a3b8' : '#6b7280',
    fontSize: 12,
    cursor: 'pointer',
  }),
  boardMenuBtn: (dark: boolean): React.CSSProperties => ({
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    padding: 6,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    flexShrink: 0,
    ...(dark ? {} : {}),
  }),
  boardCommentSection: (dark: boolean): React.CSSProperties => ({
    borderTop: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
    paddingTop: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }),
  boardCommentRow: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    padding: '4px 0',
    borderBottom: `1px solid ${dark ? 'rgba(51,65,85,0.4)' : 'rgba(229,231,235,0.6)'}`,
    paddingBottom: 10,
  }),
  boardCommentAvatar: (dark: boolean): React.CSSProperties => ({
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: dark ? '#334155' : '#e5e7eb',
    color: dark ? '#94a3b8' : '#6b7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 11,
    fontWeight: 700,
    flexShrink: 0,
  }),
  boardCommentInputRow: (dark: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    borderTop: `1px solid ${dark ? '#334155' : '#e5e7eb'}`,
    paddingTop: 10,
  }),
  boardCommentInput: (dark: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '8px 12px',
    border: `1px solid ${dark ? '#475569' : '#e2e8f0'}`,
    borderRadius: 20,
    fontSize: 13,
    background: dark ? '#0f172a' : '#f8fafc',
    color: dark ? '#e2e8f0' : '#1e293b',
    outline: 'none',
  }),
  boardCommentSendBtn: (dark: boolean): React.CSSProperties => ({
    padding: '6px 14px',
    border: 'none',
    borderRadius: 16,
    background: dark ? '#475569' : '#3b82f6',
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
  }),
};

const s = chatWindowStyles;

function RightPanelMembers({ members, isDark, onInvite, canInvite = true }: { members: User[]; isDark: boolean; onInvite: () => void; canInvite?: boolean }) {
  const safeMembers = Array.isArray(members) ? members : [];
  return (
    <>
      {canInvite && (
      <button
        type="button"
        onClick={onInvite}
        style={{
          width: '100%',
          padding: '10px 14px',
          borderRadius: 8,
          border: 'none',
          background: isDark ? '#334155' : '#f1f5f9',
          color: isDark ? '#94a3b8' : '#475569',
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
        </svg>
        초대하기
      </button>
      )}
      {safeMembers.length === 0 ? (
        <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 14 }}>멤버가 없습니다</p>
      ) : (
        safeMembers.map((m) => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, marginBottom: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>
              {m.name?.trim()?.[0]?.toUpperCase() || '?'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{m.name}</div>
              {m.email && <div style={{ fontSize: 12, color: isDark ? '#64748b' : '#999' }}>{m.email}</div>}
            </div>
          </div>
        ))
      )}
    </>
  );
}

function RightPanelPins({ roomId, isDark }: { roomId: string; isDark: boolean }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['rooms', roomId, 'pins'],
    queryFn: () => roomsApi.getPins(roomId),
    enabled: !!roomId,
  });
  const pins = data?.pins ?? [];

  const handleUnpin = async (messageId: string) => {
    try {
      await roomsApi.unpinMessage(roomId, messageId);
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    } catch (err) {
      console.error(err);
    }
  };

  if (pins.length === 0) {
    return <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 14, marginTop: 24 }}>고정된 메시지가 없습니다</p>;
  }

  return (
    <>
      {pins.map((p: PinnedMessageItem) => (
        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '10px 12px', borderRadius: 8, marginBottom: 8, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b' }}>{p.message.sender.name}</span>
            <button type="button" onClick={() => handleUnpin(p.message.id)} style={{ border: 'none', background: 'none', color: '#c62828', cursor: 'pointer', fontSize: 11, padding: '2px 6px', flexShrink: 0 }}>
              해제
            </button>
          </div>
          <div style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 48 }}>
            {p.message.content}
          </div>
          <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>{new Date(p.message.createdAt).toLocaleString('ko-KR')}</div>
        </div>
      ))}
    </>
  );
}

// 프로토콜 있는 URL + 도메인만(naver.com, www.google.com 등) + @멘션
const LINK_SPLIT_REGEX = /(https?:\/\/[^\s<>"']+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}|@\S+)/gi;

function renderLink(key: number, href: string, label: string, linkColor: string): React.ReactNode {
  const openExternal = window.electronAPI?.openExternal;
  return (
    <a
      key={key}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-all', cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        if (openExternal) {
          e.preventDefault();
          openExternal(href);
        }
      }}
    >
      {label}
    </a>
  );
}

function renderContentWithMentions(content: string, isDark: boolean): React.ReactNode {
  const parts = content.split(LINK_SPLIT_REGEX);
  const linkColor = isDark ? '#60a5fa' : '#2563eb';
  return parts.map((part, i) => {
    if (/^https?:\/\//i.test(part)) {
      const href = part.replace(/[.,;:!?)]+$/, '');
      return renderLink(i, href, part, linkColor);
    }
    if (
      /^(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}$/i.test(part) &&
      !/\.(?:pdf|jpg|jpeg|png|gif|doc|docx|xls|xlsx|zip|txt|pptx|hwp)$/i.test(part)
    ) {
      const href = part.replace(/[.,;:!?)]+$/, '');
      const url = href.startsWith('http') ? href : `https://${href}`;
      return renderLink(i, url, part, linkColor);
    }
    if (part.startsWith('@')) {
      return <span key={i} style={{ color: linkColor, fontWeight: 600 }}>{part}</span>;
    }
    return part;
  });
}

type ChatWindowProps = { embedded?: boolean; onOpenInNewWindow?: () => void };

export default function ChatWindow({ embedded, onOpenInNewWindow }: ChatWindowProps = {}) {
  const { roomId } = useParams<{ roomId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);
  const [input, setInput] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [shareEventOpen, setShareEventOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Message[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editingMsg, setEditingMsg] = useState<Message | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; message: Message } | null>(null);
  const [forwardOpen, setForwardOpen] = useState<string | null>(null);
  const [emojiPickerMsg, setEmojiPickerMsg] = useState<string | null>(null);
  const [pollCreateOpen, setPollCreateOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
  const [taskFromMessage, setTaskFromMessage] = useState<{ title: string; messageId: string } | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [threadOpen, setThreadOpen] = useState<{ parentId: string; parent: Message; replies: Message[] } | null>(null);
  const [fileDrawerData, setFileDrawerData] = useState<FileInfo[]>([]);
  const [rightPanel, setRightPanel] = useState<'none' | 'file' | 'members' | 'pins'>('none');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);
  const [messageContext, setMessageContext] = useState<MessageContext | null>(null);
  useEffect(() => {
    setRightPanel('none');
  }, [roomId]);
  const [boardCommentInputs, setBoardCommentInputs] = useState<Record<string, string>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const summaryDismissedRef = useRef(false);
  const socketRef = useRef<Socket | null>(null);
  const myIdRef = useRef<string | undefined>(myId);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const firstUnreadRef = useRef<HTMLDivElement>(null);
  const initialScrollDoneRef = useRef(false);
  const prevScrollHeightRef = useRef(0);
  const prevPageCountRef = useRef(0);
  const prevMsgCountRef = useRef(0);
  const lastMarkReadRef = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const checkAtBottom = () => {
    const el = messagesScrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
    setShowScrollToBottom(!atBottom);
  };
  const scrollToBottom = () => {
    messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: 'auto' });
  };
  const queryClient = useQueryClient();
  myIdRef.current = myId;

  const { data: roomsList = [] } = useQuery({
    queryKey: ['rooms', myId],
    queryFn: roomsApi.list,
    enabled: !!myId && !!roomId,
  });

  const { data: room, isLoading: roomLoading } = useQuery({
    queryKey: ['rooms', roomId],
    queryFn: async () => {
      if (!roomId) return Promise.reject(new Error('no roomId'));
      // list를 먼저 로드해 viewMode 동기화 (보드뷰가 챗뷰로 보이는 문제 방지)
      const list = myId
        ? await queryClient.ensureQueryData<Room[]>({ queryKey: ['rooms', myId], queryFn: roomsApi.list, staleTime: 0 })
        : queryClient.getQueryData<Room[]>(['rooms', myId]);
      const data = await roomsApi.get(roomId);
      const fromList = list?.find((r) => r.id === roomId)?.viewMode;
      const apiViewMode = (data as Room).viewMode;
      if (fromList === 'board' && apiViewMode !== 'board') {
        return { ...data, viewMode: 'board' as const } as Room;
      }
      return data as Room;
    },
    enabled: !!roomId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  type MessagesPage = { messages: Message[]; nextCursor: string | null; hasMore: boolean };

  const {
    data: messagesInfinite,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['rooms', roomId, 'messages'],
    queryFn: ({ pageParam }) => (roomId ? roomsApi.messages(roomId, pageParam as string | undefined) : Promise.resolve({ messages: [], nextCursor: null, hasMore: false })),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage: MessagesPage) => lastPage.hasMore ? (lastPage.nextCursor ?? undefined) : undefined,
    enabled: !!roomId,
  });
  const { data: myEvents = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
    enabled: !!token && !!shareEventOpen,
  });
  const messages = useMemo(
    () => (messagesInfinite?.pages ?? []).flatMap((p) => (p?.messages ?? []).filter(Boolean)),
    [messagesInfinite]
  );

  const handleLoadMore = () => {
    if (messagesScrollRef.current) {
      prevScrollHeightRef.current = messagesScrollRef.current.scrollHeight;
    }
    fetchNextPage();
  };

  const viewModeFromListNow = roomId ? roomsList.find((r) => r.id === roomId)?.viewMode : undefined;
  useEffect(() => {
    if (roomId && room && viewModeFromListNow === 'board' && room?.viewMode !== 'board') {
      queryClient.setQueryData(['rooms', roomId], { ...room, viewMode: 'board' as const });
    }
  }, [roomId, room, viewModeFromListNow, queryClient]);

  useEffect(() => {
    const t = setTimeout(checkAtBottom, 100);
    return () => clearTimeout(t);
  }, [messages.length, roomId]);

  // 스크롤 상단 sentinel - 이전 메시지 로드
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage]);

  // 이전 페이지 로드 완료 시 스크롤 위치 보정
  useEffect(() => {
    const pageCount = messagesInfinite?.pages?.length ?? 0;
    if (pageCount > prevPageCountRef.current && prevPageCountRef.current > 0) {
      const el = messagesScrollRef.current;
      if (el) {
        const diff = el.scrollHeight - prevScrollHeightRef.current;
        el.scrollTop += diff;
      }
    }
    prevPageCountRef.current = pageCount;
  }, [messagesInfinite?.pages.length]);

  // 채팅창이 열리면 입력 칸에 포커스
  useEffect(() => {
    if (!roomId || !room) return;
    const t = setTimeout(() => inputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, [roomId, room]);

  // Socket connection
  useEffect(() => {
    if (!token || !roomId) return;
    if (socketRef.current?.connected) return;
    const url = getSocketUrl();
    const s = io(url, { path: '/socket.io', auth: { token } });
    socketRef.current = s;
    s.on('connect_error', (err: { message?: string }) => {
      if (err?.message?.includes('invalid token')) {
        try {
          localStorage.setItem('forcedLogoutMessage', '다른 기기에서 로그인되어 로그아웃되었습니다.');
          localStorage.removeItem('token');
          if (typeof window !== 'undefined') navigateToLogin();
        } catch {
          // ignore
        }
      }
    });
    s.on('error', (payload: { code?: string; message?: string }) => {
      console.error('[Socket error]', payload);
    });
    s.on('connect', () => s.emit('join_room', roomId));
    s.on('message', (msg: Message) => {
      if (msg.roomId !== roomId) return;
      const withDefaults = { ...msg, readCount: msg.readCount ?? 0, reactions: msg.reactions ?? [], poll: msg.poll ?? null };
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return { pages: [{ messages: [withDefaults], nextCursor: null, hasMore: false }], pageParams: [undefined] };
          const firstPage = old.pages[0];
          if (firstPage?.messages?.some((m) => m.id === msg.id)) return old;
          const updatedFirst = { ...firstPage, messages: [withDefaults, ...(firstPage.messages ?? [])] };
          return { ...old, pages: [updatedFirst, ...old.pages.slice(1, 5)] };
        }
      );
      // 방 목록만 갱신 (메시지 refetch 시 소켓으로 받은 새 메시지가 덮어써져 사라지는 문제 방지)
      const uid = myIdRef.current;
      if (uid) queryClient.refetchQueries({ queryKey: ['rooms', uid] });
      if (msg.senderId !== myIdRef.current) {
        const now = Date.now();
        if (now - lastMarkReadRef.current > 1000) {
          lastMarkReadRef.current = now;
          roomsApi.markRead(roomId).catch(() => {});
        }
        // 별도 채팅 창: 창이 백그라운드일 때 알림 표시 (Main에 소켓이 없을 수 있음)
        if (!embedded && typeof document !== 'undefined' && document.hidden) {
          try {
            const snoozed = Number(localStorage.getItem('notificationsSnoozedUntil') || 0);
            const mutedRaw = localStorage.getItem('mutedRoomIds');
            const muted = mutedRaw ? new Set(JSON.parse(mutedRaw).map(String)) : new Set();
            if (snoozed > Date.now() || muted.has(String(msg.roomId))) return;
            const senderName = msg.sender?.name ?? '알 수 없음';
            const isTopic = !!room?.isTopic;
            const roomName = room?.name ?? '';
            const title = isTopic && roomName ? `${roomName} 아젠다` : senderName;
            const body = isTopic && roomName ? `${senderName}: ${msg.fileUrl && msg.fileName ? msg.fileName : msg.content}` : (msg.fileUrl && msg.fileName ? msg.fileName : msg.content);
            const electronAPI = window.electronAPI;
            if (electronAPI?.showNotification) {
              (async () => {
                try {
                  let icon: string | null = null;
                  let imagePreview: string | null = null;
                  if (msg.senderId && token) {
                    try {
                      const base = getBaseUrl();
                      if (electronAPI.fetchUserAvatar && base) {
                        icon = await Promise.race([
                          electronAPI.fetchUserAvatar(msg.senderId, base, token),
                          new Promise<null>((r) => setTimeout(() => r(null), 250)),
                        ]);
                      }
                    } catch { /* ignore */ }
                  }
                  if (msg.fileUrl && msg.fileMimeType?.startsWith('image/')) {
                    try {
                      const blob = await Promise.race([
                        filesApi.fetchBlob(msg.id),
                        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 400)),
                      ]);
                      imagePreview = await new Promise<string>((resolve, reject) => {
                        const r = new FileReader();
                        r.onload = () => resolve(r.result as string);
                        r.onerror = () => reject(new Error('read failed'));
                        r.readAsDataURL(blob);
                      });
                      if (imagePreview.length > 80 * 1024) imagePreview = null;
                    } catch { /* ignore */ }
                  }
                  electronAPI.showNotification(title, body, msg.roomId, icon, imagePreview);
                } catch {
                  electronAPI.showNotification(title, body, msg.roomId);
                }
              })();
            } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              new Notification(title, { body });
            }
          } catch { /* ignore */ }
        }
      }
    });
    s.on('message_updated', (payload: { id: string; roomId: string; content: string; editedAt: string }) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
          return { ...old, pages: old.pages.map((page) => ({ ...page, messages: (page.messages ?? []).map((m) => m.id === payload.id ? { ...m, content: payload.content, editedAt: payload.editedAt } : m) })) };
        }
      );
    });
    s.on('message_deleted', (payload: { id: string; roomId: string }) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
          return { ...old, pages: old.pages.map((page) => ({ ...page, messages: (page.messages ?? []).map((m) => m.id === payload.id ? { ...m, content: '[삭제된 메시지]', deletedAt: new Date().toISOString() } : m) })) };
        }
      );
    });
    s.on('reaction_updated', (payload: { messageId: string; reactions: ReactionGroup[] }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
          return { ...old, pages: old.pages.map((page) => ({ ...page, messages: (page.messages ?? []).map((m) => m.id === payload.messageId ? { ...m, reactions: payload.reactions } : m) })) };
        }
      );
    });
    s.on('poll_voted', (payload: { messageId?: string; id: string; question: string; isMultiple: boolean; options: Array<{ id: string; text: string; voteCount: number; voterIds: string[] }> }) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: (page.messages ?? []).map((m) => {
                if (m.poll && m.poll.id === payload.id) {
                  return { ...m, poll: { ...m.poll, options: payload.options } };
                }
                return m;
              }),
            })),
          };
        }
      );
    });
    s.on('message_pinned', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    });
    s.on('message_unpinned', () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    });
    s.on('members_added', (payload: { roomId: string }) => {
      if (payload.roomId === roomId) {
        queryClient.refetchQueries({ queryKey: ['rooms', roomId] });
        queryClient.refetchQueries({ queryKey: ['rooms'] });
      }
    });
    s.on('member_left', () => {
      queryClient.refetchQueries({ queryKey: ['rooms', roomId] });
      queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
    });
    const handleProjectEvent = () => {
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    };
    s.on('project_updated', handleProjectEvent);
    s.on('task_created', handleProjectEvent);
    s.on('task_updated', handleProjectEvent);
    s.on('task_moved', handleProjectEvent);
    s.on('task_deleted', handleProjectEvent);
    s.on('room_avatar_updated', (payload: { roomId: string }) => {
      if (payload.roomId === roomId) {
        queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
        queryClient.invalidateQueries({ queryKey: ['rooms', myIdRef.current] });
      }
    });
    s.on('room_read', (payload: { roomId: string; userId: string }) => {
      if (payload.roomId !== roomId || payload.userId === myIdRef.current) return;
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ['rooms', roomId, 'messages'],
        (old) => {
          if (!old?.pages?.length) return old ?? { pages: [], pageParams: [] };
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: (page.messages ?? []).map((m) =>
                m.senderId === myIdRef.current ? { ...m, readCount: Math.max(m.readCount ?? 0, 1) } : m
              ),
            })),
          };
        }
      );
      queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
    });
    s.on('mention', (payload: { roomId: string; senderName: string; content: string }) => {
      window.electronAPI?.showNotification(
        `${payload.senderName}님이 회원님을 멘션했습니다`,
        payload.content
      );
    });
    setSocket(s);
    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [token, roomId, queryClient]);

  useEffect(() => {
    if (roomId) {
      roomsApi.markRead(roomId).then(() => {
        queryClient.refetchQueries({ queryKey: ['rooms'] });
        queryClient.refetchQueries({ queryKey: ['rooms', roomId, 'messages'] });
      }).catch((err) => {
        console.warn('[markRead] 읽음 처리 실패:', err.message);
      });
    }
  }, [roomId, queryClient]);

  useEffect(() => {
    if (!roomId) return;
    try {
      const existing = localStorage.getItem('activeChatFocused');
      if (existing != null && existing !== '0' && existing !== '1') {
        localStorage.removeItem('activeChatFocused');
        localStorage.removeItem('activeChatRoomId');
      }
    } catch { /* ignore */ }
    const setActive = (focused: boolean) => {
      try {
        localStorage.setItem('activeChatRoomId', roomId);
        localStorage.setItem('activeChatFocused', focused ? '1' : '0');
      } catch {
        // ignore
      }
    };
    setActive(typeof document !== 'undefined' ? !document.hidden : true);
    const onFocusActive = () => setActive(true);
    const onBlur = () => setActive(false);
    const onVisibilityActive = () => setActive(!(typeof document !== 'undefined' && document.hidden));
    window.addEventListener('focus', onFocusActive);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityActive);
    const markIfVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      roomsApi.markRead(roomId).catch(() => {});
    };
    const onFocusRead = () => markIfVisible();
    const onVisibilityRead = () => markIfVisible();
    window.addEventListener('focus', onFocusRead);
    document.addEventListener('visibilitychange', onVisibilityRead);
    return () => {
      window.removeEventListener('focus', onFocusActive);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityActive);
      try {
        const current = localStorage.getItem('activeChatRoomId');
        if (current === roomId) {
          localStorage.removeItem('activeChatRoomId');
          localStorage.removeItem('activeChatFocused');
        }
      } catch {
        // ignore
      }
      window.removeEventListener('focus', onFocusRead);
      document.removeEventListener('visibilitychange', onVisibilityRead);
    };
  }, [roomId]);

  // roomId 변경 시 초기 스크롤 플래그 리셋
  useEffect(() => {
    initialScrollDoneRef.current = false;
  }, [roomId]);

  // 첫 번째 안 읽은 메시지 ID (useEffect보다 먼저 선언 필요)
  const displayMessagesForScroll = useMemo(() => [...messages].reverse(), [messages]);
  const firstUnreadMessageId = useMemo(() => {
    if (!room) return null;
    const lastReadAt = room?.lastReadAt ? new Date(room.lastReadAt).getTime() : 0;
    const unreadCount = room?.unreadCount ?? 0;
    if (unreadCount <= 0 || lastReadAt <= 0) return null;
    return displayMessagesForScroll.find((m) => m.senderId !== myId && new Date(m.createdAt).getTime() > lastReadAt)?.id ?? null;
  }, [room, myId, displayMessagesForScroll]);

  // 채팅 열릴 때: 다읽음→맨끝, 안읽음→첫 안읽은 메시지로 스크롤
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el || !room) return;
    const curCount = messages.length;
    const prevCount = prevMsgCountRef.current;
    prevMsgCountRef.current = curCount;

    // 이전 메시지 로드(페이지 추가)일 때는 스크롤 금지 - 위 useEffect에서 보정함
    const pageCount = messagesInfinite?.pages?.length ?? 0;
    if (pageCount > 1 && curCount > prevCount && curCount - prevCount >= 10) return;

    // 초기 로드 시에만 진입 스크롤 (room + messages 준비 후)
    if (curCount > 0 && !initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      const run = () => {
        if (firstUnreadMessageId && firstUnreadRef.current) {
          firstUnreadRef.current.scrollIntoView({ behavior: 'auto', block: 'center' });
        } else {
          el.scrollTop = el.scrollHeight;
        }
      };
      requestAnimationFrame(run);
      const t = setTimeout(run, 250);
      return () => clearTimeout(t);
    }

    // 새 메시지 추가 시: 맨 아래에 있거나, 내가 보낸 메시지면 맨 끝으로 스크롤
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
    const newestIsMine = messages[0]?.senderId === myId;
    const shouldScroll = (atBottom || newestIsMine) && prevCount > 0;
    if (shouldScroll) {
      const run = () => { el.scrollTop = el.scrollHeight; };
      requestAnimationFrame(run);
      const t = setTimeout(run, 150);
      return () => clearTimeout(t);
    }
  }, [messages.length, room, firstUnreadMessageId, messages, myId]);

  // 요약 표시 시 맨 아래로 스크롤
  useEffect(() => {
    if (!summaryText && !summaryLoading) return;
    const el = messagesScrollRef.current;
    if (!el) return;
    const run = () => { el.scrollTop = el.scrollHeight; };
    requestAnimationFrame(run);
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [summaryText, summaryLoading]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    const t = setTimeout(() => document.addEventListener('click', close), 50);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [contextMenu]);

  const sendMessage = async () => {
    const text = input.trim();

    if (editingMsg) {
      if (!text || !roomId) return;
      roomsApi.editMessage(roomId, editingMsg.id, text).then(() => {
        setEditingMsg(null);
        setInput('');
      }).catch(console.error);
      return;
    }

    // 파일 + 메시지 전송
    if (pendingFiles.length > 0) {
      if (!roomId) return;
      setFileUploading(true);
      try {
        for (let i = 0; i < pendingFiles.length; i++) {
          const content = (i === 0 && text) ? text : undefined;
          await filesApi.upload(roomId, pendingFiles[i], (pct) => {
            setFileUploadProgress(((i / pendingFiles.length) + (pct / 100 / pendingFiles.length)) * 100);
          }, content);
        }
      } catch (err) {
        console.error('Upload failed:', err);
      } finally {
        setFileUploading(false);
        setFileUploadProgress(0);
      }
      setPendingFiles([]);
      setInput('');
      setReplyTo(null);
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      return;
    }

    // 텍스트만 전송 (socketRef 사용 - stale closure 방지)
    const s = socketRef.current;
    if (!text || !roomId || !s) return;
    const payload: { roomId: string; content: string; replyToId?: string; context?: { filePath?: string; line?: number; branch?: string } } = {
      roomId,
      content: text,
      replyToId: replyTo?.id || undefined,
    };
    if (messageContext && (messageContext.filePath || messageContext.branch)) {
      payload.context = {
        filePath: messageContext.filePath || undefined,
        line: messageContext.line > 0 ? messageContext.line : undefined,
        branch: messageContext.branch || undefined,
      };
    }
    s.emit('message', payload);
    queryClient.invalidateQueries({ queryKey: ['rooms'] });
    setInput('');
    setReplyTo(null);
    setMessageContext(null);
  };

  const handleSearch = async () => {
    if (!roomId || !searchQuery.trim()) { setSearchResults([]); return; }
    try {
      const res = await roomsApi.searchMessages(roomId, searchQuery.trim());
      setSearchResults(res.messages);
    } catch { setSearchResults([]); }
  };

  const handleSummarize = async () => {
    const msgList = [...messages].reverse();
    const chatText = msgList
      .filter((m: Message) => !m.deletedAt && !isSystemMessage(m.content) && (m.content || m.fileUrl))
      .map((m: Message) => {
        const name = m.sender?.name ?? '알 수 없음';
        const body = m.content || (m.fileUrl ? '(파일)' : '');
        return `[${name}] ${body}`;
      })
      .join('\n');
    if (!chatText.trim()) {
      setSummaryText('요약할 채팅 내용이 없습니다.');
      return;
    }
    setSummaryLoading(true);
    setSummaryText('');
    summaryDismissedRef.current = false;
    try {
      const summary = await ollamaSummarize(chatText);
      if (!summaryDismissedRef.current) {
        setSummaryText(summary || '요약할 내용이 없습니다.');
      }
    } catch (err) {
      if (!summaryDismissedRef.current) {
        setSummaryText(`오류: ${(err as Error).message}`);
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInput(val);

    // Mention detection
    const cursorPos = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursorPos);
    const atMatch = textBefore.match(/@(\S*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
    } else {
      setMentionQuery(null);
    }
  };

  const handleMentionSelect = (name: string) => {
    const cursorPos = inputRef.current?.selectionStart ?? input.length;
    const textBefore = input.slice(0, cursorPos);
    const textAfter = input.slice(cursorPos);
    const replaced = textBefore.replace(/@\S*$/, `@${name} `);
    setInput(replaced + textAfter);
    setMentionQuery(null);
    inputRef.current?.focus();
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0 || fileUploading) return;
    const valid = droppedFiles.filter((f) => f.size <= MAX_DROP_SIZE);
    if (valid.length > 0) setPendingFiles((prev) => [...prev, ...valid]);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (fileUploading) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    let file: File | null = null;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file' && item.type.startsWith('image/')) {
        file = item.getAsFile();
        break;
      }
    }
    if (!file) return;
    e.preventDefault();
    if (file.size > MAX_DROP_SIZE) return;
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/gif' ? 'gif' : file.type === 'image/webp' ? 'webp' : 'png';
    const namedFile = new File([file], `image-${Date.now()}.${ext}`, { type: file.type });
    setPendingFiles((prev) => [...prev, namedFile]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      sendMessage();
    }
    if (e.key === 'Escape') {
      setReplyTo(null);
      setEditingMsg(null);
      setMentionQuery(null);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!roomId) return;
    try {
      await roomsApi.toggleReaction(roomId, messageId, emoji);
    } catch (err) {
      console.error(err);
    }
  };

  const handleForward = async (targetRoomId: string) => {
    if (!forwardOpen) return;
    try {
      await roomsApi.forwardMessage(targetRoomId, forwardOpen);
    } catch (err) {
      console.error(err);
    }
    setForwardOpen(null);
  };

  const handleDelete = async (msg: Message) => {
    if (!roomId || !confirm('이 메시지를 삭제하시겠습니까?')) return;
    try {
      await roomsApi.deleteMessage(roomId, msg.id);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePin = async (messageId: string) => {
    if (!roomId) return;
    try {
      await roomsApi.pinMessage(roomId, messageId);
      queryClient.invalidateQueries({ queryKey: ['rooms', roomId, 'pins'] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePoll = async (question: string, options: string[], isMultiple: boolean) => {
    if (!roomId) return;
    try {
      await pollsApi.create({ roomId, question, options, isMultiple });
      setPollCreateOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Load bookmarks
  useEffect(() => {
    bookmarksApi.list().then((list) => {
      setBookmarkedIds(new Set(list.map((b) => b.messageId)));
    }).catch((err) => {
      console.warn('[bookmarks] 북마크 목록 로드 실패:', err.message);
    });
  }, []);

  const handleToggleBookmark = async (messageId: string) => {
    try {
      if (bookmarkedIds.has(messageId)) {
        await bookmarksApi.remove(messageId);
        setBookmarkedIds((prev) => { const s = new Set(prev); s.delete(messageId); return s; });
      } else {
        await bookmarksApi.add(messageId);
        setBookmarkedIds((prev) => new Set(prev).add(messageId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenThread = async (messageId: string) => {
    if (!roomId) return;
    try {
      const data = await roomsApi.thread(roomId, messageId);
      setThreadOpen({ parentId: messageId, parent: data.parent, replies: data.replies });
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenFileDrawer = async () => {
    if (!roomId) return;
    const isClosing = rightPanel === 'file';
    if (isClosing) {
      setRightPanel('none');
      return;
    }
    try {
      const { files } = await roomsApi.files(roomId);
      setFileDrawerData(files);
      setRightPanel('file');
    } catch (err) {
      console.error(err);
    }
  };

  const viewModeFromState = (location.state as { viewMode?: 'chat' | 'board' })?.viewMode;
  const isBoardView = room?.viewMode === 'board' || viewModeFromListNow === 'board' || viewModeFromState === 'board';

  // 보드뷰: 루트 포스트와 댓글(reply) 분리 - 훅은 early return 전에 호출
  const { rootPosts, repliesMap } = useMemo(() => {
    if (!isBoardView) return { rootPosts: [] as Message[], repliesMap: new Map<string, Message[]>() };
    const reversed = [...messages].reverse();
    const map = new Map<string, Message[]>();
    const roots: Message[] = [];
    for (const m of reversed) {
      if (m.replyToId) {
        const arr = map.get(m.replyToId) || [];
        arr.push(m);
        map.set(m.replyToId, arr);
      } else {
        roots.push(m);
      }
    }
    return { rootPosts: roots, repliesMap: map };
  }, [messages, isBoardView]);

  if (!roomId) {
    if (!embedded) navigate('/', { replace: true });
    return null;
  }

  if (roomLoading || !room) {
    return (
      <div style={s.layout(isDark)}>
        <div style={s.loading(isDark)}>채팅방 로딩 중...</div>
      </div>
    );
  }

  const displayMessages = displayMessagesForScroll;
  const hasElectron = !!window.electronAPI;
  const members = room?.members ?? [];
  const isCreator = !!(room?.isTopic && room?.createdBy && room.createdBy === myId);
  const canInvite = !room?.isTopic || isCreator;

  const wrapperStyle: React.CSSProperties = embedded
    ? { flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: isDark ? '#0f172a' : '#fafafa' }
    : s.appWrap(isDark);

  return (
    <div style={wrapperStyle}>
      <style>{`
        @keyframes message-bubble-highlight-blink {
          0%, 100% { outline-color: rgba(59, 130, 246, 0.9); }
          50% { outline-color: rgba(59, 130, 246, 0.2); }
        }
        .message-bubble-highlight {
          outline: 2px solid rgba(59, 130, 246, 0.8);
          outline-offset: 2px;
          animation: message-bubble-highlight-blink 0.5s ease-in-out 3;
        }
        @keyframes unread-divider-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
      {!embedded && hasElectron && <TitleBar title={room.name} isDark={isDark} />}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={embedded ? { ...s.layout(isDark), flex: 1, minHeight: 0, minWidth: 0 } : { ...s.layout(isDark), flex: 1, minWidth: 0 }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
        {dragOver && (
          <div style={s.dropOverlay()}>
            <div style={s.dropContent()}>
              <span style={s.dropText()}>파일을 여기에 놓으세요</span>
            </div>
          </div>
        )}
        <header style={s.chatHeader(isDark)}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden', minWidth: 0 }}>
            <span style={s.chatHeaderName(isDark)}>{room.name}</span>
            {isBoardView && (
              <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', padding: '2px 8px', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', flexShrink: 0 }}>보드뷰</span>
            )}
          </span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {embedded && onOpenInNewWindow && (
              <button type="button" style={s.headerIconBtn(isDark)} onClick={onOpenInNewWindow} title="새 창으로 열기">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
            )}
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => setSearchOpen(!searchOpen)} title="검색">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark)} onClick={handleSummarize} title="채팅 요약" disabled={summaryLoading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
              </svg>
            </button>
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => {
              if (window.electronAPI?.openKanbanWindow) {
                window.electronAPI.openKanbanWindow(roomId!);
              } else {
                window.open(`${window.location.origin}/kanban/${roomId}`, '_blank', 'width=1100,height=750');
              }
            }} title="프로젝트 보드">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="18" rx="1" /><rect x="14" y="3" width="7" height="10" rx="1" />
              </svg>
            </button>
            {isCreator && (
              <button type="button" style={s.headerIconBtn(isDark)} onClick={() => setSettingsOpen(true)} title="방 설정">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
              </button>
            )}
            {canInvite && (
            <button type="button" style={s.headerIconBtn(isDark)} onClick={() => setInviteOpen(true)} title="멤버 초대">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
              </svg>
            </button>
            )}
          </div>
        </header>

        {searchOpen && (
          <div style={s.searchBar(isDark)}>
            <input
              type="text"
              placeholder="메시지 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              style={s.searchInput(isDark)}
              autoFocus
            />
            <button type="button" onClick={handleSearch} style={s.searchBtn(isDark)}>검색</button>
            <UICloseButton
              size="md"
              variant="subtle"
              onClick={() => { setSearchOpen(false); setSearchResults([]); setSearchQuery(''); }}
              style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, borderRadius: 8 }}
            />
          </div>
        )}
        {searchResults.length > 0 && (
          <div style={s.searchResults(isDark)}>
            {searchResults.map((sr) => (
              <div key={sr.id} style={s.searchResultItem(isDark)}>
                <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginRight: 8 }}>{sr.sender.name}</span>
                <span style={{ fontSize: 13, color: isDark ? '#e2e8f0' : '#333' }}>{sr.content}</span>
                <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#aaa', marginLeft: 'auto', flexShrink: 0 }}>
                  {new Date(sr.createdAt).toLocaleString('ko-KR')}
                </span>
              </div>
            ))}
          </div>
        )}

        {contextOpen && (
          <ContextAttachModal
            initialContext={messageContext}
            onClose={() => setContextOpen(false)}
            onConfirm={(ctx) => { setMessageContext(ctx); setContextOpen(false); }}
          />
        )}
        {inviteOpen && room && (
          <InviteModal
            roomId={roomId!}
            currentMemberIds={members.map((m: { id: string }) => m.id)}
            onClose={() => setInviteOpen(false)}
            onInvited={(newRoomId: string) => {
              queryClient.refetchQueries({ queryKey: ['rooms'] });
              if (window.electronAPI?.openChatWindow) {
                window.electronAPI.openChatWindow(newRoomId);
              } else {
                window.open(`${window.location.origin}/chat/${newRoomId}`, '_blank', 'width=480,height=680');
              }
            }}
          />
        )}

        {settingsOpen && room && (
          <RoomSettingsModal
            room={room}
            onClose={() => setSettingsOpen(false)}
            onUpdated={() => {
              queryClient.invalidateQueries({ queryKey: ['rooms'] });
              queryClient.invalidateQueries({ queryKey: ['rooms', roomId] });
              setSettingsOpen(false);
            }}
          />
        )}

        <PinnedMessages roomId={roomId!} />

        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <div
            ref={messagesScrollRef}
            onScroll={checkAtBottom}
            style={s.messages(isDark)}
          >
          <div ref={topSentinelRef} style={{ height: 1 }} />
          {isFetchingNextPage && (
            <div style={{ textAlign: 'center', padding: '8px 0', fontSize: 13, color: isDark ? '#64748b' : '#94a3b8' }}>
              이전 메시지 불러오는 중...
            </div>
          )}
          {/* ===== 보드뷰: 루트 포스트 + 인라인 댓글 ===== */}
          {isBoardView ? rootPosts.map((m, idx) => {
            const elements: React.ReactNode[] = [];
            const prevMsg = idx > 0 ? rootPosts[idx - 1] : null;
            const curDateKey = getDateKey(m.createdAt);
            const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
            if (idx === 0 || curDateKey !== prevDateKey) {
              elements.push(
                <div key={`date-${curDateKey}-${m.id}`} style={s.dateSeparator()}>
                  <span style={s.dateSeparatorText()}>{formatDateLabel(new Date(m.createdAt))}</span>
                </div>
              );
            }
            if (isSystemMessage(m.content) && !m.fileUrl && m.eventTitle == null && !m.poll) {
              elements.push(
                <div key={m.id} style={s.systemMessageRow()}>
                  <span style={s.systemMessageText()}>{m.content}</span>
                </div>
              );
              return elements;
            }
            // 삭제된 포스트
            if (m.deletedAt) {
              elements.push(
                <div key={m.id} style={s.boardCard(isDark)}>
                  <div style={s.boardCardHeader(isDark)}>
                    <div style={s.boardCardHeaderLeft(isDark)}>
                      <span style={s.boardCardAvatar(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span>
                      <div style={s.boardCardAuthor(isDark)}>
                        <span style={s.boardCardAuthorName(isDark)}>{m.sender?.name ?? '알 수 없음'}</span>
                        <span style={s.boardCardTime(isDark)}>{new Date(m.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ ...s.boardCardBody(isDark), opacity: 0.6, fontStyle: 'italic' }}>[삭제된 메시지]</div>
                </div>
              );
              return elements;
            }
            const replies = repliesMap.get(m.id) || [];
            elements.push(
              <div
                key={m.id}
                id={`msg-${m.id}`}
                style={s.boardCard(isDark)}
                onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, message: m }); }}
              >
                {/* 헤더: 아바타 + 작성자 + 날짜 + ⋮ 메뉴 */}
                <div style={s.boardCardHeader(isDark)}>
                  <div style={s.boardCardHeaderLeft(isDark)}>
                    <span style={s.boardCardAvatar(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span>
                    <div style={s.boardCardAuthor(isDark)}>
                      <span style={s.boardCardAuthorName(isDark)}>{m.sender?.name ?? '알 수 없음'}</span>
                      <span style={s.boardCardTime(isDark)}>
                        {new Date(m.createdAt).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    style={s.boardMenuBtn(isDark)}
                    onClick={(e) => { e.stopPropagation(); setContextMenu({ x: e.clientX, y: e.clientY, message: m }); }}
                    title="더보기"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill={isDark ? '#94a3b8' : '#6b7280'}>
                      <circle cx="8" cy="3" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="8" cy="13" r="1.5" />
                    </svg>
                  </button>
                </div>
                {(m.contextFilePath || m.contextBranch) && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const str = m.contextFilePath
                        ? m.contextFilePath + (m.contextLine ? `:${m.contextLine}` : '')
                        : (m.contextBranch || '');
                      if (str && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(str).then(() => showToast('복사되었습니다.', 'success'));
                      }
                    }}
                    style={{ fontSize: 11, padding: '4px 10px', marginBottom: 6, borderRadius: 6, background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: isDark ? '#a5b4fc' : '#4f46e5', cursor: 'pointer', display: 'inline-block' }}
                    title="클릭하여 복사"
                  >
                    📍 {[m.contextFilePath, m.contextLine ? `:${m.contextLine}` : null, m.contextBranch ? ` (${m.contextBranch})` : null].filter(Boolean).join('')}
                  </div>
                )}
                {/* 본문 */}
                <div style={s.boardCardBody(isDark)}>
                  {m.poll ? (
                    <PollCard poll={m.poll} myId={myId} isMine={m.senderId === myId} />
                  ) : m.eventTitle != null ? (
                    <EventCard title={m.eventTitle} startAt={m.eventStartAt!} endAt={m.eventEndAt!} description={m.eventDescription ?? undefined} isMine={m.senderId === myId} />
                  ) : m.fileUrl ? (
                    <FileMessage message={m} />
                  ) : (
                    <>
                      {renderContentWithMentions(m.content, isDark)}
                      {extractFirstUrl(m.content) && <LinkPreview url={extractFirstUrl(m.content)!} isDark={isDark} />}
                    </>
                  )}
                  {m.editedAt && <span style={{ fontSize: 11, opacity: 0.6, marginTop: 4, display: 'block' }}>(수정됨)</span>}
                </div>
                {/* 푸터: 읽음 + 좋아요 반응 */}
                <div style={s.boardCardFooter(isDark)}>
                  {m.senderId === myId && room && (() => {
                    const memberCount = room.members?.length ?? 0;
                    if (memberCount <= 2) return null;
                    const totalReaders = memberCount - 1;
                    const readCount = m.readCount ?? 0;
                    const unreadCount = Math.max(0, totalReaders - readCount);
                    if (unreadCount === 0) return null;
                    return (
                      <span style={s.readStatusMineBoard(isDark)}>{unreadCount}</span>
                    );
                  })()}
                  {m.reactions && m.reactions.length > 0 ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {m.reactions.map((r: ReactionGroup) => (
                        <button key={r.emoji} type="button" onClick={() => handleReaction(m.id, r.emoji)} style={s.reactionBadge(isDark, myId ? r.userIds.includes(myId) : false)}>
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </span>
                  ) : (
                    <button type="button" style={s.boardCardFooterBtn(isDark)} onClick={() => handleReaction(m.id, '👍')}>
                      👍 좋아요
                    </button>
                  )}
                </div>
                {/* 인라인 댓글 섹션 */}
                {replies.length > 0 && (
                  <div style={s.boardCommentSection(isDark)}>
                    {replies.map((reply) => (
                      <div
                        key={reply.id}
                        id={`msg-${reply.id}`}
                        style={s.boardCommentRow(isDark)}
                        onContextMenu={(e) => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, message: reply }); }}
                      >
                        <span style={s.boardCommentAvatar(isDark)}>{reply.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{reply.sender?.name ?? '알 수 없음'}</span>
                            <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#9ca3af' }}>
                              {new Date(reply.createdAt).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {reply.deletedAt ? (
                            <div style={{ fontSize: 13, color: isDark ? '#64748b' : '#9ca3af', fontStyle: 'italic', marginTop: 2 }}>[삭제된 댓글]</div>
                          ) : reply.fileUrl ? (
                            <div style={{ marginTop: 4 }}><FileMessage message={reply} /></div>
                          ) : (
                            <div style={{ fontSize: 13, color: isDark ? '#cbd5e1' : '#374151', lineHeight: 1.5, marginTop: 2, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                              {renderContentWithMentions(reply.content, isDark)}
                            </div>
                          )}
                          {reply.reactions && reply.reactions.length > 0 && (
                            <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                              {reply.reactions.map((r: ReactionGroup) => (
                                <button key={r.emoji} type="button" onClick={() => handleReaction(reply.id, r.emoji)} style={{ ...s.reactionBadge(isDark, myId ? r.userIds.includes(myId) : false), fontSize: 11, padding: '1px 6px' }}>
                                  {r.emoji} {r.count}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* 인라인 댓글 입력 */}
                <div style={s.boardCommentInputRow(isDark)}>
                  <input
                    type="text"
                    value={boardCommentInputs[m.id] || ''}
                    onChange={(e) => setBoardCommentInputs((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    placeholder="댓글을 입력하세요..."
                    style={s.boardCommentInput(isDark)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        if ((e.nativeEvent as KeyboardEvent).isComposing) return;
                        e.preventDefault();
                        const text = (boardCommentInputs[m.id] || '').trim();
                        if (text && socketRef.current && roomId) {
                          socketRef.current.emit('message', { roomId, content: text, replyToId: m.id });
                          setBoardCommentInputs((prev) => ({ ...prev, [m.id]: '' }));
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    style={s.boardCommentSendBtn(isDark)}
                    onClick={() => {
                      const text = (boardCommentInputs[m.id] || '').trim();
                      if (text && socketRef.current && roomId) {
                        socketRef.current.emit('message', { roomId, content: text, replyToId: m.id });
                        setBoardCommentInputs((prev) => ({ ...prev, [m.id]: '' }));
                      }
                    }}
                  >
                    전송
                  </button>
                </div>
              </div>
            );
            return elements;
          })

          /* ===== 채팅뷰: 기존 말풍선 ===== */
          : displayMessages.map((m, idx) => {
            const elements: React.ReactNode[] = [];
            const prevMsg = idx > 0 ? displayMessages[idx - 1] : null;
            const curDateKey = getDateKey(m.createdAt);
            const prevDateKey = prevMsg ? getDateKey(prevMsg.createdAt) : null;
            if (idx === 0 || curDateKey !== prevDateKey) {
              elements.push(
                <div key={`date-${curDateKey}-${m.id}`} style={s.dateSeparator()}>
                  <span style={s.dateSeparatorText()}>{formatDateLabel(new Date(m.createdAt))}</span>
                </div>
              );
            }
            // 첫 안 읽은 메시지 위에 "새 메시지" 구분선
            if (m.id === firstUnreadMessageId) {
              elements.push(
                <div
                  key={`unread-${m.id}`}
                  ref={firstUnreadRef}
                  style={s.unreadDivider(isDark)}
                >
                  <span style={s.unreadDividerText(isDark)}>새 메시지</span>
                </div>
              );
            }
            if (isSystemMessage(m.content) && !m.fileUrl && m.eventTitle == null && !m.poll) {
              elements.push(
                <div key={m.id} style={s.systemMessageRow()}>
                  <span style={s.systemMessageText()}>{m.content}</span>
                </div>
              );
              return elements;
            }
            if (m.deletedAt) {
              elements.push(
                <div key={m.id} style={{ ...s.messageRow(), ...(m.senderId === myId ? s.messageRowMine() : {}) }}>
                  <div style={s.messageRowInner()}>
                    {m.senderId !== myId && <div style={s.avatarWrap()} aria-hidden><span style={s.avatarCircle(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span></div>}
                    <div style={{ width: 'fit-content', maxWidth: '75%', minWidth: 0, ...(m.senderId === myId ? { marginLeft: 'auto' } : {}) }}>
                      <div style={{ ...s.messageBubble(isDark), ...(m.senderId === myId ? s.messageBubbleMine(isDark) : {}), opacity: 0.5, fontStyle: 'italic' }}>
                        <span style={s.messageContent()}>[삭제된 메시지]</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
              return elements;
            }

            const isHovered = hoveredMsg === m.id;
            const isHighlighted = highlightedMsgId === m.id;
            elements.push(
              <div
                key={m.id}
                id={`msg-${m.id}`}
                style={{ ...s.messageRow(), ...(m.senderId === myId ? s.messageRowMine() : {}) }}
                onMouseEnter={() => setHoveredMsg(m.id)}
                onMouseLeave={() => setHoveredMsg(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({ x: e.clientX, y: e.clientY, message: m });
                }}
              >
                {m.senderId !== myId && <div style={s.senderLabel(isDark)}>{m.sender.name}</div>}

                {(m.contextFilePath || m.contextBranch) && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const str = m.contextFilePath
                        ? m.contextFilePath + (m.contextLine ? `:${m.contextLine}` : '')
                        : (m.contextBranch || '');
                      if (str && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(str).then(() => showToast('복사되었습니다.', 'success'));
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 8,
                      background: isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
                      color: isDark ? '#a5b4fc' : '#4f46e5',
                      marginBottom: 4,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title="클릭하여 복사 (IDE에서 파일:라인 형식)"
                  >
                    📍 {[m.contextFilePath, m.contextLine ? `:${m.contextLine}` : null, m.contextBranch ? ` (${m.contextBranch})` : null].filter(Boolean).join('')}
                  </div>
                )}
                {m.replyTo && (
                  <div
                    role="button"
                    tabIndex={0}
                    style={s.replyPreview(isDark, m.senderId === myId)}
                    onClick={() => {
                      const targetId = m.replyTo!.id;
                      const el = document.getElementById(`msg-${targetId}`);
                      if (el) {
                        setHighlightedMsgId(null);
                        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        setTimeout(() => {
                          setHighlightedMsgId(targetId);
                          setTimeout(() => setHighlightedMsgId(null), 2000);
                        }, 400);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        const targetId = m.replyTo!.id;
                        const el = document.getElementById(`msg-${targetId}`);
                        if (el) {
                          setHighlightedMsgId(null);
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          setTimeout(() => {
                            setHighlightedMsgId(targetId);
                            setTimeout(() => setHighlightedMsgId(null), 2000);
                          }, 400);
                        }
                      }
                    }}
                  >
                    <span style={s.replyPreviewLabel(isDark)}>{m.replyTo.sender?.name}</span>
                    <span style={s.replyPreviewContent(isDark)}>{m.replyTo.content}</span>
                  </div>
                )}

                <div style={s.messageRowInner()}>
                  {m.senderId !== myId && (
                    <div style={s.avatarWrap()} aria-hidden>
                      <span style={s.avatarCircle(isDark)}>{m.sender?.name?.trim()?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  )}
                  <div style={{ position: 'relative', width: 'fit-content', maxWidth: '75%', minWidth: 0, ...(m.senderId === myId ? { marginLeft: 'auto' } : {}) }}>
                    <div
                      className={isHighlighted ? 'message-bubble-highlight' : undefined}
                      style={{ ...s.messageBubble(isDark), ...(m.senderId === myId ? s.messageBubbleMine(isDark) : {}) }}
                    >
                      {m.poll ? (
                        <PollCard poll={m.poll} myId={myId} isMine={m.senderId === myId} />
                      ) : m.eventTitle != null ? (
                        <EventCard title={m.eventTitle} startAt={m.eventStartAt!} endAt={m.eventEndAt!} description={m.eventDescription ?? undefined} isMine={m.senderId === myId} />
                      ) : m.fileUrl ? (
                        <FileMessage message={m} />
                      ) : (
                        <>
                          <span style={s.messageContent()}>{renderContentWithMentions(m.content, isDark)}</span>
                          {extractFirstUrl(m.content) && (
                            <LinkPreview url={extractFirstUrl(m.content)!} isDark={isDark} />
                          )}
                        </>
                      )}
                      {m.editedAt && <span style={{ fontSize: 10, opacity: 0.6, marginTop: 4, display: 'block' }}>(수정됨)</span>}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                        <span style={{ ...s.metaTime(isDark), ...(m.senderId === myId ? { color: '#fff' } : {}) }}>
                          {new Date(m.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {m.senderId === myId && room && (() => {
                          const memberCount = room.members?.length ?? 0;
                          if (memberCount <= 2) return null;
                          const totalReaders = memberCount - 1;
                          const readCount = m.readCount ?? 0;
                          const unreadCount = Math.max(0, totalReaders - readCount);
                          if (unreadCount === 0) return null;
                          return <span style={s.readStatusMineBubble()}>{unreadCount}</span>;
                        })()}
                      </div>
                    </div>
                    {isHovered && !m.deletedAt && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        ...(m.senderId === myId
                          ? { right: '100%', marginRight: 6 }
                          : { left: '100%', marginLeft: 6 }),
                        display: 'flex',
                        gap: 2,
                        alignItems: 'center',
                      }}>
                        <button type="button" onClick={() => setReplyTo(m)} style={s.hoverActionBtn(isDark)} title="답장">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10l7-7v4c8 0 11 4 11 11-2-5-5-7-11-7v4l-7-5z"/></svg>
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button type="button" onClick={() => setEmojiPickerMsg(emojiPickerMsg === m.id ? null : m.id)} style={s.hoverActionBtn(isDark)} title="반응">
                            {'\uD83D\uDE0A'}
                          </button>
                          {emojiPickerMsg === m.id && (
                            <EmojiPicker onSelect={(emoji) => handleReaction(m.id, emoji)} onClose={() => setEmojiPickerMsg(null)} />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {m.reactions && m.reactions.length > 0 && (
                  <div style={s.reactionsRow(m.senderId === myId)}>
                    {m.reactions.map((r: ReactionGroup) => (
                      <button
                        key={r.emoji}
                        type="button"
                        onClick={() => handleReaction(m.id, r.emoji)}
                        style={s.reactionBadge(isDark, myId ? r.userIds.includes(myId) : false)}
                      >
                        {r.emoji} {r.count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
            return elements;
          })}

          {/* AI 채팅 요약 (채팅 메시지 형태) */}
          {(summaryLoading || summaryText) && (
            <div style={s.messageRow()}>
              <div style={s.senderLabel(isDark)}>AI 요약</div>
              <div style={s.messageRowInner()}>
                <div style={s.avatarWrap()} aria-hidden>
                  <span style={{ ...s.avatarCircle(isDark), background: isDark ? '#171717' : '#171717', color: '#fff' }}>AI</span>
                </div>
                <div style={{ position: 'relative', display: 'inline-block', flexShrink: 0 }}>
                  <div
                    style={{
                      ...s.messageBubble(isDark),
                      background: isDark ? '#334155' : '#e8f5e9',
                      border: `1px solid ${isDark ? '#475569' : '#c8e6c9'}`,
                      maxWidth: '75%',
                      minWidth: 200,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 6 }}>
                      <UICloseButton
                        size="sm"
                        onClick={() => { summaryDismissedRef.current = true; setSummaryText(''); setSummaryLoading(false); }}
                        title="닫기"
                      />
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6, color: isDark ? '#e2e8f0' : '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {summaryLoading ? '요약 중...' : summaryText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
        {showScrollToBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            style={s.scrollToBottomBtn(isDark)}
            aria-label="맨 아래로"
            title="맨 아래로"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </button>
        )}
        </div>

        {/* Context menu */}
        {contextMenu && (
          <div style={{ ...s.ctxMenu(isDark), left: contextMenu.x, top: contextMenu.y }} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setReplyTo(contextMenu.message); setContextMenu(null); inputRef.current?.focus(); }}>
              답장
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setForwardOpen(contextMenu.message.id); setContextMenu(null); }}>
              전달
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handleToggleBookmark(contextMenu.message.id); setContextMenu(null); }}>
              {bookmarkedIds.has(contextMenu.message.id) ? '북마크 해제' : '북마크'}
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handlePin(contextMenu.message.id); setContextMenu(null); }}>
              고정
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { handleOpenThread(contextMenu.message.id); setContextMenu(null); }}>
              스레드 보기
            </button>
            <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => { setTaskFromMessage({ title: contextMenu.message.content, messageId: contextMenu.message.id }); setContextMenu(null); }}>
              태스크로 변환
            </button>
            {canEditOrDelete(contextMenu.message, myId) && (
              <>
                <button type="button" style={s.ctxMenuItem(isDark)} onClick={() => {
                  setEditingMsg(contextMenu.message);
                  setInput(contextMenu.message.content);
                  setContextMenu(null);
                  inputRef.current?.focus();
                }}>
                  수정
                </button>
                <button type="button" style={{ ...s.ctxMenuItem(isDark), color: '#c62828' }} onClick={() => { handleDelete(contextMenu.message); setContextMenu(null); }}>
                  삭제
                </button>
              </>
            )}
          </div>
        )}

        {forwardOpen && <ForwardModal onClose={() => setForwardOpen(null)} onSelect={handleForward} />}
        {pollCreateOpen && <PollCreateModal onClose={() => setPollCreateOpen(false)} onCreate={handleCreatePoll} />}

        {taskFromMessage && roomId && (() => {
          const projectsQuery = queryClient.getQueryData<import('../api').Project[]>(['projects', roomId]);
          const proj = projectsQuery?.[0];
          if (!proj) {
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setTaskFromMessage(null)}>
                <div style={{ background: isDark ? '#1e293b' : '#fff', borderRadius: 12, padding: 24, maxWidth: 360, textAlign: 'center' as const }} onClick={(e) => e.stopPropagation()}>
                  <p style={{ fontSize: 14, color: isDark ? '#e2e8f0' : '#333', margin: '0 0 16px' }}>프로젝트가 없습니다. 먼저 칸반 보드에서 프로젝트를 생성해주세요.</p>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                    <button type="button" onClick={() => setTaskFromMessage(null)} style={{ padding: '8px 16px', border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`, borderRadius: 8, background: 'none', color: isDark ? '#94a3b8' : '#666', fontSize: 13, cursor: 'pointer' }}>닫기</button>
                    <button type="button" onClick={() => {
                      setTaskFromMessage(null);
                      if (window.electronAPI?.openKanbanWindow) {
                        window.electronAPI.openKanbanWindow(roomId!);
                      } else {
                        window.open(`${window.location.origin}/kanban/${roomId}`, '_blank', 'width=1100,height=750');
                      }
                    }} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>보드 열기</button>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <TaskCreateModal
              boards={proj.boards}
              members={room?.members || []}
              defaultTitle={taskFromMessage.title}
              onSubmit={async (data) => {
                try {
                  await projectsApi.createTask(proj.id, { ...data, messageId: taskFromMessage.messageId });
                  queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
                  setTaskFromMessage(null);
                } catch (err) {
                  console.error(err);
                }
              }}
              onClose={() => setTaskFromMessage(null)}
            />
          );
        })()}

        {shareEventOpen && (
          <div style={s.shareEventOverlay()} onClick={() => setShareEventOpen(false)}>
            <div style={s.shareEventModal(isDark)} onClick={(e) => e.stopPropagation()}>
              <h4 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333' }}>일정 공유</h4>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {myEvents.length === 0 ? (
                  <li style={{ padding: 16, color: isDark ? '#94a3b8' : '#888', fontSize: 14 }}>등록된 일정이 없습니다.</li>
                ) : (
                  myEvents.map((ev) => (
                    <li
                      key={ev.id}
                      style={{ padding: 12, borderBottom: `1px solid ${isDark ? '#475569' : '#f0f0f0'}`, cursor: 'pointer' }}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (!socketRef.current || !roomId) return;
                        socketRef.current.emit('message', { roomId, content: '', sharedEvent: { title: ev.title, startAt: ev.startAt, endAt: ev.endAt, description: ev.description ?? '' } });
                        queryClient.invalidateQueries({ queryKey: ['rooms'] });
                        setShareEventOpen(false);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && (document.activeElement as HTMLElement)?.click()}
                    >
                      <strong style={{ display: 'block', fontSize: 14, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333', marginBottom: 4 }}>{ev.title}</strong>
                      <span style={{ display: 'block', fontSize: 12, color: isDark ? '#94a3b8' : '#888' }}>
                        {new Date(ev.startAt).toLocaleString('ko-KR')} ~ {new Date(ev.endAt).toLocaleString('ko-KR')}
                      </span>
                    </li>
                  ))
                )}
              </ul>
              <button type="button" style={{ marginTop: 12, padding: '10px 20px', border: 'none', borderRadius: 8, background: isDark ? '#334155' : '#f0f0f0', color: isDark ? '#e2e8f0' : '#333', fontSize: 14, cursor: 'pointer', width: '100%' }} onClick={() => setShareEventOpen(false)}>
                닫기
              </button>
            </div>
          </div>
        )}

        {/* Reply/Edit indicator */}
        {(replyTo || editingMsg) && (
          <div style={s.replyIndicator(isDark)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#60a5fa' : '#2563eb' }}>
                {editingMsg ? '메시지 수정' : `${replyTo!.sender.name}에게 답장`}
              </span>
              <span style={{ fontSize: 12, color: isDark ? '#94a3b8' : '#888', marginLeft: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {editingMsg ? editingMsg.content : replyTo!.content}
              </span>
            </div>
            <UICloseButton size="sm" onClick={() => { setReplyTo(null); setEditingMsg(null); setInput(''); }} />
          </div>
        )}

        {/* Mention popup */}
        <div style={{ position: 'relative' }}>
          {mentionQuery !== null && (
            <MentionPopup members={members} query={mentionQuery} onSelect={handleMentionSelect} />
          )}
        </div>

        {/* 첨부 파일 프리뷰 바 */}
        {pendingFiles.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 16px', background: isDark ? '#1e293b' : '#f8fafc', borderTop: `1px solid ${isDark ? '#334155' : '#e2e8f0'}` }}>
            {pendingFiles.map((f, idx) => {
              const isImage = f.type.startsWith('image/');
              const sizeStr = f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / (1024 * 1024)).toFixed(1)}MB`;
              return (
                <div key={`${f.name}-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: isDark ? '#334155' : '#e2e8f0', maxWidth: 260 }}>
                  {isImage ? (
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  )}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>{sizeStr}</div>
                  </div>
                  <UICloseButton
                    size="sm"
                    aria-label="첨부 파일 제거"
                    title="첨부 파일 제거"
                    style={{ color: isDark ? '#94a3b8' : '#888' }}
                    onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* 업로드 프로그레스 바 */}
        {fileUploading && (
          <div style={{ padding: '0 16px 4px', background: isDark ? '#1e293b' : '#f8fafc' }}>
            <div style={{ height: 4, borderRadius: 2, background: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${fileUploadProgress}%`, background: '#3b82f6', borderRadius: 2, transition: 'width 0.2s' }} />
            </div>
            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999', marginTop: 2 }}>업로드 중 {Math.round(fileUploadProgress)}%</div>
          </div>
        )}

        {messageContext && (messageContext.filePath || messageContext.branch) && (
          <div style={{ padding: '6px 16px 4px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 8,
                background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
                color: isDark ? '#a5b4fc' : '#4f46e5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              📍 {[messageContext.filePath, messageContext.line > 0 ? `:${messageContext.line}` : null, messageContext.branch ? ` (${messageContext.branch})` : null].filter(Boolean).join('')}
              <UICloseButton
                size="sm"
                aria-label="제거"
                title="제거"
                style={{ opacity: 0.8 }}
                onClick={() => setMessageContext(null)}
              />
            </span>
          </div>
        )}
        <div style={s.inputRow(isDark)}>
          <div style={s.inputRowLeft()}>
            <div style={s.plusWrap()}>
              <button
                type="button"
                style={s.plusBtn(isDark)}
                onClick={() => setActionsOpen((v) => !v)}
                disabled={!socket}
                title="추가 액션"
              >
                +
              </button>
              {actionsOpen && (
                <div style={s.plusMenu(isDark)}>
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setContextOpen(true);
                    }}
                  >
                    코드 위치 첨부
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: isDark ? '#475569' : '#eef2f7',
                      margin: '2px 0',
                    }}
                  />
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setShareEventOpen(true);
                    }}
                  >
                    일정 공유
                  </button>
                  <div
                    style={{
                      height: 1,
                      background: isDark ? '#475569' : '#eef2f7',
                      margin: '2px 0',
                    }}
                  />
                  <button
                    type="button"
                    style={s.plusMenuItem(isDark)}
                    onClick={() => {
                      setActionsOpen(false);
                      setPollCreateOpen(true);
                    }}
                  >
                    투표 만들기
                  </button>
                </div>
              )}
            </div>
            <FileUploadButton
              disabled={!socket || fileUploading}
              onFileSelected={(files) =>
                setPendingFiles((prev) => [...prev, ...files])
              }
            />
          </div>
          <div style={s.inputRowCenter()}>
            <textarea
              ref={inputRef}
              placeholder="메시지를 입력하세요"
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              rows={1}
              style={s.input(isDark)}
            />
          </div>
          <div style={s.inputRowRight()}>
            <button
              type="button"
              onClick={sendMessage}
              style={s.sendBtn(isDark, !input.trim() || !socket || fileUploading)}
              disabled={!input.trim() || !socket || fileUploading}
            >
              {editingMsg ? '수정' : '전송'}
            </button>
          </div>
        </div>

        {/* Thread panel */}
        {threadOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 10005, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'flex-end' }} onClick={() => setThreadOpen(null)}>
            <div style={{ width: 380, height: '100%', background: isDark ? '#1e293b' : '#fff', boxShadow: isDark ? '-4px 0 20px rgba(0,0,0,0.3)' : '-4px 0 20px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '16px 20px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>스레드</span>
                <UICloseButton onClick={() => setThreadOpen(null)} />
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
                {/* Parent message */}
                <div style={{ padding: 14, borderRadius: 12, background: isDark ? '#334155' : '#f1f5f9', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 4 }}>{threadOpen.parent.sender?.name}</div>
                  <div style={{ fontSize: 14, color: isDark ? '#e2e8f0' : '#1e293b', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {threadOpen.parent.content}
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999', marginTop: 6 }}>
                    {new Date(threadOpen.parent.createdAt).toLocaleString('ko-KR')}
                  </div>
                </div>
                {/* Replies */}
                <div style={{ fontSize: 12, fontWeight: 600, color: isDark ? '#94a3b8' : '#64748b', marginBottom: 10 }}>
                  답글 {(threadOpen.replies ?? []).length}개
                </div>
                {(threadOpen.replies ?? []).map((r) => (
                  <div key={r.id} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: isDark ? '#475569' : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: isDark ? '#94a3b8' : '#475569', flexShrink: 0 }}>
                      {r.sender?.name?.[0]?.toUpperCase() || '?'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#1e293b' }}>{r.sender?.name}</span>
                        <span style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>{new Date(r.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div style={{ fontSize: 14, color: isDark ? '#cbd5e1' : '#333', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{r.content}</div>
                    </div>
                  </div>
                ))}
                {(threadOpen.replies ?? []).length === 0 && (
                  <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 13, marginTop: 20 }}>아직 답글이 없습니다</p>
                )}
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Right sidebar: icon bar (48px) + panel (280px) */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            width: rightPanel !== 'none' ? RIGHT_SIDEBAR_ICON_WIDTH + RIGHT_SIDEBAR_PANEL_WIDTH : RIGHT_SIDEBAR_ICON_WIDTH,
            borderLeft: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
            background: isDark ? '#1e293b' : '#fff',
            transition: 'width 0.2s ease',
          }}
        >
          <div style={{ width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 12, gap: 4 }}>
            <button
              type="button"
              onClick={handleOpenFileDrawer}
              title="파일함"
              style={{
                width: 40,
                height: 40,
                border: 'none',
                background: rightPanel === 'file' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: rightPanel === 'file' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setRightPanel((p) => (p === 'members' ? 'none' : 'members'))}
              title="멤버"
              style={{
                width: 40,
                height: 40,
                border: 'none',
                background: rightPanel === 'members' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: rightPanel === 'members' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setRightPanel((p) => (p === 'pins' ? 'none' : 'pins'))}
              title="고정 메시지"
              style={{
                width: 40,
                height: 40,
                border: 'none',
                background: rightPanel === 'pins' ? (isDark ? '#334155' : '#f1f5f9') : 'transparent',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: rightPanel === 'pins' ? (isDark ? '#60a5fa' : '#2563eb') : (isDark ? '#94a3b8' : '#64748b'),
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            </button>
          </div>
          {rightPanel !== 'none' && (
            <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderLeft: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, background: isDark ? '#1e293b' : '#fff', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`, background: isDark ? '#1e293b' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: isDark ? '#f1f5f9' : '#1e293b' }}>
                  {rightPanel === 'file' && '파일함'}
                  {rightPanel === 'members' && '멤버'}
                  {rightPanel === 'pins' && '고정 메시지'}
                </span>
                <UICloseButton
                  aria-label="패널 닫기"
                  size="lg"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); setRightPanel('none'); }}
                />
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
                {rightPanel === 'file' && (
                  <>
                    {fileDrawerData.length === 0 ? (
                      <p style={{ textAlign: 'center', color: isDark ? '#64748b' : '#999', fontSize: 14, marginTop: 24 }}>공유된 파일이 없습니다</p>
                    ) : (
                      fileDrawerData.map((f) => (
                        <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, marginBottom: 4, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                          </svg>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: isDark ? '#e2e8f0' : '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fileName || 'file'}</div>
                            <div style={{ fontSize: 11, color: isDark ? '#64748b' : '#999' }}>
                              {f.sender.name} · {new Date(f.createdAt).toLocaleDateString('ko-KR')}
                              {f.fileSize != null && ` · ${f.fileSize < 1024 * 1024 ? `${(f.fileSize / 1024).toFixed(0)}KB` : `${(f.fileSize / (1024 * 1024)).toFixed(1)}MB`}`}
                            </div>
                          </div>
                          <button type="button" onClick={() => filesApi.download(f.id, f.fileName)} style={{ border: 'none', background: isDark ? '#334155' : '#f1f5f9', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="다운로드">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                          </button>
                        </div>
                      ))
                    )}
                  </>
                )}
                {rightPanel === 'members' && <RightPanelMembers members={members} isDark={isDark} onInvite={() => setInviteOpen(true)} canInvite={canInvite} />}
                {rightPanel === 'pins' && <RightPanelPins roomId={roomId!} isDark={isDark} />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
