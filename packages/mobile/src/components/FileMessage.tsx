import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Message } from '@emax/shared';
import { filesApi } from '../api';
import { Ionicons } from '@expo/vector-icons';

function isImageMime(mime: string | null | undefined): boolean {
  return !!mime && mime.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

type Props = { message: Message; bubbleStyle?: object; textStyle?: object };

export default function FileMessage({ message, bubbleStyle, textStyle }: Props) {
  const { id, fileName, fileSize, fileMimeType, fileUrl, fileExpiresAt } = message;
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const isExpired = fileExpiresAt && new Date() > new Date(fileExpiresAt);

  useEffect(() => {
    if (!fileUrl || !isImageMime(fileMimeType) || isExpired) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const blob = await filesApi.fetchBlob(id);
        const buf = await blob.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let binary = '';
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
        }
        const base64 = btoa(binary);
        const ext = (fileName || '').split('.').pop() || 'jpg';
        const cacheDir = FileSystem.cacheDirectory;
        if (!cacheDir) throw new Error('Cache directory not available');
        const path = `${cacheDir}img_${id}.${ext}`;
        await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
        if (!cancelled) setLocalUri(path);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, fileName, fileMimeType, fileUrl, isExpired]);

  const handleDownload = async () => {
    try {
      const blob = await filesApi.fetchBlob(id);
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize) as unknown as number[]);
      }
      const base64 = btoa(binary);
      const ext = (fileName || 'download').split('.').pop() || '';
      const name = fileName || `download_${id}`;
      const cacheDir = FileSystem.cacheDirectory;
      if (!cacheDir) throw new Error('Cache directory not available');
      const path = `${cacheDir}${name}`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: 'base64' });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: fileMimeType || 'application/octet-stream',
          dialogTitle: '저장 또는 공유',
        });
      } else {
        Alert.alert('저장 완료', `파일이 저장되었습니다: ${path}`);
      }
    } catch (err) {
      Alert.alert('오류', err instanceof Error ? err.message : '다운로드에 실패했습니다.');
    }
  };

  if (!fileUrl || isExpired) {
    return (
      <View style={[styles.wrap, bubbleStyle]}>
        <Text style={[styles.expired, textStyle]}>파일이 만료되었습니다</Text>
      </View>
    );
  }

  if (isImageMime(fileMimeType)) {
    if (loading) {
      return (
        <View style={[styles.imageWrap, bubbleStyle]}>
          <ActivityIndicator color="#8e8e93" />
        </View>
      );
    }
    if (error || !localUri) {
      return (
        <TouchableOpacity style={[styles.imageWrap, bubbleStyle]} onPress={handleDownload}>
          <Ionicons name="image-outline" size={32} color="#8e8e93" />
          <Text style={[styles.fallbackText, textStyle]}>미리보기 로딩 실패 - 탭하여 다운로드</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={[styles.imageWrap, bubbleStyle]} onPress={handleDownload} activeOpacity={0.9}>
        <Image source={{ uri: localUri }} style={styles.image} resizeMode="cover" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.fileWrap, bubbleStyle]} onPress={handleDownload} activeOpacity={0.7}>
      <Ionicons name="document-outline" size={24} color={textStyle ? '#fff' : '#007aff'} />
      <View style={styles.fileInfo}>
        <Text style={[styles.fileName, textStyle]} numberOfLines={1}>{fileName || '파일'}</Text>
        {fileSize != null && (
          <Text style={[styles.fileSize, textStyle]}>{formatFileSize(fileSize)}</Text>
        )}
      </View>
      <Ionicons name="download-outline" size={18} color={textStyle ? '#fff' : '#8e8e93'} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 8 },
  expired: { fontSize: 13, fontStyle: 'italic', color: '#8e8e93' },
  imageWrap: {
    minWidth: 120, minHeight: 120, maxWidth: 240, maxHeight: 240,
    borderRadius: 12, overflow: 'hidden', justifyContent: 'center', alignItems: 'center',
  },
  image: { width: '100%', height: '100%', minWidth: 120, minHeight: 120 },
  fallbackText: { fontSize: 11, color: '#8e8e93', marginTop: 4 },
  fileWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
  },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 14, fontWeight: '500', color: '#000' },
  fileSize: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
});
