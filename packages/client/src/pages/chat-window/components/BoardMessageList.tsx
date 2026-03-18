import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Socket } from 'socket.io-client';
import type { Message, ReactionGroup, Room } from '../../../api';
import EventCard from '../../../components/EventCard';
import PollCard from '../../../components/PollCard';
import FileMessage from '../../../components/FileMessage';
import LinkPreview, { extractFirstUrl } from '../../../components/LinkPreview';
import { chatWindowStyles } from '../styles';
import { formatDateLabel, getDateKey, isSystemMessage, renderContentWithMentions } from '../utils';

type BoardMessageListProps = {
  rootPosts: Message[];
  repliesMap: Map<string, Message[]>;
  isDark: boolean;
  myId?: string;
  room?: Room;
  setContextMenu: Dispatch<SetStateAction<{ x: number; y: number; message: Message } | null>>;
  showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
  handleReaction: (messageId: string, emoji: string) => void | Promise<void>;
  boardCommentInputs: Record<string, string>;
  setBoardCommentInputs: Dispatch<SetStateAction<Record<string, string>>>;
  socketRef: MutableRefObject<Socket | null>;
  roomId?: string;
};

const s = chatWindowStyles;

export default function BoardMessageList({
  rootPosts,
  repliesMap,
  isDark,
  myId,
  room,
  setContextMenu,
  showToast,
  handleReaction,
  boardCommentInputs,
  setBoardCommentInputs,
  socketRef,
  roomId,
}: BoardMessageListProps) {
  return (
    <>
      {rootPosts.map((m, idx) => {
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
      })}
    </>
  );
}
