import { useState, useMemo } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, TextInput, Alert, Modal,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { Event } from '@emax/shared';
import { eventsApi } from '../api';

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
  if (s.toDateString() === e.toDateString()) {
    return `${s.toLocaleDateString('ko-KR', dateOpts)} ${s.toLocaleTimeString('ko-KR', timeOpts)} ~ ${e.toLocaleTimeString('ko-KR', timeOpts)}`;
  }
  return `${s.toLocaleDateString('ko-KR', dateOpts)} ~ ${e.toLocaleDateString('ko-KR', dateOpts)}`;
}

function groupByMonth(events: Event[]): { title: string; data: Event[] }[] {
  const map = new Map<string, Event[]>();
  for (const ev of events) {
    const d = new Date(ev.startAt);
    const key = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map, ([title, data]) => ({ title, data }));
}

export default function ScheduleScreen() {
  const nav = useNavigation();
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const grouped = useMemo(() => groupByMonth(events), [events]);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const now = new Date();
    const endAt = new Date(now.getTime() + 60 * 60 * 1000);
    try {
      await eventsApi.create({ title: title.trim(), startAt: now.toISOString(), endAt: endAt.toISOString() });
      qc.invalidateQueries({ queryKey: ['events'] });
      setTitle('');
      setShowAdd(false);
    } catch (err) {
      Alert.alert('오류', err instanceof Error ? err.message : '일정 추가 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('일정 삭제', '이 일정을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제', style: 'destructive',
        onPress: () => eventsApi.remove(id).then(() => qc.invalidateQueries({ queryKey: ['events'] })),
      },
    ]);
  };

  const renderItem = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.item} onLongPress={() => handleDelete(item.id)} activeOpacity={0.7}>
      <View style={styles.itemDot} />
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>{item.title}</Text>
        <Text style={styles.itemTime}>{formatDateRange(item.startAt, item.endAt)}</Text>
        {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#4a5068" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>일정</Text>
        <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
          <Ionicons name="add" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(section) => section.title}
          renderItem={({ item: section }) => (
            <View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.data.map((ev) => (
                <View key={ev.id}>{renderItem({ item: ev })}</View>
              ))}
            </View>
          )}
          contentContainerStyle={grouped.length === 0 ? styles.emptyWrap : { paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>일정이 없습니다</Text>}
        />
      )}

      <Modal visible={showAdd} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>빠른 일정 추가</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="일정 제목"
              placeholderTextColor="#a0a5bc"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.modalHint}>현재 시각부터 1시간으로 생성됩니다</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setShowAdd(false); setTitle(''); }}>
                <Text style={styles.modalCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalSave, saving && { opacity: 0.5 }]} onPress={handleAdd} disabled={saving}>
                <Text style={styles.modalSaveText}>{saving ? '저장 중...' : '추가'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c6c6c8',
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000', textAlign: 'center' },
  addBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8e8e93', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8, backgroundColor: '#fff' },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16 },
  itemDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007aff', marginTop: 6, marginRight: 12 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  itemTime: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  itemDesc: { fontSize: 13, color: '#aeaeb2', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 17, fontWeight: '600', color: '#000', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#e5e5ea', borderRadius: 10, padding: 12, fontSize: 15, color: '#000', backgroundColor: '#f2f2f7', marginBottom: 8 },
  modalHint: { fontSize: 12, color: '#aeaeb2', marginBottom: 20 },
  modalBtns: { flexDirection: 'row', gap: 12 },
  modalCancel: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#f2f2f7', alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#8e8e93' },
  modalSave: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: '#007aff', alignItems: 'center' },
  modalSaveText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
