import { useState } from 'react';
import { pollsApi, type Poll } from '../api';
import { useThemeStore } from '../store';

type Props = {
  poll: Poll;
  myId?: string;
  isMine?: boolean;
};

export default function PollCard({ poll, myId, isMine }: Props) {
  const isDark = useThemeStore((s) => s.isDark);
  const [voting, setVoting] = useState(false);
  const [localPoll, setLocalPoll] = useState(poll);
  const totalVotes = localPoll.options.reduce((sum, o) => sum + o.voteCount, 0);

  const handleVote = async (optionId: string) => {
    if (voting) return;
    setVoting(true);
    try {
      const updated = await pollsApi.vote(localPoll.id, optionId);
      setLocalPoll(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setVoting(false);
    }
  };

  const bgColor = isDark ? '#1e293b' : '#f8fafc';
  const borderColor = isDark ? '#475569' : '#e2e8f0';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const subColor = isDark ? '#94a3b8' : '#64748b';
  const barBg = isDark ? '#334155' : '#e2e8f0';
  const barFill = isMine ? '#94a3b8' : '#475569';

  return (
    <div style={{ background: bgColor, borderRadius: 12, padding: 14, border: `1px solid ${borderColor}`, minWidth: 220 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: textColor, marginBottom: 10 }}>
        {localPoll.question}
      </div>
      <div style={{ fontSize: 11, color: subColor, marginBottom: 8 }}>
        {localPoll.isMultiple ? '복수 선택 가능' : '단일 선택'} | {totalVotes}표
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {localPoll.options.map((opt) => {
          const myVoted = myId && opt.voterIds?.includes(myId);
          const pct = totalVotes > 0 ? Math.round((opt.voteCount / totalVotes) * 100) : 0;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={voting}
              onClick={() => handleVote(opt.id)}
              style={{
                position: 'relative',
                padding: '8px 10px',
                borderRadius: 8,
                border: myVoted ? `2px solid ${barFill}` : `1px solid ${borderColor}`,
                background: 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: `${pct}%`,
                  background: barBg,
                  borderRadius: 8,
                  transition: 'width 0.3s',
                }}
              />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: textColor, fontWeight: myVoted ? 700 : 400 }}>
                  {myVoted ? '\u2714 ' : ''}{opt.text}
                </span>
                <span style={{ fontSize: 11, color: subColor, marginLeft: 8 }}>
                  {opt.voteCount}표 ({pct}%)
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
