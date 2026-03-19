import { useRef } from 'react';
import { useThemeStore } from '../store';
import { cn } from '../utils/cn';

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

  return (
    <div className="relative flex items-center">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none',
          isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-600',
        )}
        title="파일 첨부"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
    </div>
  );
}
