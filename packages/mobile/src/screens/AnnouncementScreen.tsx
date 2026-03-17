import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { announcementApi } from '../api';

export default function AnnouncementScreen() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcement'],
    queryFn: announcementApi.get,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>공지</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#007aff" />
        </View>
      </View>
    );
  }

  const content = data?.content?.trim();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>공지</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {content ? (
          <Text style={styles.content}>{content}</Text>
        ) : (
          <Text style={styles.empty}>등록된 공지가 없습니다.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e3a5f',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#fff', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  content: { fontSize: 15, color: '#3a3a3c', lineHeight: 24 },
  empty: { fontSize: 14, color: '#8e8e93', textAlign: 'center', marginTop: 40 },
});
