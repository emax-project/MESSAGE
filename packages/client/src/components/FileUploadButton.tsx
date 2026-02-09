import { useRef, useState } from 'react';
import { filesApi } from '../api';

type Props = {
  roomId: string;
  disabled?: boolean;
};

const MAX_SIZE = 20 * 1024 * 1024 * 1024; // 20GB

export default function FileUploadButton({ roomId, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    if (file.size > MAX_SIZE) {
      setError('파일 크기가 20GB를 초과합니다');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      await filesApi.upload(roomId, file, (pct) => setProgress(pct));
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div style={styles.wrapper}>
      <input
        ref={inputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        style={{
          ...styles.button,
          ...(uploading ? styles.buttonUploading : {}),
        }}
        title="파일 전송"
      >
        {uploading ? (
          <span style={styles.progressText}>{progress}%</span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
      {error && <span style={styles.error}>{error}</span>}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  button: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    border: 'none',
    background: '#f0f0f0',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  buttonUploading: {
    background: '#e0e0e0',
    cursor: 'wait',
  },
  progressText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#555',
  },
  error: {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    whiteSpace: 'nowrap',
    fontSize: 12,
    color: '#c62828',
    background: '#fff',
    padding: '4px 8px',
    borderRadius: 4,
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
};
