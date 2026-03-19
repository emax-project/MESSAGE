import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { linkPreviewApi } from '../api';
import { cn } from '../utils/cn';

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
    staleTime: 1000 * 60 * 60,
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

  const openExternal = window.electronAPI?.openExternal;

  const cardClasses = cn(
    'mt-2 block max-w-[360px] overflow-hidden rounded-[10px] border text-inherit no-underline',
    isDark ? 'border-slate-600 bg-slate-800' : 'border-slate-200 bg-slate-50',
  );

  const handleClick = (e: React.MouseEvent, targetUrl: string) => {
    e.stopPropagation();
    if (openExternal) {
      e.preventDefault();
      openExternal(targetUrl);
    }
  };

  if (isError || !data) {
    return (
      <a
        href={displayUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClasses}
        onClick={(e) => handleClick(e, displayUrl)}
      >
        <div className="px-3 py-2.5">
          <div className={cn('text-sm font-medium', isDark ? 'text-slate-400' : 'text-slate-500')}>
            링크 미리보기를 불러올 수 없습니다
          </div>
          <div className={cn('text-[11px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
            {hostname}
          </div>
        </div>
      </a>
    );
  }

  const imageSrc = proxyImageUrl || data.imageUrl;
  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cardClasses}
      onClick={(e) => handleClick(e, data.url)}
    >
      {data.imageUrl && (
        <div className={cn('w-full max-h-[180px] overflow-hidden', isDark ? 'bg-slate-700' : 'bg-slate-200')}>
          <img
            src={imageSrc || undefined}
            alt=""
            className="block h-auto max-h-[180px] w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="px-3 py-2.5">
        {data.title && (
          <div
            className={cn(
              'mb-1 text-sm font-semibold leading-snug',
              'line-clamp-2',
              isDark ? 'text-slate-100' : 'text-slate-800',
            )}
          >
            {data.title}
          </div>
        )}
        {data.description && (
          <div
            className={cn(
              'mb-1 text-xs leading-relaxed',
              'line-clamp-2',
              isDark ? 'text-slate-400' : 'text-slate-500',
            )}
          >
            {data.description}
          </div>
        )}
        <div className={cn('text-[11px]', isDark ? 'text-slate-500' : 'text-slate-400')}>
          {hostname}
        </div>
      </div>
    </a>
  );
}
