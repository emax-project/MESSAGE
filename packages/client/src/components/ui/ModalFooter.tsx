import { useThemeStore } from '../../store';
import { cn } from '../../utils/cn';

type Props = {
  children: React.ReactNode;
  justify?: 'flex-end' | 'space-between' | 'flex-start' | 'center';
  bordered?: boolean;
  marginTop?: number;
  paddingTop?: number;
  gap?: 8 | 12;
  className?: string;
};

export default function ModalFooter({
  children,
  justify = 'flex-end',
  bordered = false,
  marginTop = 8,
  paddingTop = 0,
  gap = 8,
  className,
}: Props) {
  const isDark = useThemeStore((s) => s.isDark);

  const justifyClass =
    justify === 'space-between'
      ? 'justify-between'
      : justify === 'flex-start'
        ? 'justify-start'
        : justify === 'center'
          ? 'justify-center'
          : 'justify-end';

  const mtClass =
    marginTop === 0 ? 'mt-0' : marginTop === 4 ? 'mt-1' : marginTop === 12 ? 'mt-3' : marginTop === 16 ? 'mt-4' : 'mt-2';
  const ptClass = paddingTop === 0 ? 'pt-0' : paddingTop === 8 ? 'pt-2' : paddingTop === 12 ? 'pt-3' : paddingTop === 16 ? 'pt-4' : '';
  const gapClass = gap === 12 ? 'gap-3' : 'gap-2';

  return (
    <div
      className={cn(
        'flex items-center',
        justifyClass,
        gapClass,
        mtClass,
        ptClass,
        bordered && (isDark ? 'border-t border-slate-700' : 'border-t border-slate-200'),
        className,
      )}
    >
      {children}
    </div>
  );
}
