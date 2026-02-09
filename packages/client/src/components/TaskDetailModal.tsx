import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type TaskItem, type TaskComment, type User } from '../api';
import { useThemeStore } from '../store';

type Props = {
  task: TaskItem;
  projectId: string;
  members: User[];
  onUpdate: (taskId: string, data: Record<string, unknown>) => void;
  onDelete: (taskId: string) => void;
  onClose: () => void;
};

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: '낮음', color: '#22c55e' },
  medium: { label: '보통', color: '#f59e0b' },
  high: { label: '높음', color: '#ef4444' },
};

export default function TaskDetailModal({ task, projectId, members, onUpdate, onDelete, onClose }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [assigneeId, setAssigneeId] = useState(task.assigneeId || '');
  const [priority, setPriority] = useState(task.priority);
  const [startDate, setStartDate] = useState(task.startDate ? task.startDate.split('T')[0] : '');
  const [dueDate, setDueDate] = useState(task.dueDate ? task.dueDate.split('T')[0] : '');
  const [commentInput, setCommentInput] = useState('');
  const [saving, setSaving] = useState(false);

  const bg = isDark ? '#1e293b' : '#fff';
  const text = isDark ? '#e2e8f0' : '#333';
  const sub = isDark ? '#94a3b8' : '#666';
  const inputBg = isDark ? '#334155' : '#f5f5f5';
  const border = isDark ? '#475569' : '#e5e7eb';
  const cardBg = isDark ? '#334155' : '#f8fafc';

  const { data: comments = [] } = useQuery({
    queryKey: ['taskComments', projectId, task.id],
    queryFn: () => projectsApi.getComments(projectId, task.id),
  });

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || '');
    setAssigneeId(task.assigneeId || '');
    setPriority(task.priority);
    setStartDate(task.startDate ? task.startDate.split('T')[0] : '');
    setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
  }, [task]);

  const handleSave = async () => {
    setSaving(true);
    try {
      onUpdate(task.id, {
        title: title.trim(),
        description: description.trim() || null,
        assigneeId: assigneeId || null,
        priority,
        startDate: startDate || null,
        dueDate: dueDate || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    try {
      await projectsApi.addComment(projectId, task.id, commentInput.trim());
      setCommentInput('');
      queryClient.invalidateQueries({ queryKey: ['taskComments', projectId, task.id] });
    } catch (err) {
      console.error(err);
    }
  };

  const hasChanges = title !== task.title ||
    (description || '') !== (task.description || '') ||
    (assigneeId || '') !== (task.assigneeId || '') ||
    priority !== task.priority ||
    startDate !== (task.startDate ? task.startDate.split('T')[0] : '') ||
    dueDate !== (task.dueDate ? task.dueDate.split('T')[0] : '');

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: bg, borderRadius: 12, width: 500, maxWidth: '90%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_LABELS[priority]?.color || '#f59e0b' }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: text }}>태스크 상세</h3>
          </div>
          <button type="button" onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: sub, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Title */}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 16, fontWeight: 600, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
          />

          {/* Description */}
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 추가..."
            rows={3}
            style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />

          {/* Properties */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>담당자</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: inputBg, color: text, outline: 'none' }}
              >
                <option value="">미배정</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>우선순위</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: inputBg, color: text, outline: 'none' }}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 120 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: sub, display: 'block', marginBottom: 4 }}>마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: inputBg, color: text, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Save / Delete */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
            <button
              type="button"
              onClick={() => { if (confirm('태스크를 삭제하시겠습니까?')) onDelete(task.id); }}
              style={{ padding: '8px 16px', border: `1px solid ${border}`, borderRadius: 8, background: 'none', color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
            >
              삭제
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving || !title.trim()}
              style={{
                padding: '8px 20px', border: 'none', borderRadius: 8,
                background: hasChanges && title.trim() ? '#475569' : (isDark ? '#334155' : '#e5e7eb'),
                color: hasChanges && title.trim() ? '#fff' : sub,
                fontSize: 13, fontWeight: 600, cursor: hasChanges ? 'pointer' : 'default',
              }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          {/* Comments */}
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 14 }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: text }}>
              댓글 ({comments.length})
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflow: 'auto', marginBottom: 10 }}>
              {comments.map((c: TaskComment) => (
                <div key={c.id} style={{ padding: '8px 10px', borderRadius: 8, background: cardBg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: text }}>{c.userName}</span>
                    <span style={{ fontSize: 11, color: sub }}>{new Date(c.createdAt).toLocaleString('ko-KR')}</span>
                  </div>
                  <div style={{ fontSize: 13, color: text, whiteSpace: 'pre-wrap' }}>{c.content}</div>
                </div>
              ))}
              {comments.length === 0 && (
                <p style={{ fontSize: 12, color: sub, margin: 0 }}>아직 댓글이 없습니다</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="댓글 입력..."
                style={{ flex: 1, padding: '8px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 13, background: inputBg, color: text, outline: 'none' }}
              />
              <button
                type="button"
                onClick={handleAddComment}
                disabled={!commentInput.trim()}
                style={{ padding: '8px 14px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
              >
                등록
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
