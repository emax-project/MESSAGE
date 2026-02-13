import { useRef } from 'react';
import { useThemeStore } from '../store';

const MAX_SIZE = 20 * 1024 * 1024 * 1024; // 20GB

type Props = {
  disabled?: boolean;
  onFileSelected: (files: File[]) => void;
};

export default function FileUploadButton({ disabled, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const isDark = useThemeStore((s) => s.isDark);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    const valid = files.filter((f) => f.size <= MAX_SIZE);
    if (valid.length > 0) onFileSelected(valid);
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
        disabled={disabled}
        style={st.button}
        title="파일 첨부"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#94a3b8' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
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
  };
}
