import { useState } from 'react';
import { eventsApi } from '../api';

type Props = {
  title: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  isMine?: boolean;
};

export default function EventCard({ title, startAt, endAt, description, isMine }: Props) {
  const start = new Date(startAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const end = new Date(endAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = async () => {
    if (adding || added) return;
    setAdding(true);
    try {
      const list = await eventsApi.list();
      const norm = (v: string) => new Date(v).toISOString();
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
        startAt,
        endAt,
        description: description ?? undefined,
      });
      setAdded(true);
    } catch (err) {
      console.error('Failed to add event:', err);
    } finally {
      setAdding(false);
    }
  };
  return (
    <div style={isMine ? styles.cardMine : styles.card}>
      <strong style={styles.title}>{title}</strong>
      <div style={styles.time}>
        {start} ~ {end}
      </div>
      {description && <div style={styles.desc}>{description}</div>}
      {!isMine && (
        <button
          type="button"
          style={styles.addBtn}
          onClick={handleAdd}
          disabled={adding || added}
        >
          {added ? '추가됨' : adding ? '추가 중...' : '내 일정에 추가'}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    padding: 10,
    borderRadius: 8,
    background: 'rgba(71, 85, 105, 0.08)',
    border: '1px solid rgba(71, 85, 105, 0.2)',
  },
  cardMine: {
    padding: 10,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.2)',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  title: { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 4 },
  time: { fontSize: 12, color: 'inherit', opacity: 0.9, marginBottom: 4 },
  desc: { fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' },
  addBtn: {
    marginTop: 8,
    padding: '6px 10px',
    border: '1px solid #e5e7eb',
    borderRadius: 6,
    background: '#fff',
    fontSize: 12,
    cursor: 'pointer',
  },
};
