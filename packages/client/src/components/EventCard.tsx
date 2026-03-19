import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api';
import { useThemeStore } from '../store';
import { cn } from '../utils/cn';
import UIButton from './ui/UIButton';

type Props = {
  title: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  isMine?: boolean;
};

function toIso(d: string | Date): string {
  return typeof d === 'string' ? d : new Date(d).toISOString();
}

export default function EventCard({ title, startAt, endAt, description, isMine }: Props) {
  const start = new Date(startAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const end = new Date(endAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDark = useThemeStore((s) => s.isDark);
  const queryClient = useQueryClient();

  const handleAdd = async () => {
    if (adding || added) return;
    setAdding(true);
    setError(null);
    try {
      const list = await eventsApi.list();
      const norm = (v: string | Date) => new Date(v).toISOString();
      const exists = list.some(
        (ev) =>
          ev.title === title &&
          norm(ev.startAt) === norm(startAt) &&
          norm(ev.endAt) === norm(endAt)
      );
      if (exists) {
        setAdded(true);
        return;
      }
      await eventsApi.create({
        title,
        startAt: toIso(startAt),
        endAt: toIso(endAt),
        description: description ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      setAdded(true);
    } catch (err) {
      console.error('Failed to add event:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Duplicate') || msg.includes('409')) {
        setAdded(true);
      } else {
        setError('추가에 실패했습니다.');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className={cn(
        'box-border w-full rounded-lg border p-2.5',
        isMine
          ? 'border-white/25 bg-white/15'
          : isDark
            ? 'border-slate-400/20 bg-slate-400/10'
            : 'border-slate-500/20 bg-slate-500/[0.08]',
      )}
    >
      <strong className="mb-1 block text-sm font-semibold">{title}</strong>
      <div className="mb-1 text-xs opacity-90">
        {start} ~ {end}
      </div>
      {description && <div className="whitespace-pre-wrap break-words text-[13px]">{description}</div>}
      {!isMine && (
        <>
          <UIButton
            type="button"
            size="sm"
            variant="secondary"
            className="mt-2 !rounded-md !px-2.5 !py-1.5 !text-xs"
            onClick={handleAdd}
            disabled={adding || added}
          >
            {added ? '추가됨' : adding ? '추가 중...' : '내 일정에 추가'}
          </UIButton>
          {error && (
            <div className={cn('mt-1.5 text-xs', isDark ? 'text-red-400' : 'text-red-600')}>
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
