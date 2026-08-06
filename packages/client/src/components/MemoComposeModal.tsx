import { memo, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, memosApi, type OrgUser } from '../api';
import { useAuthStore, useThemeStore, useToastStore } from '../store';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import UIModal from './ui/UIModal';
import ModalFooter from './ui/ModalFooter';
import { cn } from '../utils/cn';

type MemoComposeModalProps = {
  onClose: () => void;
  onSent?: () => void;
  initialRecipientIds?: string[];
};

function MemoComposeModal({ onClose, onSent, initialRecipientIds = [] }: MemoComposeModalProps) {
  const myId = useAuthStore((s) => s.user?.id);
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialRecipientIds));
  const [searchQuery, setSearchQuery] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: orgApi.tree,
  });

  const allUsers = useMemo(() => {
    const users: OrgUser[] = [];
    (Array.isArray(orgTree) ? orgTree : []).forEach((c) =>
      (c.departments ?? []).forEach((d) =>
        (d.users ?? []).forEach((u) => {
          if (String(u.id) !== String(myId)) users.push(u);
        }),
      ),
    );
    return users;
  }, [orgTree, myId]);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredUsers = searchLower
    ? allUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          (u.email && u.email.toLowerCase().includes(searchLower)),
      )
    : allUsers;

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSend = async () => {
    const trimmedSubject = subject.trim();
    const trimmedBody = body.trim();
    if (selected.size === 0) {
      showToast('받는 사람을 선택해 주세요.', 'error');
      return;
    }
    if (!trimmedSubject) {
      showToast('제목을 입력해 주세요.', 'error');
      return;
    }
    if (!trimmedBody) {
      showToast('내용을 입력해 주세요.', 'error');
      return;
    }
    setLoading(true);
    try {
      await memosApi.send({
        recipientIds: [...selected],
        subject: trimmedSubject,
        body: trimmedBody,
      });
      showToast('쪽지를 보냈습니다.', 'success');
      onSent?.();
      onClose();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : '';
      const hint = /not found|404|경로/i.test(msg)
        ? ' (로컬 API 서버 localhost:3001 실행 여부 확인)'
        : '';
      showToast(msg ? `쪽지 전송 실패: ${msg}${hint}` : '쪽지 전송에 실패했습니다. API 서버가 실행 중인지 확인해 주세요.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UIModal onClose={onClose} title="쪽지 쓰기" width={520} overlayPosition="absolute">
      <div className="flex flex-col gap-3">
        <div>
          <div className={cn('mb-1.5 text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-600')}>
            받는 사람 ({selected.size})
          </div>
          <UITextInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름 또는 이메일 검색"
          />
          <div
            className={cn(
              'mt-2 max-h-[140px] overflow-auto rounded-lg border p-2',
              isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-200 bg-slate-50',
            )}
          >
            {orgLoading ? (
              <div className={cn('py-4 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>로딩 중...</div>
            ) : filteredUsers.length === 0 ? (
              <div className={cn('py-4 text-center text-sm', isDark ? 'text-slate-400' : 'text-slate-500')}>선택할 수 있는 사용자가 없습니다</div>
            ) : (
              filteredUsers.map((u) => (
                <label
                  key={u.id}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer text-sm',
                    isDark ? 'hover:bg-slate-800' : 'hover:bg-white',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(u.id)}
                    onChange={() => toggleUser(u.id)}
                  />
                  <span className={cn('font-medium', isDark ? 'text-slate-200' : 'text-slate-800')}>{u.name}</span>
                  {u.email && (
                    <span className={cn('text-xs truncate', isDark ? 'text-slate-500' : 'text-slate-400')}>{u.email}</span>
                  )}
                </label>
              ))
            )}
          </div>
        </div>

        <div>
          <div className={cn('mb-1.5 text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-600')}>제목</div>
          <UITextInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="제목" />
        </div>

        <div>
          <div className={cn('mb-1.5 text-xs font-semibold', isDark ? 'text-slate-300' : 'text-slate-600')}>내용</div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="내용을 입력하세요"
            rows={8}
            className={cn(
              'w-full rounded-xl border px-3 py-2 text-sm outline-none resize-y min-h-[160px] font-inherit',
              isDark ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-slate-200 bg-white text-slate-800 placeholder:text-slate-400',
            )}
          />
        </div>
      </div>

      <ModalFooter>
        <UIButton variant="secondary" onClick={onClose} disabled={loading}>취소</UIButton>
        <UIButton onClick={() => void handleSend()} disabled={loading}>{loading ? '전송 중...' : '보내기'}</UIButton>
      </ModalFooter>
    </UIModal>
  );
}

export default memo(MemoComposeModal);
