import { memo, useMemo, useState } from 'react';
import type { MemoItem } from '../../../api';
import { cn } from '../../../utils/cn';

export type { MemoItem };

type MemoTab = 'inbox' | 'sent';

type MemoPanelProps = {
  isDark: boolean;
  inbox: MemoItem[];
  sent: MemoItem[];
  panelWrapStyle: (maxWidth: number) => { className: string; style: React.CSSProperties };
  onOpenCompose: () => void;
  onMarkRead: (memo: MemoItem) => void | Promise<void>;
  onDelete: (memo: MemoItem) => void | Promise<void>;
};

function formatRecipients(memo: MemoItem) {
  return memo.recipients.map((r) => r.user.name).join(', ');
}

function MemoDetail({
  memo,
  tab,
  isDark,
  onBack,
  onDelete,
}: {
  memo: MemoItem;
  tab: MemoTab;
  isDark: boolean;
  onBack: () => void;
  onDelete: (memo: MemoItem) => void | Promise<void>;
}) {
  const isInbox = tab === 'inbox';
  const fromLabel = isInbox ? memo.sender.name : formatRecipients(memo);
  const metaLabel = isInbox ? '보낸 사람' : '받는 사람';

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className={cn('shrink-0 flex items-center gap-2 px-4 py-3 border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
        <button
          type="button"
          onClick={onBack}
          className={cn(
            'border-none bg-transparent p-1 cursor-pointer rounded-md text-sm font-semibold',
            isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-100',
          )}
        >
          ← 목록
        </button>
        {isInbox && (
          <button
            type="button"
            onClick={() => void onDelete(memo)}
            className={cn(
              'ml-auto border-none bg-transparent px-2 py-1 cursor-pointer rounded-md text-xs font-semibold',
              isDark ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-red-50',
            )}
          >
            삭제
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto px-5 py-4">
        <h4 className={cn('m-0 mb-3 text-lg font-bold break-words', isDark ? 'text-white' : 'text-slate-900')}>
          {memo.subject}
        </h4>
        <div className={cn('mb-4 space-y-1 text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>
          <div><span className="font-semibold">{metaLabel}: </span>{fromLabel}</div>
          <div>{new Date(memo.createdAt).toLocaleString('ko-KR')}</div>
        </div>
        <div
          className={cn(
            'whitespace-pre-wrap break-words rounded-xl border px-4 py-3 text-sm leading-relaxed',
            isDark ? 'border-slate-700 bg-slate-900 text-slate-200' : 'border-slate-200 bg-white text-slate-800',
          )}
        >
          {memo.body}
        </div>
        {tab === 'sent' && (
          <div className={cn('mt-4 text-xs', isDark ? 'text-slate-500' : 'text-slate-400')}>
            {memo.recipients.map((r) => (
              <span key={r.id} className="mr-3">
                {r.user.name}{r.readAt ? ' (읽음)' : ' (안 읽음)'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MemoPanel({
  isDark,
  inbox,
  sent,
  panelWrapStyle,
  onOpenCompose,
  onMarkRead,
  onDelete,
}: MemoPanelProps) {
  const wrap = panelWrapStyle(820);
  const [tab, setTab] = useState<MemoTab>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = tab === 'inbox' ? inbox : sent;
  const selectedMemo = useMemo(
    () => list.find((m) => m.id === selectedId) ?? null,
    [list, selectedId],
  );

  const handleOpen = (memo: MemoItem) => {
    setSelectedId(memo.id);
    if (tab === 'inbox' && !memo.readAt) void onMarkRead(memo);
  };

  if (selectedMemo) {
    return (
      <div className={wrap.className} style={wrap.style}>
        <MemoDetail
          memo={selectedMemo}
          tab={tab}
          isDark={isDark}
          onBack={() => setSelectedId(null)}
          onDelete={async (memo) => {
            await onDelete(memo);
            setSelectedId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className={wrap.className} style={wrap.style}>
      <div className={cn('shrink-0 flex items-center justify-between px-5 py-3.5 border-b gap-2', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
        <h3 className={cn('m-0 text-base font-bold', isDark ? 'text-white' : 'text-slate-900')}>쪽지</h3>
        <button
          type="button"
          onClick={onOpenCompose}
          className={cn(
            'shrink-0 border-none rounded-lg px-3 py-1.5 text-[13px] font-semibold cursor-pointer',
            isDark ? 'bg-brand-dark text-white hover:bg-brand-light' : 'bg-brand-dark text-white hover:bg-brand-light',
          )}
        >
          쓰기
        </button>
      </div>

      <div className={cn('shrink-0 flex border-b', isDark ? 'border-[#3a3f46]' : 'border-[#dde1e6]')}>
        {(['inbox', 'sent'] as MemoTab[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => { setTab(key); setSelectedId(null); }}
            className={cn(
              'flex-1 py-2.5 text-sm font-semibold border-none cursor-pointer',
              tab === key
                ? (isDark ? 'text-brand-light border-b-2 border-brand-light bg-slate-800/50' : 'text-brand-dark border-b-2 border-brand-dark bg-brand-dark/5')
                : (isDark ? 'text-slate-400 bg-transparent' : 'text-slate-500 bg-transparent'),
            )}
          >
            {key === 'inbox' ? '받은쪽지' : '보낸쪽지'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {list.length === 0 ? (
          <div className={cn('p-8 text-center text-sm', isDark ? 'text-[#a7adb4]' : 'text-[#5e6470]')}>
            {tab === 'inbox' ? '받은 쪽지가 없습니다' : '보낸 쪽지가 없습니다'}
          </div>
        ) : (
          <ul className="list-none m-0 p-0">
            {list.map((memo) => {
              const unread = tab === 'inbox' && !memo.readAt;
              const subtitle = tab === 'inbox' ? memo.sender.name : formatRecipients(memo);
              return (
                <li key={memo.id} className={cn('border-b', isDark ? 'border-[#3a3f46]' : 'border-[#eef0f3]')}>
                  <button
                    type="button"
                    onClick={() => handleOpen(memo)}
                    className={cn(
                      'w-full px-5 py-3 border-none text-left cursor-pointer flex items-start gap-3',
                      unread
                        ? (isDark ? 'bg-[rgba(91,141,239,0.08)]' : 'bg-[rgba(91,141,239,0.04)]')
                        : 'bg-transparent',
                    )}
                  >
                    {unread && <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className={cn('text-sm font-semibold truncate mb-0.5', isDark ? 'text-slate-100' : 'text-slate-900')}>
                        {memo.subject}
                      </div>
                      <div className={cn('text-xs truncate mb-1', isDark ? 'text-slate-400' : 'text-slate-500')}>
                        {subtitle}
                      </div>
                      <div className={cn('text-[11px] truncate', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        {memo.body}
                      </div>
                      <div className={cn('text-[11px] mt-1', isDark ? 'text-slate-500' : 'text-slate-400')}>
                        {new Date(memo.createdAt).toLocaleString('ko-KR')}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default memo(MemoPanel);
