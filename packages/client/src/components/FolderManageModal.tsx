import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { foldersApi, type Folder, type Room } from '../api';
import { useAuthStore, useThemeStore } from '../store';

function FolderIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

type Props = {
  topicRooms: Room[];
  onClose: () => void;
};

export default function FolderManageModal({ topicRooms, onClose }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const myId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [newFolderName, setNewFolderName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomFolderMap, setRoomFolderMap] = useState<Record<string, string | null>>({});

  useEffect(() => {
    setRoomFolderMap((prev) => {
      const next: Record<string, string | null> = {};
      for (const r of topicRooms) {
        // 이미 사용자가 변경한 방은 로컬 값 유지 (refetch로 이전 데이터가 오면 덮어쓰지 않음)
        next[r.id] = r.id in prev ? prev[r.id] : (r.folderId ?? null);
      }
      return next;
    });
  }, [topicRooms]);

  const { data: folders = [] } = useQuery({
    queryKey: ['folders'],
    queryFn: foldersApi.list,
  });

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setError(null);
    setLoading(true);
    try {
      await foldersApi.create(newFolderName.trim());
      setNewFolderName('');
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 생성 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) { setEditingId(null); return; }
    setError(null);
    try {
      await foldersApi.update(id, editingName.trim());
      setEditingId(null);
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : '이름 변경 실패');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 폴더를 삭제하시겠습니까? 폴더 안의 아젠다는 미분류로 이동합니다.')) return;
    setError(null);
    try {
      await foldersApi.delete(id);
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    } catch (err) {
      setError(err instanceof Error ? err.message : '폴더 삭제 실패');
    }
  };

  const setRoomFolder = (roomId: string, folderId: string | null) => {
    setError(null);
    setRoomFolderMap((prev) => ({ ...prev, [roomId]: folderId }));
  };

  const handleDone = async () => {
    setError(null);
    setLoading(true);
    try {
      const toSave = topicRooms.filter((r) => {
        const current = roomFolderMap[r.id] ?? r.folderId ?? null;
        const changed = String(current || '') !== String(r.folderId ?? '');
        return changed;
      });
      for (const r of toSave) {
        const folderId = roomFolderMap[r.id] ?? r.folderId ?? null;
        await foldersApi.assign(r.id, folderId);
        if (myId) {
          queryClient.setQueryData<Room[]>(['rooms', myId], (prev) => {
            if (!prev) return prev;
            return prev.map((room) => (room.id === r.id ? { ...room, folderId } : room));
          });
        }
      }
      // invalidate 제거: refetch가 이전 데이터로 덮어써서 미분류로 되돌아가는 현상 방지
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '저장 실패';
      console.error('[FolderManage] save failed', err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const folderIdForRoom = (room: Room) => {
    const fid = roomFolderMap[room.id] ?? room.folderId ?? null;
    return fid === null ? '' : fid;
  };

  const hasUnsavedChanges = topicRooms.some((r) => {
    const current = roomFolderMap[r.id] ?? r.folderId ?? null;
    return String(current || '') !== String(r.folderId ?? '');
  });
  const handleOverlayClick = () => {
    if (hasUnsavedChanges && !confirm('변경사항이 저장되지 않았습니다. 닫을까요?')) return;
    onClose();
  };

  const st = getStyles(isDark);

  return (
    <div style={st.overlay} onClick={handleOverlayClick}>
      <div style={st.modal} onClick={(e) => e.stopPropagation()}>
        <div style={st.header}>
          <h3 style={st.title}>폴더 관리</h3>
          <button type="button" style={st.closeBtn} onClick={handleOverlayClick}>×</button>
        </div>

        {error && <div style={st.error}>{error}</div>}

        <div style={st.section}>
          <div style={st.sectionTitle}>폴더 추가</div>
          <div style={st.addRow}>
            <input
              type="text"
              placeholder="폴더 이름"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              style={st.input}
            />
            <button type="button" style={st.addBtn} onClick={handleCreateFolder} disabled={loading || !newFolderName.trim()}>
              추가
            </button>
          </div>
        </div>

        <div style={st.section}>
          <div style={st.sectionTitle}>폴더 목록</div>
          {folders.length === 0 ? (
            <div style={st.empty}>폴더가 없습니다</div>
          ) : (
            <ul style={st.folderList}>
              {folders.map((f) => (
                <li key={f.id} style={st.folderItem}>
                  {editingId === f.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        style={st.editInput}
                      />
                      <button type="button" style={st.smBtn} onClick={() => handleRename(f.id)}>저장</button>
                      <button type="button" style={st.smBtn} onClick={() => setEditingId(null)}>취소</button>
                    </>
                  ) : (
                    <>
                      <span style={st.folderName}><FolderIcon size={16} /> {f.name}</span>
                      <button type="button" style={st.smBtn} onClick={() => { setEditingId(f.id); setEditingName(f.name); }}>이름 변경</button>
                      <button type="button" style={{ ...st.smBtn, color: '#c62828' }} onClick={() => handleDelete(f.id)}>삭제</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={st.section}>
          <div style={st.sectionTitle}>아젠다 폴더 배치</div>
          {topicRooms.length === 0 ? (
            <div style={st.empty}>아젠다가 없습니다</div>
          ) : (
            <ul style={st.roomList}>
              {topicRooms.map((r) => (
                <li key={r.id} style={st.roomItem}>
                  <span style={st.roomName}>{r.name}</span>
                  <select
                    value={folderIdForRoom(r)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoomFolder(r.id, val === '' ? null : val);
                    }}
                    style={st.select}
                    title="폴더 선택"
                  >
                    <option value="">미분류</option>
                    {(folders as Folder[]).map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={st.footer}>
          <button type="button" style={st.doneBtn} onClick={handleDone} disabled={loading}>{loading ? '저장 중...' : '완료'}</button>
        </div>
      </div>
    </div>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  const bg = isDark ? '#1e293b' : '#fff';
  const border = isDark ? '#334155' : '#e2e8f0';
  const text = isDark ? '#e2e8f0' : '#1e293b';
  const sub = isDark ? '#94a3b8' : '#64748b';
  return {
    overlay: { position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 },
    modal: { background: bg, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxWidth: 440, width: '100%', maxHeight: '85vh', overflow: 'auto' },
    header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: `1px solid ${border}` },
    title: { margin: 0, fontSize: 18, fontWeight: 600, color: text },
    closeBtn: { border: 'none', background: 'none', fontSize: 24, color: sub, cursor: 'pointer', padding: 0, lineHeight: 1 },
    error: { margin: '8px 20px', padding: '8px 12px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, color: '#ef4444', fontSize: 13 },
    section: { padding: '16px 20px', borderBottom: `1px solid ${border}` },
    sectionTitle: { fontSize: 13, fontWeight: 600, color: sub, marginBottom: 10 },
    addRow: { display: 'flex', gap: 8 },
    input: { flex: 1, padding: '8px 12px', border: `1px solid ${border}`, borderRadius: 8, fontSize: 14, background: isDark ? '#0f172a' : '#f8fafc', color: text, outline: 'none' },
    addBtn: { padding: '8px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
    empty: { fontSize: 13, color: sub, padding: '8px 0' },
    folderList: { listStyle: 'none', margin: 0, padding: 0 },
    folderItem: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: `1px solid ${border}` },
    folderName: { flex: 1, fontSize: 14, color: text, display: 'flex', alignItems: 'center', gap: 8 },
    editInput: { flex: 1, padding: '6px 10px', border: `1px solid ${border}`, borderRadius: 6, fontSize: 13, background: isDark ? '#0f172a' : '#f8fafc', color: text },
    smBtn: { padding: '4px 10px', border: `1px solid ${border}`, borderRadius: 6, background: 'transparent', color: sub, fontSize: 12, cursor: 'pointer' },
    roomList: { listStyle: 'none', margin: 0, padding: 0 },
    roomItem: { display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: `1px solid ${border}` },
    roomName: { flex: 1, fontSize: 14, color: text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
    select: {
      padding: '8px 32px 8px 12px',
      border: `1px solid ${border}`,
      borderRadius: 8,
      fontSize: 13,
      background: isDark ? '#0f172a' : '#f8fafc',
      color: text,
      minWidth: 140,
      cursor: 'pointer',
      appearance: 'auto',
      WebkitAppearance: 'menulist',
      MozAppearance: 'menulist',
    },
    footer: { padding: 16, borderTop: `1px solid ${border}` },
    doneBtn: { width: '100%', padding: '10px 16px', border: 'none', borderRadius: 8, background: '#475569', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  };
}
