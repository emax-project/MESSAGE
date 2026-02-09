import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, type Project, type TaskItem, type User } from '../api';
import { useThemeStore } from '../store';
import TaskCreateModal from './TaskCreateModal';
import TaskDetailModal from './TaskDetailModal';

type Props = {
  roomId: string;
  members: User[];
  onClose: () => void;
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
};

export default function KanbanBoard({ roomId, members, onClose }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const queryClient = useQueryClient();

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateTask, setShowCreateTask] = useState<string | null>(null); // boardId
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [editingBoardId, setEditingBoardId] = useState<string | null>(null);
  const [editingBoardName, setEditingBoardName] = useState('');
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardName, setNewBoardName] = useState('');

  const bg = isDark ? '#0f172a' : '#f1f5f9';
  const headerBg = isDark ? '#1e293b' : '#475569';
  const cardBg = isDark ? '#1e293b' : '#fff';
  const columnBg = isDark ? '#1e293b80' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#333';
  const sub = isDark ? '#94a3b8' : '#666';
  const border = isDark ? '#475569' : '#e5e7eb';
  const inputBg = isDark ? '#334155' : '#f5f5f5';

  const { data: projects = [] } = useQuery({
    queryKey: ['projects', roomId],
    queryFn: () => projectsApi.list(roomId),
    enabled: !!roomId,
  });

  const project: Project | undefined = projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Auto-select first project
  if (project && !selectedProjectId && projects.length > 0) {
    setSelectedProjectId(project.id);
  }

  const boards = project?.boards || [];
  const tasks = project?.tasks || [];

  const getTasksForBoard = useCallback((boardId: string) => {
    return tasks.filter((t) => t.boardId === boardId).sort((a, b) => a.position - b.position);
  }, [tasks]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const created = await projectsApi.create({ roomId, name: newProjectName.trim() });
      setSelectedProjectId(created.id);
      setNewProjectName('');
      setShowCreateProject(false);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) return;
    try {
      await projectsApi.delete(project.id);
      setSelectedProjectId(null);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (data: { boardId: string; title: string; description?: string; assigneeId?: string; priority: string; dueDate?: string }) => {
    if (!project) return;
    try {
      await projectsApi.createTask(project.id, data);
      setShowCreateTask(null);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateTask = async (taskId: string, data: Record<string, unknown>) => {
    if (!project) return;
    try {
      await projectsApi.updateTask(project.id, taskId, data as Parameters<typeof projectsApi.updateTask>[2]);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;
    try {
      await projectsApi.deleteTask(project.id, taskId);
      setSelectedTask(null);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDrop = async (boardId: string) => {
    if (!project || !dragTaskId) return;
    const task = tasks.find((t) => t.id === dragTaskId);
    if (!task || task.boardId === boardId) {
      setDragTaskId(null);
      setDragOverBoardId(null);
      return;
    }
    const boardTasks = getTasksForBoard(boardId);
    const newPosition = boardTasks.length;
    try {
      await projectsApi.moveTask(project.id, dragTaskId, boardId, newPosition);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
    setDragTaskId(null);
    setDragOverBoardId(null);
  };

  const handleAddBoard = async () => {
    if (!project || !newBoardName.trim()) return;
    try {
      await projectsApi.addBoard(project.id, newBoardName.trim());
      setNewBoardName('');
      setAddingBoard(false);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateBoard = async (boardId: string) => {
    if (!project || !editingBoardName.trim()) return;
    try {
      await projectsApi.updateBoard(project.id, boardId, editingBoardName.trim());
      setEditingBoardId(null);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!project) return;
    const boardTasks = getTasksForBoard(boardId);
    if (boardTasks.length > 0 && !confirm('이 보드의 태스크도 모두 삭제됩니다. 계속하시겠습니까?')) return;
    try {
      await projectsApi.deleteBoard(project.id, boardId);
      queryClient.invalidateQueries({ queryKey: ['projects', roomId] });
    } catch (err) {
      console.error(err);
    }
  };

  const hasElectron = typeof window !== 'undefined' && !!(window as unknown as { electronAPI?: unknown }).electronAPI;

  return (
    <div style={{ width: '100%', height: '100vh', background: bg, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Electron title bar */}
      {hasElectron && (
        <div style={{ flexShrink: 0, height: 38, minHeight: 38, display: 'flex', alignItems: 'center', paddingLeft: 12, paddingRight: 12, gap: 8, background: isDark ? '#1e293b' : '#fff', borderBottom: `1px solid ${isDark ? '#334155' : '#eee'}`, WebkitAppRegion: 'drag' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, WebkitAppRegion: 'no-drag' as const }}>
            <button type="button" style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#c0c0c0', cursor: 'pointer', padding: 0 }} onClick={() => (window as unknown as { electronAPI: { windowClose: () => void } }).electronAPI.windowClose()} aria-label="닫기" />
            <button type="button" style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#c0c0c0', cursor: 'pointer', padding: 0 }} onClick={() => (window as unknown as { electronAPI: { windowMinimize: () => void } }).electronAPI.windowMinimize()} aria-label="최소화" />
            <button type="button" style={{ width: 12, height: 12, borderRadius: '50%', border: 'none', background: '#c0c0c0', cursor: 'pointer', padding: 0 }} onClick={() => (window as unknown as { electronAPI: { windowMaximize: () => void } }).electronAPI.windowMaximize()} aria-label="최대화" />
          </div>
          <span style={{ flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 600, color: isDark ? '#e2e8f0' : '#333', pointerEvents: 'none' }}>프로젝트 보드</span>
        </div>
      )}
      {/* Header */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: 50, background: headerBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button type="button" onClick={onClose} aria-label="뒤로" style={{ border: 'none', background: 'none', color: '#fff', cursor: 'pointer', padding: '4px 8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#fff' }}>
            {project ? project.name : '프로젝트 관리'}
          </h2>
          {projects.length > 1 && (
            <select
              value={selectedProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{ padding: '4px 8px', borderRadius: 6, border: 'none', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 13, outline: 'none' }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} style={{ color: '#333' }}>{p.name}</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => {
              const eApi = (window as unknown as { electronAPI?: { openGanttWindow?: (id: string) => void } }).electronAPI;
              if (eApi?.openGanttWindow) {
                eApi.openGanttWindow(roomId);
              } else {
                window.open(`${window.location.origin}/gantt/${roomId}`, '_blank', 'width=1200,height=700');
              }
            }}
            style={{ padding: '6px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            간트 차트
          </button>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            style={{ padding: '6px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'none', color: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            + 프로젝트
          </button>
          {project && (
            <button
              type="button"
              onClick={handleDeleteProject}
              style={{ padding: '6px 12px', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, background: 'none', color: '#fca5a5', fontSize: 12, cursor: 'pointer' }}
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* Create project modal */}
      {showCreateProject && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10010, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowCreateProject(false)}>
          <div style={{ background: cardBg, borderRadius: 12, padding: 24, width: 360, maxWidth: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: text }}>새 프로젝트</h3>
            <input
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              placeholder="프로젝트 이름"
              autoFocus
              style={{ width: '100%', padding: '10px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: inputBg, color: text, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowCreateProject(false)} style={{ padding: '8px 16px', border: `1px solid ${border}`, borderRadius: 8, background: 'none', color: sub, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button type="button" onClick={handleCreateProject} style={{ padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>만들기</button>
            </div>
          </div>
        </div>
      )}

      {/* Board content */}
      {!project ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 16, color: sub }}>프로젝트가 없습니다</p>
          <button
            type="button"
            onClick={() => setShowCreateProject(true)}
            style={{ padding: '12px 24px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            프로젝트 만들기
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 12, padding: 16, overflow: 'hidden' }}>
          {boards.map((board) => {
            const boardTasks = getTasksForBoard(board.id);
            const isDragOver = dragOverBoardId === board.id;
            return (
              <div
                key={board.id}
                style={{
                  flex: 1,
                  minWidth: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  background: columnBg,
                  borderRadius: 12,
                  border: isDragOver ? '2px dashed #6366f1' : '2px solid transparent',
                  overflow: 'hidden',
                }}
                onDragOver={(e) => { e.preventDefault(); setDragOverBoardId(board.id); }}
                onDragLeave={() => setDragOverBoardId(null)}
                onDrop={(e) => { e.preventDefault(); handleDrop(board.id); }}
              >
                {/* Column header */}
                <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {editingBoardId === board.id ? (
                    <input
                      value={editingBoardName}
                      onChange={(e) => setEditingBoardName(e.target.value)}
                      onBlur={() => handleUpdateBoard(board.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateBoard(board.id); if (e.key === 'Escape') setEditingBoardId(null); }}
                      autoFocus
                      style={{ flex: 1, padding: '4px 8px', border: `1px solid ${border}`, borderRadius: 4, fontSize: 13, fontWeight: 600, background: inputBg, color: text, outline: 'none' }}
                    />
                  ) : (
                    <span
                      style={{ fontSize: 13, fontWeight: 700, color: text, cursor: 'pointer' }}
                      onDoubleClick={() => { setEditingBoardId(board.id); setEditingBoardName(board.name); }}
                    >
                      {board.name} ({boardTasks.length})
                    </span>
                  )}
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      type="button"
                      onClick={() => setShowCreateTask(board.id)}
                      style={{ border: 'none', background: 'none', color: sub, fontSize: 18, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                      title="태스크 추가"
                    >
                      +
                    </button>
                    {boards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteBoard(board.id)}
                        style={{ border: 'none', background: 'none', color: sub, fontSize: 14, cursor: 'pointer', padding: '0 4px', lineHeight: 1 }}
                        title="보드 삭제"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>

                {/* Tasks */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {boardTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); setDragTaskId(task.id); }}
                      onDragEnd={() => { setDragTaskId(null); setDragOverBoardId(null); }}
                      onClick={() => setSelectedTask(task)}
                      style={{
                        padding: '10px 12px',
                        background: cardBg,
                        borderRadius: 8,
                        cursor: 'grab',
                        border: `1px solid ${border}`,
                        opacity: dragTaskId === task.id ? 0.5 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: text, marginBottom: 6 }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: PRIORITY_COLORS[task.priority] + '20',
                          color: PRIORITY_COLORS[task.priority],
                        }}>
                          {PRIORITY_LABELS[task.priority]}
                        </span>
                        {task.assigneeName && (
                          <span style={{ fontSize: 11, color: sub }}>@{task.assigneeName}</span>
                        )}
                        {task.dueDate && (
                          <span style={{
                            fontSize: 11, color: sub,
                            ...(new Date(task.dueDate) < new Date() ? { color: '#ef4444' } : {}),
                          }}>
                            {new Date(task.dueDate).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {(task._count?.comments ?? 0) > 0 && (
                          <span style={{ fontSize: 11, color: sub }}>
                            {'\uD83D\uDCAC'}{task._count!.comments}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add task button at bottom */}
                <button
                  type="button"
                  onClick={() => setShowCreateTask(board.id)}
                  style={{
                    margin: '0 8px 8px',
                    padding: '8px',
                    border: `1px dashed ${border}`,
                    borderRadius: 8,
                    background: 'none',
                    color: sub,
                    fontSize: 12,
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  + 태스크 추가
                </button>
              </div>
            );
          })}

          {/* Add board column */}
          <div style={{ flex: 1, minWidth: 200 }}>
            {addingBoard ? (
              <div style={{ background: columnBg, borderRadius: 12, padding: 12 }}>
                <input
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddBoard(); if (e.key === 'Escape') setAddingBoard(false); }}
                  placeholder="보드 이름"
                  autoFocus
                  style={{ width: '100%', padding: '8px 10px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, background: inputBg, color: text, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button type="button" onClick={handleAddBoard} style={{ padding: '6px 12px', border: 'none', borderRadius: 6, background: '#475569', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>추가</button>
                  <button type="button" onClick={() => setAddingBoard(false)} style={{ padding: '6px 12px', border: `1px solid ${border}`, borderRadius: 6, background: 'none', color: sub, fontSize: 12, cursor: 'pointer' }}>취소</button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingBoard(true)}
                style={{
                  width: '100%',
                  padding: 16,
                  border: `2px dashed ${border}`,
                  borderRadius: 12,
                  background: 'none',
                  color: sub,
                  fontSize: 13,
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                + 보드 추가
              </button>
            )}
          </div>
        </div>
      )}

      {/* Task Create Modal */}
      {showCreateTask && project && (
        <TaskCreateModal
          boards={boards}
          members={members}
          defaultBoardId={showCreateTask}
          onSubmit={handleCreateTask}
          onClose={() => setShowCreateTask(null)}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTask && project && (
        <TaskDetailModal
          task={selectedTask}
          projectId={project.id}
          members={members}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
