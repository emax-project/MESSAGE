import { useThemeStore } from '../../store';
import { cn } from '../../utils/cn';

type Props = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'> & {
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'inverse';
  variant?: 'ghost' | 'subtle';
};

const sizeMap = {
  sm: { box: 'h-[22px] w-[22px] min-h-[22px] min-w-[22px]', icon: 10 },
  md: { box: 'h-7 w-7 min-h-7 min-w-7', icon: 12 },
  lg: { box: 'h-8 w-8 min-h-8 min-w-8', icon: 14 },
} as const;

export default function UICloseButton({
  size = 'md',
  tone = 'default',
  variant = 'ghost',
  className,
  ...rest
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const { box, icon } = sizeMap[size];

  return (
    <button
      type="button"
      aria-label="닫기"
      {...rest}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-none p-0 leading-none',
        box,
        variant === 'subtle'
          ? isDark ? 'bg-slate-400/15' : 'bg-slate-500/10'
          : 'bg-transparent',
        tone === 'inverse'
          ? 'text-white'
          : isDark ? 'text-slate-400' : 'text-slate-500',
        className,
      )}
    >
      <svg width={icon} height={icon} viewBox="0 0 12 12" fill="none" aria-hidden className="block">
        <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
