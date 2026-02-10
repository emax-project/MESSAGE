import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linkPreviewApi } from '../api';
import type { LinkPreviewData } from '../api';

const URL_REGEX = /https?:\/\/[^\s<>"']+/i;

export function extractFirstUrl(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const m = text.match(URL_REGEX);
  return m ? m[0] : null;
}

type Props = { url: string; isDark: boolean };

export default function LinkPreview({ url, isDark }: Props) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['link-preview', url],
    queryFn: () => linkPreviewApi.get(url),
    staleTime: 1000 * 60 * 60, // 1시간 캐시
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  const { data: imageBlob } = useQuery({
    queryKey: ['link-preview-image', data?.imageUrl ?? '', data?.url ?? ''],
    queryFn: () => (data?.imageUrl ? linkPreviewApi.fetchImageBlob(data.imageUrl, data.url) : Promise.reject(new Error('no url'))),
    enabled: !!data?.imageUrl,
    staleTime: 1000 * 60 * 60,
    retry: 2,
  });

  const [proxyImageUrl, setProxyImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!imageBlob) {
      setProxyImageUrl(null);
      return;
    }
    const objUrl = URL.createObjectURL(imageBlob);
    setProxyImageUrl(objUrl);
    return () => URL.revokeObjectURL(objUrl);
  }, [imageBlob]);

  const displayUrl = data?.url ?? url;
  let hostname = '';
  try {
    hostname = new URL(displayUrl).hostname;
  } catch {
    hostname = displayUrl;
  }

  if (isLoading) return null;

  // API 실패 또는 메타 없음 시에도 링크 카드만이라도 표시
  if (isError || !data) {
    const styles = getStyles(isDark);
    return (
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={styles.card}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.body}>
          <div style={{ ...styles.title, color: isDark ? '#94a3b8' : '#64748b', fontWeight: 500 }}>링크 미리보기를 불러올 수 없습니다</div>
          <div style={styles.url}>{hostname}</div>
        </div>
      </a>
    );
  }

  const imageSrc = proxyImageUrl || data.imageUrl;
  const styles = getStyles(isDark);
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      style={styles.card}
      onClick={(e) => e.stopPropagation()}
    >
      {data.imageUrl && (
        <div style={styles.imageWrap}>
          <img
            src={imageSrc}
            alt=""
            style={styles.image}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div style={styles.body}>
        {data.title && <div style={styles.title}>{data.title}</div>}
        {data.description && <div style={styles.description}>{data.description}</div>}
        <div style={styles.url}>{hostname}</div>
      </div>
    </a>
  );
}

function getStyles(isDark: boolean): Record<string, React.CSSProperties> {
  return {
    card: {
      display: 'block',
      marginTop: 8,
      maxWidth: 360,
      borderRadius: 10,
      overflow: 'hidden',
      border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
      background: isDark ? '#1e293b' : '#f8fafc',
      textDecoration: 'none',
      color: 'inherit',
    },
    imageWrap: {
      width: '100%',
      maxHeight: 180,
      overflow: 'hidden',
      background: isDark ? '#334155' : '#e2e8f0',
    },
    image: {
      width: '100%',
      height: 'auto',
      maxHeight: 180,
      objectFit: 'cover',
      display: 'block',
    },
    body: { padding: '10px 12px' },
    title: {
      fontSize: 14,
      fontWeight: 600,
      color: isDark ? '#f1f5f9' : '#1e293b',
      marginBottom: 4,
      lineHeight: 1.3,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
    },
    description: {
      fontSize: 12,
      color: isDark ? '#94a3b8' : '#64748b',
      lineHeight: 1.4,
      display: '-webkit-box',
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden',
      marginBottom: 4,
    },
    url: {
      fontSize: 11,
      color: isDark ? '#64748b' : '#94a3b8',
    },
  };
}
