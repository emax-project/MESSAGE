import { useEffect, useState } from 'react';
import { type Message, filesApi } from '../api';
import { useThemeStore } from '../store';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

function ImageLightbox({ src, alt, onDownload, onClose }: {
  src: string;
  alt: string;
  onDownload: () => void;
  onClose: () => void;
}) {
  return (
    <div style={lightboxStyles.overlay} onClick={onClose}>
      <div style={lightboxStyles.content} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          style={lightboxStyles.closeBtn}
          onClick={onClose}
          aria-label="닫기"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <img src={src} alt={alt} style={lightboxStyles.image} />
        <div style={lightboxStyles.bottomBar}>
          <span style={lightboxStyles.fileName}>{alt}</span>
          <button type="button" onClick={onDownload} style={lightboxStyles.downloadBtn}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>다운로드</span>
          </button>
        </div>
      </div>
    </div>
  );
}

const lightboxStyles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 99999,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    maxWidth: '95vw',
    maxHeight: '95vh',
  },
  closeBtn: {
    position: 'absolute',
    top: -40,
    right: -4,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    opacity: 0.8,
    zIndex: 1,
  },
  image: {
    maxWidth: '90vw',
    maxHeight: 'calc(90vh - 60px)',
    objectFit: 'contain',
    borderRadius: 4,
    userSelect: 'none',
  },
  bottomBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
  },
  fileName: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    maxWidth: 300,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  downloadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: 8,
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
};

type Props = {
  message: Message;
};

export default function FileMessage({ message }: Props) {
  const { fileName, fileSize, fileMimeType, fileUrl, fileExpiresAt, id } = message;
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const isDark = useThemeStore((s) => s.isDark);

  if (!fileUrl) {
    return <span style={{ fontSize: 13, color: isDark ? '#64748b' : '#999', fontStyle: 'italic' }}>파일이 만료되었습니다</span>;
  }

  const expiresAt = fileExpiresAt ? new Date(fileExpiresAt) : null;
  const isExpiringSoon =
    expiresAt && expiresAt.getTime() - Date.now() < 24 * 60 * 60 * 1000;

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (isImageMime(fileMimeType)) {
      filesApi.fetchBlob(id).then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setPreviewUrl(objectUrl);
      }).catch(() => {
        if (active) setPreviewError(true);
      });
    }
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [id, fileMimeType]);

  const handleDownload = async () => {
    try {
      await filesApi.download(id, fileName);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  const st = getFileStyles(isDark);

  return (
    <div style={st.container}>
      {isImageMime(fileMimeType) ? (
        <>
          {previewUrl && !previewError ? (
            <img
              src={previewUrl}
              alt={fileName || 'image'}
              style={st.imagePreview}
              loading="lazy"
              onClick={() => setLightboxOpen(true)}
            />
          ) : previewError ? (
            <span style={st.fileLink}>미리보기를 불러올 수 없습니다</span>
          ) : (
            <span style={st.fileLink}>미리보기 로딩 중...</span>
          )}
          {lightboxOpen && (
            <ImageLightbox
              src={previewUrl || ''}
              alt={fileName || 'image'}
              onDownload={handleDownload}
              onClose={() => setLightboxOpen(false)}
            />
          )}
        </>
      ) : (
        <button type="button" onClick={handleDownload} style={st.fileLink}>
          <div style={st.fileIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#666'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
            </svg>
          </div>
          <div style={st.fileInfo}>
            <span style={st.fileName}>{fileName || 'file'}</span>
            {fileSize != null && (
              <span style={st.fileSize}>{formatFileSize(fileSize)}</span>
            )}
          </div>
          <div style={st.downloadIcon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#64748b' : '#888'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </div>
        </button>
      )}
      {isExpiringSoon && (
        <span style={st.expiryWarning}>곧 만료됩니다</span>
      )}
    </div>
  );
}

function getFileStyles(isDark: boolean): Record<string, React.CSSProperties> {
  return {
    container: { marginTop: 4 },
    imagePreview: {
      maxWidth: 420,
      maxHeight: 320,
      borderRadius: 8,
      cursor: 'pointer',
      display: 'block',
      width: '100%',
      objectFit: 'contain',
    },
    fileLink: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: '10px 14px',
      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      borderRadius: 10,
      color: 'inherit',
      border: 'none',
      cursor: 'pointer',
      width: '100%',
      minWidth: 220,
      textAlign: 'left',
    },
    fileIcon: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileInfo: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
      minWidth: 0,
      overflow: 'hidden',
    },
    fileName: {
      fontSize: 13,
      fontWeight: 500,
      color: isDark ? '#e2e8f0' : '#1e293b',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
      flex: 1,
    },
    fileSize: { fontSize: 11, color: isDark ? '#64748b' : '#888', flexShrink: 0 },
    downloadIcon: {
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    expiryWarning: {
      fontSize: 11,
      color: '#e65100',
      marginTop: 4,
      display: 'block',
    },
  };
}
