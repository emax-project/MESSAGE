import { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Platform } from 'react-native';
import { getBaseUrl, getToken } from '../api';

type Props = {
  uri?: string | null;
  initials?: string | null;
  name?: string;
  size?: number;
  borderRadius?: number;
};

const GRADIENT_PAIRS = [
  ['#6366f1', '#a78bfa'],
  ['#8b5cf6', '#c084fc'],
  ['#06b6d4', '#67e8f9'],
  ['#f59e0b', '#fbbf24'],
  ['#10b981', '#6ee7b7'],
  ['#ec4899', '#f9a8d4'],
  ['#f43f5e', '#fda4af'],
  ['#3b82f6', '#93c5fd'],
];

function hashStr(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export default function Avatar({ uri, initials, name, size = 44, borderRadius = 12 }: Props) {
  const baseUrl = getBaseUrl();
  const token = getToken();
  const letter = initials || name?.trim()[0]?.toUpperCase() || '?';
  const [blobUri, setBlobUri] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const rawUrl = uri ? (uri.startsWith('http') ? uri : `${baseUrl}${uri}`) : null;

  useEffect(() => {
    if (!rawUrl || !token) { setBlobUri(null); return; }
    let revoked = false;
    fetch(rawUrl, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (!res.ok) throw new Error('avatar fetch failed');
        return res.blob();
      })
      .then((blob) => {
        if (revoked) return;
        if (Platform.OS === 'web') {
          setBlobUri(URL.createObjectURL(blob));
        } else {
          const reader = new FileReader();
          reader.onloadend = () => { if (!revoked) setBlobUri(reader.result as string); };
          reader.readAsDataURL(blob);
        }
      })
      .catch(() => { if (!revoked) setFailed(true); });
    return () => {
      revoked = true;
      if (Platform.OS === 'web' && blobUri) URL.revokeObjectURL(blobUri);
    };
  }, [rawUrl, token]);

  if (blobUri && !failed) {
    return (
      <Image
        source={{ uri: blobUri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        onError={() => setFailed(true)}
      />
    );
  }

  const colorIdx = hashStr(name || letter) % GRADIENT_PAIRS.length;
  const bgColor = GRADIENT_PAIRS[colorIdx][0];

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius, backgroundColor: bgColor }]}>
      <Text style={[styles.letter, { fontSize: size * 0.38 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { backgroundColor: '#eceef5' },
  fallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  letter: { fontWeight: '700', color: '#fff' },
});
