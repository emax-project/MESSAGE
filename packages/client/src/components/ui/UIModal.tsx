import { useThemeStore } from '../../store';
import { cn } from '../../utils/cn';
import UICloseButton from './UICloseButton';

type Props = {
  children: React.ReactNode;
  onClose: () => void;
  width?: number;
  title?: string;
  overlayPosition?: 'fixed' | 'absolute';
  zIndex?: number;
};

export default function UIModal({
  children,
  onClose,
  width = 420,
  title,
  overlayPosition = 'fixed',
  zIndex = 10001,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);

  return (
    <div
      className={cn(
        'inset-0 flex items-center justify-center bg-black/50',
        overlayPosition === 'fixed' ? 'fixed' : 'absolute',
      )}
      style={{ zIndex }}
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[80vh] max-w-[95vw] flex-col rounded-xl border',
          isDark
            ? 'border-slate-700 bg-slate-800 shadow-[0_8px_32px_rgba(0,0,0,0.4)]'
            : 'border-slate-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.15)]',
        )}
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div
            className={cn(
              'flex shrink-0 items-center justify-between border-b px-5 py-4',
              isDark ? 'border-slate-700' : 'border-slate-200',
            )}
          >
            <h3
              className={cn(
                'm-0 text-lg font-semibold',
                isDark ? 'text-slate-100' : 'text-slate-800',
              )}
            >
              {title}
            </h3>
            <UICloseButton onClick={onClose} />
          </div>
        )}
        <div className="min-h-0 overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}
