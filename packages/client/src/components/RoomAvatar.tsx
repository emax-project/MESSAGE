import { useState, useEffect, useRef } from 'react';
import { roomsApi, getBaseUrl } from '../api';
import { useAuthStore } from '../store';

type Props = {
  roomId: string;
  name: string;
  initials?: string | null;
  hasAvatar: boolean;
  /** 서버에서 받은 avatarUrl 경로 (예: /rooms/xxx/avatar). 있으면 img src로 직접 시도 */
  avatarUrlPath?: string | null;
  style?: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  initialStyle?: React.CSSProperties;
};

/** 방 아바타: avatarUrl이 있으면 fetch 또는 직접 img src로 표시 */
export default function RoomAvatar({ roomId, name, initials, hasAvatar, avatarUrlPath, style, imgStyle, initialStyle }: Props) {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const blobUrlRef = useRef<string | null>(null);
  const token = useAuthStore((s) => s.token);
  const base = getBaseUrl();

  // 1) avatarUrlPath + base가 있으면 img src로 직접 시도 (인증 필요 시 fetch 사용)
  const directImgSrc = avatarUrlPath && base ? `${base.replace(/\/$/, '')}${avatarUrlPath}` : null;

  useEffect(() => {
    if (!hasAvatar) return;
    setError(false);
    let cancelled = false;
    const cacheBuster = avatarUrlPath?.includes('?v=') ? avatarUrlPath.split('?v=')[1]?.split('&')[0] : undefined;
    const fetchAvatar = (retry = 0) => {
      const doFetch = () => {
        if (window.electronAPI?.fetchRoomAvatar && base && token) {
          return window.electronAPI.fetchRoomAvatar(roomId, base, token, cacheBuster);
        }
        return roomsApi.fetchRoomAvatarBlob(roomId, cacheBuster).then((blob) => URL.createObjectURL(blob));
      };
      doFetch()
        .then((url) => {
          if (cancelled || !url) return;
          if (url.startsWith('data:')) {
            setImgSrc(url);
          } else {
            blobUrlRef.current = url;
            setImgSrc(url);
          }
        })
        .catch((err) => {
          if (cancelled) return;
          if (import.meta.env.DEV) console.warn('[RoomAvatar] fetch 실패 roomId=', roomId, err);
          if (retry < 1) setTimeout(() => fetchAvatar(retry + 1), 500);
          else setError(true);
        });
    };
    fetchAvatar();
    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [roomId, hasAvatar, token, base, avatarUrlPath]);

  // directImgSrc 사용 시 img로 바로 표시 (인증 쿠키/헤더가 포함된 요청은 fetch 필요)
  if (hasAvatar && directImgSrc && !imgSrc && !error) {
    return <img src={directImgSrc} alt="" style={imgStyle} onError={() => setError(true)} />;
  }
  if (hasAvatar && imgSrc && !error) {
    return <img src={imgSrc} alt="" style={imgStyle} />;
  }
  const displayText = (initials?.trim().slice(0, 2) || (name?.trim().slice(0, 2) || '?')).toUpperCase();
  return <span style={initialStyle}>{displayText}</span>;
}
