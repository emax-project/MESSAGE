import { useRef, useState } from 'react';
import { filesApi } from '../api';
import { useThemeStore } from '../store';

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
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [uploadCount, setUploadCount] = useState<{ current: number; total: number } | null>(null);
  const isDark = useThemeStore((s) => s.isDark);

  const handleClick = () => {
    if (!uploading) inputRef.current?.click();
  };

  const uploadOne = async (file: File, fileIndex: number, total: number, onProgress: (pct: number) => void) => {
    if (file.size > MAX_SIZE) {
      setError('파일 크기가 20GB를 초과합니다');
      setTimeout(() => setError(null), 3000);
      throw new Error('파일 크기가 20GB를 초과합니다');
    }
    const base = (fileIndex / total) * 100;
    const range = 100 / total;
    await filesApi.upload(roomId, file, (pct) => onProgress(base + (pct / 100) * range));
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setLastFile(file);
    setUploadCount({ current: 1, total: 1 });

    try {
      await uploadOne(file, 0, 1, setProgress);
      setLastFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadCount(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    if (files.length === 1) {
      await uploadFile(files[0]);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setLastFile(null);
    setUploadCount({ current: 0, total: files.length });

    let failed: File | null = null;
    let errMsg: string | null = null;
    try {
      for (let i = 0; i < files.length; i++) {
        setUploadCount({ current: i + 1, total: files.length });
        try {
          await uploadOne(files[i], i, files.length, setProgress);
        } catch (err) {
          if (!failed) {
            failed = files[i];
            errMsg = err instanceof Error ? err.message : '업로드 실패';
          }
        }
      }
      if (failed) {
        setLastFile(failed);
        setError(errMsg ?? '일부 파일 업로드에 실패했습니다.');
      }
    } finally {
      setUploading(false);
      setProgress(0);
      setUploadCount(null);
    }
  };

  const st = getUploadStyles(isDark);

  return (
    <div style={st.wrapper}>
      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || uploading}
        style={{
          ...st.button,
          ...(uploading ? st.buttonUploading : {}),
        }}
        title="파일 전송"
      >
        {uploading ? (
          <span style={st.progressText}>
            {uploadCount && uploadCount.total > 1
              ? `${uploadCount.current}/${uploadCount.total} ${Math.round(progress)}%`
              : `${Math.round(progress)}%`}
          </span>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
          </svg>
        )}
      </button>
      {error && <span style={st.error}>{error}</span>}
      {error && lastFile && (
        <button
          type="button"
          onClick={() => uploadFile(lastFile)}
          style={st.retry}
        >
          재시도
        </button>
      )}
    </div>
  );
}

function getUploadStyles(isDark: boolean): Record<string, React.CSSProperties> {
  return {
    wrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
    button: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      border: 'none',
      background: isDark ? '#334155' : '#f1f5f9',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    buttonUploading: {
      background: isDark ? '#475569' : '#e2e8f0',
      cursor: 'wait',
    },
    progressText: {
      fontSize: 11,
      fontWeight: 700,
      color: isDark ? '#e2e8f0' : '#555',
    },
    error: {
      position: 'absolute',
      bottom: '110%',
      left: '50%',
      transform: 'translateX(-50%)',
      whiteSpace: 'nowrap',
      fontSize: 12,
      color: '#ef4444',
      background: isDark ? '#1e293b' : '#fff',
      padding: '4px 8px',
      borderRadius: 4,
      boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
    },
    retry: {
      marginLeft: 8,
      padding: '6px 10px',
      border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
      borderRadius: 8,
      background: isDark ? '#334155' : '#fff',
      color: isDark ? '#e2e8f0' : 'inherit',
      fontSize: 12,
      cursor: 'pointer',
    },
  };
}
