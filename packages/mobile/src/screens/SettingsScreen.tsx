import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Switch, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../store';

const BIOMETRIC_KEY = 'emax_biometric_enabled';

export default function SettingsScreen() {
  const nav = useNavigation();
  const { isDark, toggleDark } = useThemeStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(BIOMETRIC_KEY).then((v) => setBiometricEnabled(v === 'true'));
  }, []);

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabled(value);
    await AsyncStorage.setItem(BIOMETRIC_KEY, value ? 'true' : 'false');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#4a5068" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>일반</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>다크 모드</Text>
            <Switch value={isDark} onValueChange={toggleDark} />
          </View>
        </View>

        <Text style={styles.sectionTitle}>보안</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>생체 인증 / PIN 자동 로그인</Text>
              <Text style={styles.rowHint}>
                {Platform.OS === 'web'
                  ? '모바일 앱에서 Face ID, 지문, 기기 비밀번호로 자동 로그인'
                  : '앱 실행 시 생체 인증. 실패 시 기기 비밀번호 사용 가능.'}
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleBiometricToggle}
              disabled={Platform.OS === 'web'}
            />
          </View>
        </View>

        <Text style={styles.sectionTitle}>정보</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>앱 버전</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: {
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#f2f2f7', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c6c6c8',
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: '#000', textAlign: 'center' },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8e8e93', marginBottom: 8, marginTop: 16, marginLeft: 4 },
  section: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea',
  },
  rowLabel: { fontSize: 15, color: '#000', fontWeight: '500' },
  rowHint: { fontSize: 12, color: '#aeaeb2', marginTop: 2 },
  rowValue: { fontSize: 14, color: '#8e8e93' },
});
