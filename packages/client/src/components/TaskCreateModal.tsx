import { useState } from 'react';
import { useThemeStore } from '../store';
import type { Board, User } from '../api';
import UIModal from './ui/UIModal';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import ModalFooter from './ui/ModalFooter';

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

  const text = isDark ? '#e2e8f0' : '#0f172a';
  const sub = isDark ? '#94a3b8' : '#64748b';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const border = isDark ? '#475569' : '#e2e8f0';

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
    <UIModal onClose={onClose} width={420} title="태스크 추가" zIndex={10010}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>제목 *</label>
          <UITextInput
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="태스크 제목"
            style={{ padding: '10px 12px', background: inputBg, color: text }}
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
            <UITextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ padding: '10px 12px', background: inputBg, color: text }}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>마감일</label>
            <UITextInput
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              style={{ padding: '10px 12px', background: inputBg, color: text }}
            />
          </div>
        </div>
        <ModalFooter bordered={false} marginTop={4}>
          <UIButton type="button" onClick={onClose}>
            취소
          </UIButton>
          <UIButton
            type="button"
            variant="primary"
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            추가
          </UIButton>
        </ModalFooter>
      </div>
    </UIModal>
  );
}
