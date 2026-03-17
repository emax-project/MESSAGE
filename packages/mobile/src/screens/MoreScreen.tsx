import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store';
import Avatar from '../components/Avatar';

type MoreStackParamList = {
  MoreHome: undefined;
  Settings: undefined;
  Bookmarks: undefined;
  Schedule: undefined;
};

export default function MoreScreen() {
  const nav = useNavigation<NativeStackNavigationProp<MoreStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>더보기</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.profile} activeOpacity={0.7}>
          <Avatar uri={user?.avatarUrl || (user?.id ? `/users/${user.id}/avatar` : null)} name={user?.name} size={56} borderRadius={28} />
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user?.name ?? '사용자'}</Text>
              {user?.jobTitle ? <Text style={styles.profileJobTitle}> {user.jobTitle}</Text> : null}
            </View>
            <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
        </TouchableOpacity>

        <View style={styles.sectionGap} />

        <View style={styles.group}>
          <MenuItem icon="bookmark-outline" label="북마크" onPress={() => nav.navigate('Bookmarks')} />
          <MenuItem icon="calendar-outline" label="일정" onPress={() => nav.navigate('Schedule')} last />
        </View>

        <View style={styles.sectionGap} />

        <View style={styles.group}>
          <MenuItem icon="settings-outline" label="설정" onPress={() => nav.navigate('Settings')} last />
        </View>

        <View style={styles.sectionGap} />

        <View style={styles.group}>
          <TouchableOpacity style={[styles.menuRow, styles.menuRowLast]} onPress={logout} activeOpacity={0.5}>
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function MenuItem({ icon, label, onPress, last }: { icon: string; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.menuRow, last && styles.menuRowLast]} onPress={onPress} activeOpacity={0.5}>
      <Ionicons name={icon as any} size={22} color="#3a3a3c" />
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#c7c7cc" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: { paddingTop: 58, paddingBottom: 8, paddingHorizontal: 20, backgroundColor: '#f2f2f7' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#000' },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 14, paddingHorizontal: 20,
    backgroundColor: '#fff',
  },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap' },
  profileName: { fontSize: 18, fontWeight: '600', color: '#000' },
  profileJobTitle: { fontSize: 15, color: '#8e8e93', fontWeight: '400' },
  profileEmail: { fontSize: 14, color: '#8e8e93', marginTop: 2 },
  sectionGap: { height: 20 },
  group: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden' },
  menuRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 13, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea',
  },
  menuRowLast: { borderBottomWidth: 0 },
  menuLabel: { flex: 1, fontSize: 16, color: '#000' },
  logoutText: { flex: 1, fontSize: 16, color: '#ff3b30', textAlign: 'center' },
});
