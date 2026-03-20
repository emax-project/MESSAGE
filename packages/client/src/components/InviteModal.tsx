import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orgApi, roomsApi, type OrgUser } from '../api';
import { useThemeStore, useToastStore } from '../store';
import UIButton from './ui/UIButton';
import UITextInput from './ui/UITextInput';
import UIModal from './ui/UIModal';
import ModalFooter from './ui/ModalFooter';
import UIChevron from './ui/UIChevron';
import { cn } from '../utils/cn';

type Props = {
  roomId: string;
  currentMemberIds: string[];
  onClose: () => void;
  onInvited: (newRoomId: string) => void;
};

export default function InviteModal({ roomId, currentMemberIds, onClose, onInvited }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hideJoined, setHideJoined] = useState(true);
  const [collapsedCompanies, setCollapsedCompanies] = useState<Set<string>>(new Set());
  const [collapsedDepartments, setCollapsedDepartments] = useState<Set<string>>(new Set());
  const isDark = useThemeStore((s) => s.isDark);
  const showToast = useToastStore((s) => s.show);

  const { data: orgTree = [], isLoading: orgLoading } = useQuery({
    queryKey: ['org', 'tree'],
    queryFn: orgApi.tree,
  });

  const memberSet = new Set(currentMemberIds);

  const allUsers: { id: string; name: string; email: string }[] = [];
  const safeOrgTree = Array.isArray(orgTree) ? orgTree : [];
  safeOrgTree.forEach((c) =>
    (c.departments ?? []).forEach((d) =>
      (d.users ?? []).forEach((u: OrgUser) => {
        if (!memberSet.has(u.id)) allUsers.push({ id: u.id, name: u.name, email: u.email ?? '' });
      })
    )
  );

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredUserIds = new Set<string>(
    searchLower
      ? allUsers
          .filter((u) => u.name.toLowerCase().includes(searchLower) || (u.email && u.email.toLowerCase().includes(searchLower)))
          .map((u) => u.id)
      : allUsers.map((u) => u.id)
  );
  const showAllUsers = !searchLower;

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleDepartment = (invitableUserIds: string[]) => {
    if (invitableUserIds.length === 0) return;
    const allSelected = invitableUserIds.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      invitableUserIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const toggleAll = () => {
    const filteredIds = Array.from(filteredUserIds);
    const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const toggleCompany = (companyId: string) => {
    setCollapsedCompanies((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const toggleDepartmentOpen = (key: string) => {
    setCollapsedDepartments((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleInvite = async () => {
    if (selected.size === 0) return;
    setLoading(true);
    try {
      const result = await roomsApi.addMembers(roomId, Array.from(selected));
      showToast(`${selected.size}명을 초대했습니다.`, 'success');
      onInvited(result.id);
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '초대 실패', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredIdList = Array.from(filteredUserIds);
  const allChecked = filteredIdList.length > 0 && filteredIdList.every((id) => selected.has(id));
  const selectedUsers = Array.from(selected)
    .map((id) => allUsers.find((u) => u.id === id))
    .filter(Boolean) as { id: string; name: string; email: string }[];

  const checkboxCls = 'w-4 h-4 m-0 cursor-pointer shrink-0';
  const avatarCls = cn('w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0', isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-200 text-slate-600');
  const chevronCls = cn('w-[18px] h-[18px] inline-flex items-center justify-center shrink-0', isDark ? 'text-slate-500' : 'text-slate-400');

  return (
    <UIModal title="멤버 초대" onClose={onClose} width={760}>
      {!orgLoading && allUsers.length > 0 && (
        <div className={cn('shrink-0 px-5 py-2.5 border-b', isDark ? 'border-slate-700' : 'border-slate-200')}>
          <div className="flex items-center gap-2.5">
            <UITextInput
              type="text"
              placeholder="이름 또는 이메일 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <label className={cn('flex items-center gap-1.5 text-xs whitespace-nowrap', isDark ? 'text-slate-400' : 'text-slate-500')}>
              <input
                type="checkbox"
                checked={hideJoined}
                onChange={(e) => setHideJoined(e.target.checked)}
                className={checkboxCls}
              />
              <span>참여중 숨기기</span>
            </label>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto px-5 py-3 min-h-0">
        {orgLoading ? (
          <div className="py-2 flex flex-col gap-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={cn('h-10 rounded-lg', isDark ? 'bg-slate-700/60' : 'bg-black/[0.06]')} />
            ))}
          </div>
        ) : allUsers.length === 0 ? (
          <p className={cn('text-sm m-0 py-4', isDark ? 'text-slate-400' : 'text-slate-500')}>초대할 수 있는 사용자가 없습니다.</p>
        ) : (
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3.5 min-h-[360px]">
            <div className={cn('min-w-0 border rounded-[10px] px-3 py-2.5', isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white')}>
              <label className={cn('flex items-center gap-2 py-2.5 border-b cursor-pointer mb-2', isDark ? 'border-slate-700' : 'border-slate-200')}>
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className={checkboxCls}
                />
                <span className={cn('font-semibold text-[15px]', isDark ? 'text-slate-200' : 'text-slate-800')}>전체 선택</span>
                <span className={cn('text-xs ml-auto', isDark ? 'text-slate-500' : 'text-slate-500')}>
                  {searchLower ? `${filteredIdList.length}명 (검색)` : `${allUsers.length}명`}
                </span>
              </label>

              {searchLower && filteredIdList.length === 0 ? (
                <p className={cn('text-sm m-0 py-4', isDark ? 'text-slate-400' : 'text-slate-500')}>검색 결과가 없습니다.</p>
              ) : (
                <div>
                  {safeOrgTree.map((company) => {
                    const visibleDepts = (company.departments ?? []).filter((dept) =>
                      (dept.users ?? []).some((u) => {
                        const isMember = memberSet.has(u.id);
                        if (hideJoined && isMember) return false;
                        if (showAllUsers) return true;
                        return !isMember && filteredUserIds.has(u.id);
                      })
                    );
                    if (visibleDepts.length === 0) return null;
                    const companyOpen = searchLower ? true : !collapsedCompanies.has(company.id);
                    return (
                      <div key={company.id} className="mb-3">
                        <button
                          type="button"
                          className="w-full flex items-center gap-1.5 border-none bg-transparent py-[7px] px-0 cursor-pointer text-left"
                          onClick={() => toggleCompany(company.id)}
                        >
                          <span className={chevronCls}><UIChevron open={companyOpen} /></span>
                          <span className={cn('text-[13px] font-bold', isDark ? 'text-slate-400' : 'text-slate-600')}>{company.name}</span>
                        </button>
                        {companyOpen && visibleDepts.map((dept) => {
                          const invitable = (dept.users ?? []).filter((u) =>
                            !memberSet.has(u.id) && (showAllUsers || filteredUserIds.has(u.id))
                          );
                          const deptAllChecked = invitable.length > 0 && invitable.every((u) => selected.has(u.id));
                          const deptSomeChecked = invitable.some((u) => selected.has(u.id));
                          const deptKey = `${company.id}:${dept.id}`;
                          const deptOpen = searchLower ? true : !collapsedDepartments.has(deptKey);
                          return (
                            <div key={dept.id} className="ml-2 mb-2">
                              <div className="flex items-center gap-2 py-[7px]">
                                <input
                                  type="checkbox"
                                  checked={deptAllChecked}
                                  ref={(el) => {
                                    if (el) el.indeterminate = !deptAllChecked && deptSomeChecked;
                                  }}
                                  onChange={() => toggleDepartment(invitable.map((u) => u.id))}
                                  className={checkboxCls}
                                />
                                <button
                                  type="button"
                                  className="border-none bg-transparent py-0.5 px-0 flex items-center gap-1.5 cursor-pointer min-w-0 flex-1 text-left"
                                  onClick={() => toggleDepartmentOpen(deptKey)}
                                >
                                  <span className={chevronCls}><UIChevron open={deptOpen} /></span>
                                  <span className={cn('font-semibold text-sm', isDark ? 'text-slate-300' : 'text-slate-600')}>{dept.name}</span>
                                </button>
                                <span className="flex items-center gap-1.5 ml-auto">
                                  <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>{invitable.length}명</span>
                                </span>
                              </div>
                              {deptOpen && <ul className="list-none m-0 p-0 ml-2">
                                {(dept.users ?? []).map((user) => {
                                  const isMember = memberSet.has(user.id);
                                  const visible = hideJoined
                                    ? !isMember && (showAllUsers || filteredUserIds.has(user.id))
                                    : showAllUsers || (!isMember && filteredUserIds.has(user.id));
                                  if (!visible) return null;
                                  if (isMember) {
                                    return (
                                      <li key={user.id} className="mb-0.5">
                                        <label className="flex items-center gap-2 px-1 py-1.5 rounded-md opacity-[0.55] cursor-default">
                                          <input type="checkbox" checked disabled className={checkboxCls} />
                                          <span className={avatarCls}>{user.name.trim()[0]?.toUpperCase() || '?'}</span>
                                          <span className={cn('text-sm', isDark ? 'text-slate-500' : 'text-slate-500')}>{user.name}</span>
                                          <span className={cn('text-[11px] px-1.5 py-0.5 rounded ml-auto', isDark ? 'text-slate-500 bg-slate-700' : 'text-slate-500 bg-slate-100')}>참여중</span>
                                        </label>
                                      </li>
                                    );
                                  }
                                  return (
                                    <li key={user.id} className="mb-0.5">
                                      <label className="flex items-center gap-2 px-1 py-1.5 rounded-md cursor-pointer">
                                        <input
                                          type="checkbox"
                                          checked={selected.has(user.id)}
                                          onChange={() => toggleUser(user.id)}
                                          className={checkboxCls}
                                        />
                                        <span className={avatarCls}>{user.name.trim()[0]?.toUpperCase() || '?'}</span>
                                        <span className={cn('text-sm', isDark ? 'text-slate-200' : 'text-slate-800')}>{user.name}</span>
                                      </label>
                                    </li>
                                  );
                                })}
                              </ul>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className={cn('min-w-0 border rounded-[10px] px-3 py-2.5 flex flex-col max-h-[460px]', isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-200 bg-white')}>
              <div className="flex items-center justify-between mb-2.5 gap-2">
                <h4 className={cn('m-0 text-[13px] font-bold', isDark ? 'text-slate-200' : 'text-slate-800')}>선택된 멤버</h4>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className={cn('border-none bg-transparent text-xs cursor-pointer p-0', isDark ? 'text-slate-400' : 'text-slate-500')}
                  disabled={selectedUsers.length === 0}
                >
                  전체 해제
                </button>
              </div>
              {selectedUsers.length === 0 ? (
                <p className={cn('m-0 text-xs pt-2', isDark ? 'text-slate-400' : 'text-slate-500')}>선택된 사용자가 없습니다.</p>
              ) : (
                <ul className="list-none m-0 p-0 flex flex-col gap-1.5 overflow-auto min-h-0">
                  {selectedUsers.map((u) => (
                    <li key={u.id} className={cn('flex items-center justify-between gap-2 px-1 py-1.5 rounded-lg', isDark ? 'bg-slate-800' : 'bg-slate-50')}>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className={avatarCls}>{u.name.trim()[0]?.toUpperCase() || '?'}</span>
                        <div className="flex flex-col min-w-0">
                          <span className={cn('text-[13px] truncate', isDark ? 'text-slate-200' : 'text-slate-800')}>{u.name}</span>
                          {u.email && <span className={cn('text-[11px] truncate', isDark ? 'text-slate-400' : 'text-slate-500')}>{u.email}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        className={cn('border-none bg-transparent text-base cursor-pointer px-1 py-0 shrink-0', isDark ? 'text-slate-400' : 'text-slate-500')}
                        onClick={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            next.delete(u.id);
                            return next;
                          })
                        }
                        aria-label={`${u.name} 선택 해제`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </div>
        )}
      </div>

      <ModalFooter justify="space-between" bordered paddingTop={12} marginTop={0} gap={12}>
        <span className={cn('text-[13px]', isDark ? 'text-slate-400' : 'text-slate-500')}>총 {selected.size}명 선택</span>
        <div className="flex gap-2">
          <UIButton variant="secondary" onClick={onClose}>
            취소
          </UIButton>
          <UIButton
            variant="primary"
            disabled={selected.size === 0 || loading}
            onClick={handleInvite}
          >
            {loading ? '초대 중...' : `${selected.size}명 초대`}
          </UIButton>
        </div>
      </ModalFooter>
    </UIModal>
  );
}
