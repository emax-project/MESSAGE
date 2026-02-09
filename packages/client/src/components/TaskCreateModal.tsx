import { useState } from 'react';
import { useThemeStore } from '../store';
import type { Board, User } from '../api';

type Props = {
  boards: Board[];
  members: User[];
  defaultBoardId?: string;
  defaultTitle?: string;
  onSubmit: (data: {
    boardId: string;
    title: string;
    description?: string;
    assigneeId?: string;
    priority: string;
    startDate?: string;
    dueDate?: string;
  }) => void;
  onClose: () => void;
};

export default function TaskCreateModal({ boards, members, defaultBoardId, defaultTitle, onSubmit, onClose }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [title, setTitle] = useState(defaultTitle || '');
  const [description, setDescription] = useState('');
  const [boardId, setBoardId] = useState(defaultBoardId || boards[0]?.id || '');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');

  const bg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#e2e8f0' : '#333';
  const sub = isDark ? '#94a3b8' : '#666';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const border = isDark ? '#475569' : '#e5e7eb';

  const handleSubmit = () => {
    if (!title.trim() || !boardId) return;
    onSubmit({
      boardId,
      title: title.trim(),
      description: description.trim() || undefined,
      assigneeId: assigneeId || undefined,
      priority,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: bg, borderRadius: 12, width: 400, maxWidth: '90%', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: text }}>태스크 추가</h3>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: sub, cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>제목 *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="태스크 제목"
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="태스크 설명 (선택)"
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>보드</label>
              <select
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none' }}
              >
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none' }}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>담당자</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none' }}
              >
                <option value="">미배정</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', border: `1px solid ${border}`, borderRadius: 8, background: 'none', color: sub, fontSize: 14, cursor: 'pointer' }}>
              취소
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: title.trim() ? '#475569' : (isDark ? '#334155' : '#e5e7eb'), color: title.trim() ? '#fff' : sub, fontSize: 14, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'default' }}
            >
              추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
