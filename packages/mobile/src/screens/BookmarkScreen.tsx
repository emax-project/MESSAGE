import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { Bookmark } from '@emax/shared';
import { bookmarksApi } from '../api';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function BookmarkScreen() {
  const nav = useNavigation();
  const qc = useQueryClient();

  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: bookmarksApi.list,
  });

  const handleRemove = (messageId: string) => {
    Alert.alert('북마크 삭제', '이 북마크를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: () => {
          bookmarksApi.remove(messageId).then(() => qc.invalidateQueries({ queryKey: ['bookmarks'] }));
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Bookmark }) => (
    <TouchableOpacity style={styles.item} onLongPress={() => handleRemove(item.messageId)} activeOpacity={0.7}>
      <View style={styles.itemHeader}>
        <Text style={styles.sender}>{item.message.sender.name}</Text>
        <Text style={styles.room}>{item.message.room.name}</Text>
      </View>
      <Text style={styles.content} numberOfLines={3}>{item.message.content}</Text>
      {item.message.fileName && (
        <View style={styles.fileRow}>
          <Ionicons name="attach" size={14} color="#6366f1" />
          <Text style={styles.file}>{item.message.fileName}</Text>
        </View>
      )}
      <Text style={styles.time}>{formatDate(item.message.createdAt)}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#4a5068" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>북마크</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
      ) : (
        <FlatList
          data={bookmarks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={bookmarks.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={<Text style={styles.emptyText}>북마크가 없습니다</Text>}
        />
      )}
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 14 },
  item: { paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sender: { fontSize: 14, fontWeight: '600', color: '#000' },
  room: { fontSize: 12, color: '#8e8e93', backgroundColor: '#f2f2f7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  content: { fontSize: 14, color: '#000', lineHeight: 20 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  file: { fontSize: 13, color: '#007aff' },
  time: { fontSize: 12, color: '#aeaeb2', marginTop: 4 },
});
