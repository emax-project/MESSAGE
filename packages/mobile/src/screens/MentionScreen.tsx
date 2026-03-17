import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import type { MentionItem } from '@emax/shared';
import { mentionsApi } from '../api';

type MentionsStackParamList = {
  Mentions: undefined;
  Chat: { roomId: string; roomName: string };
  Kanban: { projectId: string; projectName: string };
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function MentionScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MentionsStackParamList>>();
  const qc = useQueryClient();
  const canGoBack = nav.canGoBack();

  const { data: mentions = [], isLoading } = useQuery({
    queryKey: ['mentions'],
    queryFn: mentionsApi.list,
  });

  const handlePress = (item: MentionItem) => {
    if (!item.readAt) {
      mentionsApi.markRead(item.id).then(() => qc.invalidateQueries({ queryKey: ['mentions'] }));
    }
    nav.navigate('Chat', { roomId: item.message.room.id, roomName: item.message.room.name });
  };

  const renderItem = ({ item }: { item: MentionItem }) => {
    const isUnread = !item.readAt;
    return (
      <TouchableOpacity style={styles.item} onPress={() => handlePress(item)} activeOpacity={0.7}>
        {isUnread && <View style={styles.dot} />}
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={styles.sender}>{item.message.sender.name}</Text>
            <Text style={styles.room}>{item.message.room.name}</Text>
          </View>
          <Text style={[styles.content, isUnread && styles.contentUnread]} numberOfLines={2}>
            {item.message.content}
          </Text>
          <Text style={styles.time}>{formatDate(item.message.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#4a5068" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.headerTitle}>내쪽지</Text>
        <View style={{ width: 36 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
      ) : (
        <FlatList
          data={mentions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={mentions.length === 0 ? styles.emptyWrap : undefined}
          ListEmptyComponent={<Text style={styles.emptyText}>받은 쪽지가 없습니다</Text>}
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
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007aff', marginTop: 6, marginRight: 8 },
  itemContent: { flex: 1 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sender: { fontSize: 14, fontWeight: '600', color: '#000' },
  room: { fontSize: 12, color: '#8e8e93', backgroundColor: '#f2f2f7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: 'hidden' },
  content: { fontSize: 14, color: '#8e8e93', lineHeight: 20 },
  contentUnread: { color: '#000', fontWeight: '500' },
  time: { fontSize: 12, color: '#aeaeb2', marginTop: 4 },
});
