import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { foldersApi, type Folder, type Room } from '../api';
import { useAuthStore, useThemeStore } from '../store';
import UICloseButton from './ui/UICloseButton';
import { cn } from '../utils/cn';

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

  const borderColor = isDark ? 'border-slate-600' : 'border-slate-200';
  const textColor = isDark ? 'text-slate-200' : 'text-slate-900';
  const mutedColor = isDark ? 'text-slate-400' : 'text-slate-500';
  const inputBg = isDark ? 'bg-slate-700' : 'bg-slate-100';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-center justify-center p-6" onClick={handleOverlayClick}>
      <div
        className={cn(
          'rounded-xl max-w-[440px] w-full max-h-[85vh] overflow-auto shadow-[0_8px_32px_rgba(0,0,0,0.2)]',
          isDark ? 'bg-slate-800' : 'bg-white',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('flex items-center justify-between px-5 py-4 border-b', borderColor)}>
          <h3 className={cn('m-0 text-lg font-semibold', textColor)}>폴더 관리</h3>
          <UICloseButton onClick={handleOverlayClick} />
        </div>

        {error && (
          <div className="mx-5 my-2 px-3 py-2 bg-red-500/10 rounded-lg text-red-500 text-[13px]">
            {error}
          </div>
        )}

        <div className={cn('px-5 py-4 border-b', borderColor)}>
          <div className={cn('text-[13px] font-semibold mb-2.5', mutedColor)}>폴더 추가</div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="폴더 이름"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className={cn('flex-1 px-3 py-2 border rounded-lg text-sm outline-none', inputBg, textColor, borderColor)}
            />
            <button
              type="button"
              className="px-4 py-2 border-none rounded-lg bg-[#5B8DEF] text-white text-[13px] font-semibold cursor-pointer"
              onClick={handleCreateFolder}
              disabled={loading || !newFolderName.trim()}
            >
              추가
            </button>
          </div>
        </div>

        <div className={cn('px-5 py-4 border-b', borderColor)}>
          <div className={cn('text-[13px] font-semibold mb-2.5', mutedColor)}>폴더 목록</div>
          {folders.length === 0 ? (
            <div className={cn('text-[13px] py-2', mutedColor)}>폴더가 없습니다</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {folders.map((f) => (
                <li key={f.id} className={cn('flex items-center gap-2 py-2 border-b', borderColor)}>
                  {editingId === f.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRename(f.id); if (e.key === 'Escape') setEditingId(null); }}
                        autoFocus
                        className={cn('flex-1 px-2.5 py-1.5 border rounded-md text-[13px] outline-none', inputBg, textColor, borderColor)}
                      />
                      <button
                        type="button"
                        className={cn('px-2.5 py-1 border rounded-md bg-transparent text-xs cursor-pointer', mutedColor, borderColor)}
                        onClick={() => handleRename(f.id)}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className={cn('px-2.5 py-1 border rounded-md bg-transparent text-xs cursor-pointer', mutedColor, borderColor)}
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={cn('flex-1 text-sm flex items-center gap-2', textColor)}>
                        <FolderIcon size={16} /> {f.name}
                      </span>
                      <button
                        type="button"
                        className={cn('px-2.5 py-1 border rounded-md bg-transparent text-xs cursor-pointer', mutedColor, borderColor)}
                        onClick={() => { setEditingId(f.id); setEditingName(f.name); }}
                      >
                        이름 변경
                      </button>
                      <button
                        type="button"
                        className={cn('px-2.5 py-1 border rounded-md bg-transparent text-xs cursor-pointer text-[#c62828]', borderColor)}
                        onClick={() => handleDelete(f.id)}
                      >
                        삭제
                      </button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className={cn('px-5 py-4 border-b', borderColor)}>
          <div className={cn('text-[13px] font-semibold mb-2.5', mutedColor)}>아젠다 폴더 배치</div>
          {topicRooms.length === 0 ? (
            <div className={cn('text-[13px] py-2', mutedColor)}>아젠다가 없습니다</div>
          ) : (
            <ul className="list-none m-0 p-0">
              {topicRooms.map((r) => (
                <li key={r.id} className={cn('flex items-center gap-3 py-2 border-b', borderColor)}>
                  <span className={cn('flex-1 text-sm truncate', textColor)}>{r.name}</span>
                  <select
                    value={folderIdForRoom(r)}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRoomFolder(r.id, val === '' ? null : val);
                    }}
                    className={cn(
                      'pl-3 pr-8 py-2 border rounded-lg text-[13px] min-w-[140px] cursor-pointer appearance-auto',
                      inputBg, textColor, borderColor,
                    )}
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

        <div className={cn('p-4 border-t', borderColor)}>
          <button
            type="button"
            className="w-full px-4 py-2.5 border-none rounded-lg bg-[#5B8DEF] text-white text-sm font-semibold cursor-pointer"
            onClick={handleDone}
            disabled={loading}
          >
            {loading ? '저장 중...' : '완료'}
          </button>
        </div>
      </div>
    </div>
  );
}
