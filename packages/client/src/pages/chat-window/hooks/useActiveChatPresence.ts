import { useEffect } from 'react';
import { roomsApi } from '../../../api';

export function useActiveChatPresence(roomId?: string) {
  useEffect(() => {
    if (!roomId) return;
    try {
      const existing = localStorage.getItem('activeChatFocused');
      if (existing != null && existing !== '0' && existing !== '1') {
        localStorage.removeItem('activeChatFocused');
        localStorage.removeItem('activeChatRoomId');
      }
    } catch {
      // ignore
    }

    const setActive = (focused: boolean) => {
      try {
        localStorage.setItem('activeChatRoomId', roomId);
        localStorage.setItem('activeChatFocused', focused ? '1' : '0');
      } catch {
        // ignore
      }
    };

    setActive(typeof document !== 'undefined' ? !document.hidden : true);

    const onFocusActive = () => setActive(true);
    const onBlur = () => setActive(false);
    const onVisibilityActive = () => setActive(!(typeof document !== 'undefined' && document.hidden));
    window.addEventListener('focus', onFocusActive);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibilityActive);

    const markIfVisible = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      roomsApi.markRead(roomId).catch(() => {});
    };
    const onFocusRead = () => markIfVisible();
    const onVisibilityRead = () => markIfVisible();
    window.addEventListener('focus', onFocusRead);
    document.addEventListener('visibilitychange', onVisibilityRead);

    return () => {
      window.removeEventListener('focus', onFocusActive);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibilityActive);
      try {
        const current = localStorage.getItem('activeChatRoomId');
        if (current === roomId) {
          localStorage.removeItem('activeChatRoomId');
          localStorage.removeItem('activeChatFocused');
        }
      } catch {
        // ignore
      }
      window.removeEventListener('focus', onFocusRead);
      document.removeEventListener('visibilitychange', onVisibilityRead);
    };
  }, [roomId]);
}
