import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';
import type { Message, ReactionGroup, Room } from '../../../api';
import EventCard from '../../../components/EventCard';
import PollCard from '../../../components/PollCard';
import FileMessage from '../../../components/FileMessage';
import LinkPreview, { extractFirstUrl } from '../../../components/LinkPreview';
import EmojiPicker from '../../../components/EmojiPicker';
import { chatWindowStyles } from '../styles';
import { formatDateLabel, getDateKey, isSystemMessage, renderContentWithMentions } from '../utils';

type ChatBubbleListProps = {
  displayMessages: Message[];
  firstUnreadMessageId: string | null;
  firstUnreadRef: RefObject<HTMLDivElement | null>;
  isDark: boolean;
  myId?: string;
  room?: Room;
  hoveredMsg: string | null;
  highlightedMsgId: string | null;
  emojiPickerMsg: string | null;
  setHoveredMsg: Dispatch<SetStateAction<string | null>>;
  setHighlightedMsgId: Dispatch<SetStateAction<string | null>>;
  setContextMenu: Dispatch<SetStateAction<{ x: number; y: number; message: Message } | null>>;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  setReplyTo: Dispatch<SetStateAction<Message | null>>;
  setEmojiPickerMsg: Dispatch<SetStateAction<string | null>>;
  handleReaction: (messageId: string, emoji: string) => void | Promise<void>;
};

const s = chatWindowStyles;

export default function ChatBubbleList({
  displayMessages,
  firstUnreadMessageId,
  firstUnreadRef,
  isDark,
  myId,
  room,
  hoveredMsg,
  highlightedMsgId,
  emojiPickerMsg,
  setHoveredMsg,
  setHighlightedMsgId,
  setContextMenu,
  showToast,
  setReplyTo,
  setEmojiPickerMsg,
  handleReaction,
}: ChatBubbleListProps) {
  return (
    <>
      {displayMessages.map((m, idx) => {
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
        if (m.id === firstUnreadMessageId) {
          elements.push(
            <div key={`unread-${m.id}`} ref={firstUnreadRef} style={s.unreadDivider(isDark)}>
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
    </>
  );
}
