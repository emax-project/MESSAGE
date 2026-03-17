import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, Alert,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Socket } from 'socket.io-client';
import type { Message, Room } from '@emax/shared';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { roomsApi, filesApi, announcementApi, type FileAsset } from '../api';
import { useAuthStore, useViewingRoomStore } from '../store';
import { getGlobalSocket } from '../socket';
import Avatar from '../components/Avatar';
import FileMessage from '../components/FileMessage';

type RouteParams = {
  Chat: {
    roomId: string;
    roomName: string;
    isTopic?: boolean;
    viewMode?: 'chat' | 'board';
  };
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
}

function getDateKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export default function ChatScreen() {
  const route = useRoute<RouteProp<RouteParams, 'Chat'>>();
  const nav = useNavigation<NativeStackNavigationProp<any>>();
  const { roomId, roomName, isTopic, viewMode: initialViewMode } = route.params;
  const token = useAuthStore((s) => s.token);
  const myId = useAuthStore((s) => s.user?.id);
  const setViewingRoomId = useViewingRoomStore((s) => s.setViewingRoomId);
  const queryClient = useQueryClient();
  const { data: announcementData } = useQuery({ queryKey: ['announcement'], queryFn: announcementApi.get });
  const [announcementExpanded, setAnnouncementExpanded] = useState(false);

  const isBoardView = isTopic && initialViewMode === 'board';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [fileUploading, setFileUploading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async (cursor?: string) => {
    try {
      const data = await roomsApi.messages(roomId, cursor);
      if (cursor) {
        setMessages((prev) => [...prev, ...data.messages]);
      } else {
        setMessages(data.messages);
      }
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err) {
      console.warn('메시지 로드 실패', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages();
    if (myId) {
      queryClient.setQueryData<Room[]>(['rooms', myId], (old) =>
        old?.map((r) => (r.id === roomId ? { ...r, unreadCount: 0 } : r)) ?? old
      );
    }
    roomsApi.markRead(roomId).then(() => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    }).catch(() => {});
  }, [roomId, loadMessages, queryClient, myId]);

  useEffect(() => {
    const s = getGlobalSocket();
    if (!s) return;
    socketRef.current = s;
    s.emit('join_room', roomId);
    s.emit('viewing_room', { roomId });
    setViewingRoomId(roomId);
    const onMessage = (msg: Message) => {
      if (msg.roomId === roomId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [msg, ...prev];
        });
        roomsApi.markRead(roomId).then(() => {
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        }).catch(() => {});
      }
    };
    s.on('message', onMessage);
    return () => {
      setViewingRoomId(null);
      s.emit('viewing_room', { roomId: null });
      s.off('message', onMessage);
      socketRef.current = null;
    };
  }, [token, roomId, setViewingRoomId, queryClient]);

  const handleSend = async () => {
    const text = input.trim();
    if ((!text && !pendingFile) || sending || fileUploading) return;
    if (pendingFile) {
      setFileUploading(true);
      try {
        const content = text || undefined;
        const msg = await filesApi.upload(roomId, pendingFile, content);
        setMessages((prev) => [msg, ...prev]);
        setPendingFile(null);
        setInput('');
        roomsApi.markRead(roomId).catch(() => {});
        queryClient.invalidateQueries({ queryKey: ['rooms'] });
      } catch (err) {
        Alert.alert('업로드 실패', err instanceof Error ? err.message : '파일 전송에 실패했습니다.');
      } finally {
        setFileUploading(false);
      }
      return;
    }
    if (!text) return;
    setSending(true);
    try {
      const s = socketRef.current;
      if (s?.connected) {
        s.emit('message', { roomId, content: text });
      }
      setInput('');
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '카메라 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      const isVideo = !!(a.mimeType?.startsWith('video/') || (a as any).type === 'video');
      setPendingFile({
        uri: a.uri,
        name: a.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
        mimeType: a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
      });
    }
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '갤러리 접근 권한이 필요합니다.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      if (result.assets.length === 1) {
        const a = result.assets[0];
        const isVideo = !!(a.mimeType?.startsWith('video/') || (a as any).type === 'video');
        setPendingFile({
          uri: a.uri,
          name: a.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
          mimeType: a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        });
      } else {
        setFileUploading(true);
        try {
          for (const a of result.assets) {
            const isVideo = !!(a.mimeType?.startsWith('video/') || (a as any).type === 'video');
            const msg = await filesApi.upload(roomId, {
              uri: a.uri,
              name: a.fileName || (isVideo ? 'video.mp4' : 'photo.jpg'),
              mimeType: a.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
            });
            setMessages((prev) => [msg, ...prev]);
          }
          roomsApi.markRead(roomId).catch(() => {});
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
        } catch (err) {
          Alert.alert('업로드 실패', err instanceof Error ? err.message : '파일 전송에 실패했습니다.');
        } finally {
          setFileUploading(false);
        }
      }
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const a = result.assets[0];
        setPendingFile({
          uri: a.uri,
          name: a.name || 'file',
          mimeType: a.mimeType || 'application/octet-stream',
        });
      }
    } catch (err) {
      Alert.alert('오류', err instanceof Error ? err.message : '파일 선택에 실패했습니다.');
    }
  };

  const showAttachmentOptions = () => {
    Alert.alert('첨부', '선택하세요', [
      { text: '카메라', onPress: pickFromCamera },
      { text: '갤러리', onPress: pickFromGallery },
      { text: '파일 선택', onPress: pickFromFiles },
      { text: '취소', style: 'cancel' },
    ]);
  };

  const handleLoadMore = () => {
    if (hasMore && nextCursor) loadMessages(nextCursor);
  };

  const [pendingFile, setPendingFile] = useState<FileAsset | null>(null);

  const { rootPosts, repliesMap } = useMemo(() => {
    const reversed = [...messages].reverse();
    const map = new Map<string, Message[]>();
    const roots: Message[] = [];
    for (const m of reversed) {
      if (m.replyToId) {
        const arr = map.get(m.replyToId) || [];
        arr.push(m);
        map.set(m.replyToId, arr);
      } else {
        roots.push(m);
      }
    }
    return { rootPosts: roots, repliesMap: map };
  }, [messages]);

  const messagesWithDates = useMemo(() => {
    const result: (Message | { _type: 'date'; label: string; key: string })[] = [];
    let lastDateKey = '';
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey !== lastDateKey) {
        result.push({ _type: 'date', label: formatDateLabel(msg.createdAt), key: `date-${dateKey}` });
        lastDateKey = dateKey;
      }
      result.push(msg);
    }
    return result.reverse();
  }, [messages]);

  const renderChatItem = ({ item }: { item: Message | { _type: 'date'; label: string; key: string } }) => {
    if ('_type' in item && item._type === 'date') {
      return (
        <View style={styles.dateSep}>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{item.label}</Text>
          </View>
        </View>
      );
    }
    const msg = item as Message;
    const isMine = msg.senderId === myId;
    const isDeleted = !!msg.deletedAt;
    const hasFile = !!msg.fileUrl;

    const renderBubble = () => {
      if (isDeleted) {
        return <Text style={[styles.msgText, isMine && styles.msgTextMine, styles.deletedText]}>삭제된 메시지</Text>;
      }
      if (hasFile) {
        return (
          <View>
            {msg.content ? <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{msg.content}</Text> : null}
            <FileMessage message={msg} bubbleStyle={isMine ? {} : {}} textStyle={isMine ? styles.msgTextMine : undefined} />
          </View>
        );
      }
      return <Text style={[styles.msgText, isMine && styles.msgTextMine]}>{msg.content || ''}</Text>;
    };

    if (isMine) {
      return (
        <View style={[styles.msgRow, styles.msgRowMine]}>
          <View style={[styles.bubble, styles.bubbleMine]}>
            {renderBubble()}
          </View>
          <View style={[styles.metaRow, styles.metaRowMine]}>
            <Text style={styles.timeText}>{formatTime(msg.createdAt)}</Text>
            {msg.readCount != null && msg.readCount > 0 && (
              <Text style={styles.readCount}>읽음</Text>
            )}
          </View>
        </View>
      );
    }
    return (
      <View style={styles.otherMsgWrap}>
        <Avatar uri={msg.sender?.avatarUrl || (msg.senderId ? `/users/${msg.senderId}/avatar` : null)} name={msg.sender?.name} size={34} borderRadius={11} />
        <View style={styles.msgRow}>
          <Text style={styles.senderName}>{msg.sender?.name ?? '알 수 없음'}</Text>
          <View style={[styles.bubble, styles.bubbleOther]}>
            {renderBubble()}
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.timeText}>{formatTime(msg.createdAt)}</Text>
          </View>
        </View>
      </View>
    );
  };

  const handleCommentSend = (postId: string) => {
    const text = (commentInputs[postId] || '').trim();
    if (!text) return;
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('message', { roomId, content: text, replyToId: postId });
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    }
  };

  const renderBoardPost = ({ item }: { item: Message }) => {
    const isDeleted = !!item.deletedAt;
    const replies = repliesMap.get(item.id) || [];
    const isExpanded = expandedPost === item.id;
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <Avatar uri={item.sender?.avatarUrl || (item.senderId ? `/users/${item.senderId}/avatar` : null)} name={item.sender?.name} size={32} borderRadius={10} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.postAuthor}>{item.sender?.name ?? '알 수 없음'}</Text>
            <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
          </View>
        </View>
        {item.fileUrl ? (
          <View style={{ marginTop: 4 }}>
            {item.content ? <Text style={styles.postContent}>{item.content}</Text> : null}
            <FileMessage message={item} />
          </View>
        ) : (
          <Text style={[styles.postContent, isDeleted && styles.deletedText]} numberOfLines={isExpanded ? undefined : 4}>
            {isDeleted ? '삭제된 메시지' : item.content || ''}
          </Text>
        )}
        {replies.length > 0 && (
          <TouchableOpacity style={styles.replyToggle} onPress={() => setExpandedPost(isExpanded ? null : item.id)}>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chatbubble-outline'} size={14} color="#007aff" style={{ marginRight: 5 }} />
            <Text style={styles.replyToggleText}>
              {isExpanded ? '댓글 접기' : `댓글 ${replies.length}개`}
            </Text>
          </TouchableOpacity>
        )}
        {isExpanded && replies.map((r) => (
          <View key={r.id} style={styles.replyRow}>
            <Avatar uri={r.sender?.avatarUrl || (r.senderId ? `/users/${r.senderId}/avatar` : null)} name={r.sender?.name} size={24} borderRadius={8} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.replyAuthor}>{r.sender?.name ?? '알 수 없음'} <Text style={styles.replyTime}>{formatTime(r.createdAt)}</Text></Text>
              <Text style={styles.replyContent}>{r.deletedAt ? '삭제된 메시지' : r.content}</Text>
            </View>
          </View>
        ))}
        <View style={styles.commentInputRow}>
          <TextInput
            style={styles.commentInput}
            placeholder="댓글을 입력하세요..."
            placeholderTextColor="#a0a5bc"
            value={commentInputs[item.id] || ''}
            onChangeText={(t) => setCommentInputs((prev) => ({ ...prev, [item.id]: t }))}
            onSubmitEditing={() => handleCommentSend(item.id)}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.commentSendBtn, !(commentInputs[item.id] || '').trim() && styles.commentSendBtnDisabled]}
            onPress={() => handleCommentSend(item.id)}
            disabled={!(commentInputs[item.id] || '').trim()}
          >
            <Ionicons name="arrow-up" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#007aff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.headerTitle} numberOfLines={1}>{roomName}</Text>
          {isBoardView && (
            <View style={styles.headerBadgeWrap}>
              <Ionicons name="grid-outline" size={10} color="#8e8e93" />
              <Text style={styles.headerBadge}>보드뷰</Text>
            </View>
          )}
        </View>
        {isTopic ? (
          <TouchableOpacity onPress={() => nav.navigate('Kanban', { roomId, roomName })} style={styles.kanbanBtn}>
            <Ionicons name="albums-outline" size={18} color="#007aff" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {announcementData?.content?.trim() && (
        <TouchableOpacity
          style={styles.announcementBar}
          onPress={() => setAnnouncementExpanded((e) => !e)}
          activeOpacity={0.8}
        >
          <Ionicons name="megaphone-outline" size={18} color="#636366" />
          <Text style={styles.announcementTitle} numberOfLines={1}>
            {new Date().getMonth() + 1}월 공지사항
          </Text>
          <Ionicons name={announcementExpanded ? 'chevron-up' : 'chevron-down'} size={18} color="#8e8e93" />
        </TouchableOpacity>
      )}
      {announcementExpanded && announcementData?.content?.trim() && (
        <View style={styles.announcementContent}>
          <Text style={styles.announcementText}>{announcementData.content}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#007aff" /></View>
      ) : isBoardView ? (
        <FlatList
          data={rootPosts}
          keyExtractor={(item) => item.id}
          renderItem={renderBoardPost}
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          ListEmptyComponent={<View style={styles.center}><Text style={styles.emptyText}>게시글이 없습니다</Text></View>}
        />
      ) : (
        <FlatList
          ref={flatListRef}
          data={messagesWithDates}
          keyExtractor={(item) => ('_type' in item ? item.key : item.id)}
          renderItem={renderChatItem}
          inverted
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        />
      )}

      <View style={styles.inputBar}>
        <TouchableOpacity onPress={showAttachmentOptions} style={styles.attachBtn} disabled={fileUploading}>
          <Ionicons name="add-circle-outline" size={28} color="#007aff" />
        </TouchableOpacity>
        {pendingFile ? (
          <View style={styles.pendingWrap}>
            <Text style={styles.pendingName} numberOfLines={1}>{pendingFile.name}</Text>
            <TouchableOpacity onPress={() => setPendingFile(null)}>
              <Ionicons name="close-circle" size={20} color="#8e8e93" />
            </TouchableOpacity>
          </View>
        ) : null}
        <TextInput
          style={styles.inputField}
          placeholder={pendingFile ? '메시지 추가 (선택)' : '메시지 입력'}
          placeholderTextColor="#a0a5bc"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={5000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, ((!input.trim() && !pendingFile) || sending || fileUploading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={(!input.trim() && !pendingFile) || sending || fileUploading}
        >
          {fileUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="arrow-up" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ececee' },
  header: {
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#c6c6c8',
    flexDirection: 'row', alignItems: 'center',
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000', textAlign: 'center' },
  kanbanBtn: {
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  headerBadgeWrap: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  headerBadge: { fontSize: 10, fontWeight: '500', color: '#8e8e93' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#8e8e93' },
  announcementBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: '#f2f2f7', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea',
  },
  announcementTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: '#000' },
  announcementContent: { padding: 16, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#e5e5ea' },
  announcementText: { fontSize: 14, color: '#3a3a3c', lineHeight: 22 },

  dateSep: { alignItems: 'center', paddingVertical: 12 },
  datePill: { backgroundColor: 'rgba(0,0,0,0.08)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  dateText: { fontSize: 11, color: '#636366' },
  otherMsgWrap: { flexDirection: 'row', gap: 6, marginBottom: 4, maxWidth: '80%', alignItems: 'flex-start' },
  msgRow: { marginBottom: 4, maxWidth: '80%', flexShrink: 1 },
  msgRowMine: { alignSelf: 'flex-end' },
  senderName: { fontSize: 12, fontWeight: '500', color: '#636366', marginBottom: 2, marginLeft: 2 },
  bubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  bubbleOther: { backgroundColor: '#fff', borderTopLeftRadius: 4 },
  bubbleMine: { backgroundColor: '#007aff', borderTopRightRadius: 4 },
  msgText: { fontSize: 16, color: '#000', lineHeight: 22 },
  msgTextMine: { color: '#fff' },
  deletedText: { fontStyle: 'italic', color: '#8e8e93' },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 2, marginLeft: 4 },
  metaRowMine: { justifyContent: 'flex-end', marginRight: 4 },
  timeText: { fontSize: 11, color: '#8e8e93' },
  readCount: { fontSize: 11, color: '#8e8e93' },

  postCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  postAuthor: { fontSize: 14, fontWeight: '600', color: '#000' },
  postTime: { fontSize: 11, color: '#8e8e93', marginTop: 1 },
  postContent: { fontSize: 15, color: '#000', lineHeight: 22 },
  replyToggle: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e5ea' },
  replyToggleText: { fontSize: 13, fontWeight: '500', color: '#007aff' },
  replyRow: { flexDirection: 'row', marginTop: 8, paddingLeft: 4 },
  replyAuthor: { fontSize: 12, fontWeight: '500', color: '#636366' },
  replyTime: { fontSize: 11, fontWeight: '400', color: '#8e8e93' },
  replyContent: { fontSize: 14, color: '#000', marginTop: 2 },

  commentInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e5ea',
  },
  commentInput: {
    flex: 1, backgroundColor: '#f2f2f7', borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 8, fontSize: 14, color: '#000',
  },
  commentSendBtn: {
    backgroundColor: '#007aff', borderRadius: 15,
    width: 30, height: 30, justifyContent: 'center', alignItems: 'center',
  },
  commentSendBtnDisabled: { opacity: 0.3 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#c6c6c8',
  },
  attachBtn: { padding: 4, marginBottom: 4 },
  pendingWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f2f2f7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6,
    maxWidth: 120,
  },
  pendingName: { flex: 1, fontSize: 12, color: '#636366' },
  inputField: {
    flex: 1, backgroundColor: '#f2f2f7', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 16, color: '#000',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#007aff', borderRadius: 18,
    width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.3 },
});
