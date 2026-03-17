import { useState, useMemo, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, FlatList,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from '@emax/shared';
import { usersApi, roomsApi } from '../api';
import { useAuthStore } from '../store';
import Avatar from './Avatar';

type Props = {
  mode: 'topic' | 'chat';
  visible: boolean;
  onClose: () => void;
  onCreated: (roomId: string, roomName: string, isTopic?: boolean, viewMode?: 'chat' | 'board') => void;
};

export default function CreateRoomModal({ mode, visible, onClose, onCreated }: Props) {
  const myId = useAuthStore((s) => s.user?.id);
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'form' | 'members'>(mode === 'topic' ? 'form' : 'members');
  const [topicName, setTopicName] = useState('');
  const [topicDesc, setTopicDesc] = useState('');
  const [viewMode, setViewMode] = useState<'chat' | 'board'>('chat');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: usersApi.list,
    enabled: visible,
  });

  useEffect(() => {
    if (visible) {
      setStep(mode === 'topic' ? 'form' : 'members');
      setTopicName('');
      setTopicDesc('');
      setSelected(new Set());
      setSearch('');
      setError(null);
    }
  }, [visible, mode]);

  const filteredUsers = useMemo(() => {
    const list = (users as User[]).filter((u) => u.id !== myId);
    const q = search.trim().toLowerCase();
    return q ? list.filter((u) => (u.name ?? '').toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q)) : list;
  }, [users, myId, search]);

  const toggleUser = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleCreate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'topic') {
        if (!topicName.trim()) {
          setError('아젠다 이름을 입력해주세요');
          setLoading(false);
          return;
        }
        const room = await roomsApi.createTopic({
          name: topicName.trim(),
          description: topicDesc.trim() || undefined,
          isPublic: false,
          viewMode,
          memberIds: Array.from(selected),
        });
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
        onCreated(room.id, room.name ?? topicName.trim(), true, (room as { viewMode?: string })?.viewMode as 'chat' | 'board' ?? viewMode);
      } else {
        const ids = Array.from(selected);
        if (ids.length === 0) {
          setError('대화할 사람을 선택해주세요');
          setLoading(false);
          return;
        }
        if (ids.length === 1) {
          const room = await roomsApi.create(ids[0]);
          const other = (room as { members?: { user: User }[] })?.members?.find((m) => m.user.id !== myId);
          const roomName = other?.user?.name ?? (users as User[]).find((u) => u.id === ids[0])?.name ?? '채팅';
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
          onCreated(room.id, roomName);
        } else {
          const firstRoom = await roomsApi.create(ids[0]);
          const groupRoom = await roomsApi.addMembers(firstRoom.id, ids.slice(1));
          const roomName = groupRoom?.name ?? `${ids.length}명 그룹`;
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
          onCreated(groupRoom!.id, roomName ?? '그룹 채팅');
        }
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '만들기 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setTopicName('');
    setTopicDesc('');
    setSelected(new Set());
    setSearch('');
    setError(null);
    setStep(mode === 'topic' ? 'form' : 'members');
    onClose();
  };

  const isTopic = mode === 'topic';
  const title = isTopic ? '새 아젠다 생성' : '새 채팅';
  const canCreate = isTopic
    ? (step === 'form' ? topicName.trim().length > 0 : true)
    : selected.size > 0;

  const handleFormNext = () => {
    if (!topicName.trim()) return;
    setStep('members');
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modal}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          {isTopic && step === 'form' && (
            <View style={styles.formBody}>
              <Text style={styles.label}>이름 *</Text>
              <TextInput
                style={styles.input}
                placeholder="아젠다 이름을 입력하세요"
                value={topicName}
                onChangeText={(t) => setTopicName(t.slice(0, 60))}
                maxLength={60}
                autoCapitalize="none"
              />
              <Text style={styles.label}>설명 (선택)</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="아젠다에 대한 설명"
                value={topicDesc}
                onChangeText={(t) => setTopicDesc(t.slice(0, 300))}
                maxLength={300}
                multiline
              />
              <Text style={styles.label}>보기 방식</Text>
              <View style={styles.viewModeRow}>
                <TouchableOpacity
                  style={[styles.viewModeBtn, viewMode === 'chat' && styles.viewModeBtnActive]}
                  onPress={() => setViewMode('chat')}
                >
                  <Ionicons name="chatbubbles-outline" size={20} color={viewMode === 'chat' ? '#fff' : '#666'} />
                  <Text style={[styles.viewModeText, viewMode === 'chat' && styles.viewModeTextActive]}>챗뷰</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.viewModeBtn, viewMode === 'board' && styles.viewModeBtnActive]}
                  onPress={() => setViewMode('board')}
                >
                  <Ionicons name="grid-outline" size={20} color={viewMode === 'board' ? '#fff' : '#666'} />
                  <Text style={[styles.viewModeText, viewMode === 'board' && styles.viewModeTextActive]}>보드뷰</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(step === 'members' || !isTopic) && (
            <>
              <View style={styles.searchWrap}>
                <Ionicons name="search" size={16} color="#8e8e93" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="이름으로 검색"
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#8e8e93"
                />
              </View>
              <View style={styles.memberList}>
                {usersLoading ? (
                  <ActivityIndicator color="#007aff" style={{ marginTop: 24 }} />
                ) : filteredUsers.length === 0 ? (
                  <Text style={styles.emptyText}>초대할 수 있는 사용자가 없습니다</Text>
                ) : (
                  <FlatList
                    data={filteredUsers}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                      const u = item as User & { avatarUrl?: string };
                      const isSel = selected.has(u.id);
                      return (
                        <TouchableOpacity
                          style={[styles.userRow, isSel && styles.userRowSelected]}
                          onPress={() => toggleUser(u.id)}
                          activeOpacity={0.7}
                        >
                          <Avatar
                            uri={u.avatarUrl || (u.id ? `/users/${u.id}/avatar` : null)}
                            name={u.name}
                            size={40}
                            borderRadius={12}
                          />
                          <View style={styles.userInfo}>
                            <Text style={styles.userName}>{u.name ?? '알 수 없음'}</Text>
                            {u.email && <Text style={styles.userEmail}>{u.email}</Text>}
                          </View>
                          {isSel && <Ionicons name="checkmark-circle" size={24} color="#007aff" />}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}
              </View>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            {isTopic && step === 'members' && (
              <TouchableOpacity style={styles.backBtn} onPress={() => setStep('form')}>
                <Text style={styles.backBtnText}>이전</Text>
              </TouchableOpacity>
            )}
            <View style={styles.footerRight}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleClose}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
              {isTopic && step === 'form' ? (
                <TouchableOpacity
                  style={[styles.createBtn, !topicName.trim() && styles.createBtnDisabled]}
                  onPress={handleFormNext}
                  disabled={!topicName.trim()}
                >
                  <Text style={styles.createBtnText}>다음</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.createBtn, (!canCreate || loading) && styles.createBtnDisabled]}
                  onPress={handleCreate}
                  disabled={!canCreate || loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.createBtnText}>
                      {isTopic ? '아젠다 만들기' : selected.size <= 1 ? '1:1 채팅 만들기' : '그룹 채팅 만들기'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  title: { fontSize: 17, fontWeight: '600', color: '#000' },
  closeBtn: { padding: 4 },

  formBody: {
    padding: 16,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#000',
    marginBottom: 14,
  },
  textarea: { minHeight: 70 },

  viewModeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  viewModeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  viewModeBtnActive: { backgroundColor: '#007aff', borderColor: '#007aff' },
  viewModeText: { fontSize: 14, fontWeight: '500', color: '#666' },
  viewModeTextActive: { color: '#fff' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#f2f2f7',
    borderRadius: 10,
  },
  searchIcon: { marginLeft: 12 },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 10, fontSize: 15, color: '#000' },

  memberList: { maxHeight: 280, paddingHorizontal: 16 },
  emptyText: { fontSize: 14, color: '#8e8e93', textAlign: 'center', marginTop: 24 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e5ea',
  },
  userRowSelected: { backgroundColor: 'rgba(0,122,255,0.06)' },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '500', color: '#000' },
  userEmail: { fontSize: 12, color: '#8e8e93', marginTop: 2 },

  error: { color: '#ff3b30', fontSize: 13, paddingHorizontal: 16, paddingBottom: 8 },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e5e5ea',
  },
  backBtn: { padding: 8 },
  backBtnText: { fontSize: 15, color: '#007aff', fontWeight: '500' },
  footerRight: { flexDirection: 'row', gap: 10 },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5ea',
  },
  cancelBtnText: { fontSize: 15, color: '#666' },
  createBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#007aff',
    minWidth: 120,
    alignItems: 'center',
  },
  createBtnDisabled: { backgroundColor: '#cbd5e1', opacity: 0.8 },
  createBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
