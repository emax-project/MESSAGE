import { useThemeStore } from '../../store';
import { cn } from '../../utils/cn';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

export default function UITextInput({ error, className, disabled, ...rest }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  return (
    <input
      {...rest}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow,opacity]',
        error
          ? 'border-red-500'
          : isDark
            ? 'border-slate-600'
            : 'border-slate-200',
        isDark ? 'bg-slate-950 text-slate-200' : 'bg-slate-50 text-slate-800',
        disabled && 'opacity-80',
        className,
      )}
    />
  );
}
