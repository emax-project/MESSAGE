import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventsApi } from '../api';
import { useThemeStore } from '../store';

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
  const st = getEventStyles(isDark, !!isMine);

  return (
    <div style={st.card}>
      <strong style={st.title}>{title}</strong>
      <div style={st.time}>
        {start} ~ {end}
      </div>
      {description && <div style={st.desc}>{description}</div>}
      {!isMine && (
        <>
          <button
            type="button"
            style={st.addBtn}
            onClick={handleAdd}
            disabled={adding || added}
          >
            {added ? '추가됨' : adding ? '추가 중...' : '내 일정에 추가'}
          </button>
          {error && <div style={st.error}>{error}</div>}
        </>
      )}
    </div>
  );
}

function getEventStyles(isDark: boolean, isMine: boolean): Record<string, React.CSSProperties> {
  return {
    card: isMine
      ? { padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }
      : { padding: 10, borderRadius: 8, background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(71,85,105,0.08)', border: `1px solid ${isDark ? 'rgba(148,163,184,0.2)' : 'rgba(71,85,105,0.2)'}` },
    title: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 },
    time: { fontSize: 12, color: 'inherit', opacity: 0.9, marginBottom: 4 },
    desc: { fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
    addBtn: {
      marginTop: 8,
      padding: '6px 10px',
      border: `1px solid ${isDark ? '#475569' : '#e5e7eb'}`,
      borderRadius: 6,
      background: isDark ? '#334155' : '#fff',
      color: isDark ? '#e2e8f0' : 'inherit',
      fontSize: 12,
      cursor: 'pointer',
    },
    error: { marginTop: 6, fontSize: 12, color: isDark ? '#f87171' : '#dc2626' },
  };
}
