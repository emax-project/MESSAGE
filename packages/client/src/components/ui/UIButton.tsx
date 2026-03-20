import { useThemeStore } from '../../store';
import { cn } from '../../utils/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-2 text-[13px] rounded-lg',
  md: 'px-4 py-2.5 text-sm rounded-[10px]',
};

export default function UIButton({
  variant = 'secondary',
  size = 'md',
  disabled,
  className,
  children,
  ...rest
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);

  const variantClasses = (() => {
    switch (variant) {
      case 'primary':
        return cn(
          'text-white shadow-md',
          disabled
            ? isDark ? 'bg-slate-700' : 'bg-slate-300'
            : 'bg-gradient-to-br from-[#7CA5FF] to-[#5B8DEF]',
          !disabled && (isDark ? 'shadow-[0_4px_14px_rgba(124,165,255,0.32)]' : 'shadow-[0_4px_12px_rgba(124,165,255,0.24)]'),
        );
      case 'secondary':
        return cn(
          'border',
          isDark ? 'bg-slate-700 text-slate-200 border-slate-600' : 'bg-slate-100 text-slate-800 border-slate-200',
        );
      case 'ghost':
        return cn(
          'bg-transparent',
          isDark ? 'text-slate-200' : 'text-slate-800',
        );
      case 'danger':
        return cn(
          'text-white',
          disabled
            ? isDark ? 'bg-red-500/25' : 'bg-red-500/15'
            : 'bg-red-500',
        );
    }
  })();

  return (
    <button
      {...rest}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 border-none font-semibold select-none transition-[background,border-color,opacity]',
        disabled ? 'cursor-not-allowed opacity-85' : 'cursor-pointer opacity-100',
        sizeClasses[size],
        variantClasses,
        className,
      )}
    >
      {children}
    </button>
  );
}
