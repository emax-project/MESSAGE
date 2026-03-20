import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type TaskItem, type TaskComment, type User } from '../api';
import { useThemeStore } from '../store';
import UIModal from './ui/UIModal';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import ModalFooter from './ui/ModalFooter';
import { cn } from '../utils/cn';

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

  const selectClass = cn(
    'w-full px-2.5 py-2 border rounded-lg text-[13px] outline-none',
    isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-900',
  );

  const fieldLabelClass = cn(
    'text-xs font-semibold block mb-1',
    isDark ? 'text-slate-400' : 'text-slate-500',
  );

  return (
    <UIModal onClose={onClose} width={520} title="태스크 상세" zIndex={10010}>
      <div className="flex flex-col gap-3.5">
        <div className="flex items-center gap-2 -mt-0.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: PRIORITY_LABELS[priority]?.color || '#f59e0b' }}
          />
          <span className={cn('text-xs font-semibold', isDark ? 'text-slate-400' : 'text-slate-500')}>
            {PRIORITY_LABELS[priority]?.label || '보통'}
          </span>
        </div>
        <UITextInput
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={cn(
            '!px-3 !py-2.5 !text-base !font-semibold',
            isDark ? '!bg-slate-700 !text-slate-200' : '!bg-slate-100 !text-slate-800',
          )}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 추가..."
          rows={3}
          className={cn(
            'w-full px-3 py-2.5 border rounded-lg text-sm outline-none resize-y box-border',
            isDark ? 'border-slate-600 bg-slate-700 text-slate-200' : 'border-slate-200 bg-slate-100 text-slate-900',
          )}
        />
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className={fieldLabelClass}>담당자</label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className={selectClass}
            >
              <option value="">미배정</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={fieldLabelClass}>우선순위</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className={selectClass}
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
            </select>
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className={fieldLabelClass}>시작일</label>
            <UITextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(
                '!px-2.5 !py-2 !text-[13px]',
                isDark ? '!bg-slate-700 !text-slate-200' : '!bg-slate-100 !text-slate-800',
              )}
            />
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className={fieldLabelClass}>마감일</label>
            <UITextInput
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={cn(
                '!px-2.5 !py-2 !text-[13px]',
                isDark ? '!bg-slate-700 !text-slate-200' : '!bg-slate-100 !text-slate-800',
              )}
            />
          </div>
        </div>
        <ModalFooter bordered={false} justify="space-between">
          <UIButton
            type="button"
            variant="ghost"
            onClick={() => { if (confirm('태스크를 삭제하시겠습니까?')) onDelete(task.id); }}
            className={cn(
              '!text-red-500',
              isDark ? '!border !border-slate-600' : '!border !border-slate-200',
            )}
          >
            삭제
          </UIButton>
          <UIButton
            type="button"
            variant="primary"
            onClick={handleSave}
            disabled={!hasChanges || saving || !title.trim()}
          >
            {saving ? '저장 중...' : '저장'}
          </UIButton>
        </ModalFooter>
        <div className={cn('border-t pt-3.5', isDark ? 'border-slate-600' : 'border-slate-200')}>
          <h4 className={cn('mt-0 mb-2.5 text-[13px] font-semibold', isDark ? 'text-slate-200' : 'text-slate-900')}>
            댓글 ({comments.length})
          </h4>
          <div className="flex flex-col gap-2 max-h-[200px] overflow-auto mb-2.5">
            {comments.map((c: TaskComment) => (
              <div
                key={c.id}
                className={cn('px-2.5 py-2 rounded-lg', isDark ? 'bg-slate-700' : 'bg-slate-50')}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={cn('text-xs font-semibold', isDark ? 'text-slate-200' : 'text-slate-900')}>
                    {c.userName}
                  </span>
                  <span className={cn('text-[11px]', isDark ? 'text-slate-400' : 'text-slate-500')}>
                    {new Date(c.createdAt).toLocaleString('ko-KR')}
                  </span>
                </div>
                <div className={cn('text-[13px] whitespace-pre-wrap', isDark ? 'text-slate-200' : 'text-slate-900')}>
                  {c.content}
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className={cn('text-xs m-0', isDark ? 'text-slate-400' : 'text-slate-500')}>
                아직 댓글이 없습니다
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <UITextInput
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="댓글 입력..."
              className={cn(
                'flex-1 !px-3 !py-2 !text-[13px]',
                isDark ? '!bg-slate-700 !text-slate-200' : '!bg-slate-100 !text-slate-800',
              )}
            />
            <UIButton
              type="button"
              variant="primary"
              onClick={handleAddComment}
              disabled={!commentInput.trim()}
              className="shrink-0 !px-3.5 !py-2 !text-[13px]"
            >
              등록
            </UIButton>
          </div>
        </div>
      </div>
    </UIModal>
  );
}
