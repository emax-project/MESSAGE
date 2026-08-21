import type { ReactNode } from 'react';
import DOMPurify from 'dompurify';
import type { Message } from '../../api';

const EDIT_LIMIT_MS = 5 * 60 * 1000;

// 코드 위치 첨부 기능 숨김
export const HIDE_CONTEXT_ATTACH = true;

export function isSystemMessage(content: string): boolean {
  return /님이\s.+님을\s초대했습니다$/.test(content) || content === '[파일 만료됨]' || /님이 채팅방을 나갔습니다$/.test(content);
}

export function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

export function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function canEditOrDelete(msg: Message, myId?: string): boolean {
  if (!myId || msg.senderId !== myId || msg.deletedAt) return false;
  return Date.now() - new Date(msg.createdAt).getTime() < EDIT_LIMIT_MS;
}

// 프로토콜 있는 URL + 도메인만(naver.com, www.google.com 등) + @멘션
const LINK_SPLIT_REGEX = /(https?:\/\/[^\s<>"']+|(?:www\.)?[a-zA-Z0-9][-a-zA-Z0-9]*(?:\.[a-zA-Z0-9][-a-zA-Z0-9]*)*\.[a-zA-Z]{2,}|@\S+)/gi;

function renderLink(key: number, href: string, label: string, linkColor: string): ReactNode {
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

/** HTML(리치 텍스트)인지 판별 - TipTap 출력 등 */
export function looksLikeHtml(content: string): boolean {
  if (!content || content.length < 3) return false;
  return /<[a-z][\s\S]*>/i.test(content);
}

function getMessageLinkColor(isDark: boolean, isMine?: boolean): string {
  if (isMine) return '#fef08a';
  return isDark ? '#93c5fd' : 'var(--color-brand-dark)';
}

export function renderMessageContent(content: string, isDark: boolean, isMine?: boolean): ReactNode {
  if (looksLikeHtml(content)) {
    const sanitized = DOMPurify.sanitize(content, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'a', 'blockquote'],
    });
    return (
      <div
        className={isMine ? 'board-content-html board-content-html--mine' : 'board-content-html'}
        dangerouslySetInnerHTML={{ __html: sanitized }}
        style={{
          fontSize: 14,
          lineHeight: 1.5,
          wordBreak: 'break-word',
        }}
        data-dark={isDark}
      />
    );
  }
  return renderContentWithMentions(content, isDark, isMine);
}

export function renderContentWithMentions(content: string, isDark: boolean, isMine?: boolean): ReactNode {
  const parts = content.split(LINK_SPLIT_REGEX);
  const linkColor = getMessageLinkColor(isDark, isMine);
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
