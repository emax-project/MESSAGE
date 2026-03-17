import { useState, useMemo, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuthStore } from '../store';
import Avatar from '../components/Avatar';
import type { User } from '@emax/shared';

type RootStackParamList = {
  Chat: { roomId: string; roomName: string };
  UserDetail: { userId: string; userName: string; deptName?: string; initialPhone?: string | null; initialJobTitle?: string | null };
};

export default function MemberScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const myId = useAuthStore((s) => s.user?.id);
  const [search, setSearch] = useState('');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members', myId],
    queryFn: () => api.get('/users') as Promise<User[]>,
    enabled: !!myId,
  });

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  }, [members, q]);

  const handlePress = useCallback((user: User) => {
    if (user.id === myId) return;
    nav.navigate('UserDetail', { userId: user.id, userName: user.name, initialPhone: user.phone ?? undefined, initialJobTitle: user.jobTitle ?? undefined });
  }, [myId, nav]);

  const renderItem = ({ item }: { item: User }) => {
    const isMe = item.id === myId;
    const avatarUri = item.avatarUrl || `/users/${item.id}/avatar`;
    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => handlePress(item)}
        activeOpacity={isMe ? 1 : 0.6}
      >
        <Avatar uri={avatarUri} name={item.name} size={44} borderRadius={13} />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{item.name}</Text>
            {isMe && <View style={styles.meBadge}><Text style={styles.meBadgeText}>나</Text></View>}
          </View>
          <Text style={styles.email}>{item.email}</Text>
          {item.statusMessage ? (
            <Text style={styles.status} numberOfLines={1}>{item.statusMessage}</Text>
          ) : null}
        </View>
        {!isMe && <Ionicons name="chatbubble-outline" size={18} color="#a0a5bc" />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>멤버</Text>
        <Text style={styles.headerCount}>{members.length}명</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#a0a5bc" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="이름 또는 이메일 검색"
          placeholderTextColor="#a0a5bc"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color="#6366f1" /></View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={filtered.length === 0 ? styles.emptyWrap : { paddingBottom: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>멤버가 없습니다</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 58, paddingBottom: 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#000' },
  headerCount: { fontSize: 15, color: '#8e8e93' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 6,
    backgroundColor: '#f2f2f7', borderRadius: 10,
  },
  searchIcon: { marginLeft: 12 },
  searchInput: { flex: 1, paddingHorizontal: 8, paddingVertical: 9, fontSize: 15, color: '#000' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#8e8e93', fontSize: 14 },
  item: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 12,
  },
  info: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontWeight: '500', color: '#000' },
  meBadge: { backgroundColor: '#e8e8ed', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  meBadgeText: { fontSize: 10, fontWeight: '600', color: '#636366' },
  email: { fontSize: 14, color: '#8e8e93', marginTop: 1 },
  status: { fontSize: 13, color: '#aeaeb2', marginTop: 2 },
});
