import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersApi, type User } from '../api';
import { useThemeStore } from '../store';
import { cn } from '../utils/cn';

type Props = { onSelect: (userId: string) => void; compact?: boolean };

export default function UserPicker({ onSelect, compact }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isDark = useThemeStore((s) => s.isDark);
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative',
        !compact && cn('px-4 py-3 border-b', isDark ? 'border-slate-700' : 'border-slate-200'),
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          compact
            ? 'w-[30px] h-[30px] p-0 border-none rounded-full bg-white/20 text-white cursor-pointer text-base font-semibold leading-none flex items-center justify-center'
            : 'w-full px-3.5 py-2.5 border-none rounded-[10px] bg-[#5B8DEF] cursor-pointer text-sm font-semibold text-white',
        )}
        aria-label="새 채팅"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {compact ? '+' : '+ 새 채팅'}
      </button>
      {open && (
        <div
          className={cn(
            'absolute top-full mt-1.5 rounded-xl max-h-[280px] overflow-auto border z-[10000]',
            isDark ? 'bg-slate-800 border-slate-700 shadow-[0_4px_20px_rgba(0,0,0,0.3)]' : 'bg-white border-slate-200 shadow-[0_4px_16px_rgba(0,0,0,0.1)]',
            compact ? 'left-auto right-0 min-w-[260px]' : 'left-3 right-3',
          )}
          role="listbox"
        >
          {users.length === 0 ? (
            <p className={cn('p-4 m-0 text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
              다른 사용자가 없습니다. 회원가입한 사용자와 새 채팅을 만들 수 있습니다.
            </p>
          ) : (
            users.map((u: User) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelect(u.id);
                  setOpen(false);
                }}
                className={cn(
                  'flex items-center w-full px-4 py-3 border-0 border-b bg-transparent text-left cursor-pointer gap-3',
                  isDark ? 'border-slate-700' : 'border-slate-100',
                )}
              >
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                    isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600',
                  )}
                >
                  {u.name.trim()[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <span className={cn('block font-semibold text-sm', isDark ? 'text-slate-200' : 'text-slate-800')}>
                    {u.name}
                  </span>
                  <span className={cn('block text-xs mt-0.5', isDark ? 'text-slate-500' : 'text-slate-500')}>
                    {u.email}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
