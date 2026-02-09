import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useThemeStore } from '../store';
import { roomsApi } from '../api';
import KanbanBoard from '../components/KanbanBoard';

export default function KanbanPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.token);
  const isDark = useThemeStore((s) => s.isDark);

  const { data: room, isLoading } = useQuery({
    queryKey: ['rooms', roomId],
    queryFn: () => (roomId ? roomsApi.get(roomId) : Promise.reject(new Error('no roomId'))),
    enabled: !!roomId && !!token,
  });

  if (!roomId) {
    navigate('/', { replace: true });
    return null;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: isDark ? '#0f172a' : '#f1f5f9', color: isDark ? '#94a3b8' : '#666' }}>
        로딩 중...
      </div>
    );
  }

  const handleClose = () => {
    const electronAPI = (window as unknown as { electronAPI?: { windowClose?: () => void } }).electronAPI;
    if (electronAPI?.windowClose) {
      electronAPI.windowClose();
    } else {
      window.close();
    }
  };

  return (
    <KanbanBoard
      roomId={roomId}
      members={room?.members || []}
      onClose={handleClose}
    />
  );
}
