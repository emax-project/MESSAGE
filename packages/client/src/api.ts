// 빈 문자열이면 같은 origin 사용(배포 시 같은 서버에서 API·웹 서빙), 없으면 로컬 개발용
export const BASE =
  import.meta.env.VITE_API_URL === '' ? '' : (import.meta.env.VITE_API_URL || 'http://192.168.0.204:3001');

function getToken(): string | null {
  return localStorage.getItem('token');
}

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  const t = getToken();
  if (t) (h as Record<string, string>)['Authorization'] = `Bearer ${t}`;
  return h;
}

function authHeaders(): HeadersInit {
  const h: HeadersInit = {};
  const t = getToken();
  if (t) (h as Record<string, string>)['Authorization'] = `Bearer ${t}`;
  return h;
}

function mapUploadError(status: number, serverMessage?: string) {
  if (serverMessage) return serverMessage;
  if (status === 0) return '네트워크 오류가 발생했습니다';
  if (status === 401) return '로그인이 필요합니다';
  if (status === 403) return '권한이 없습니다';
  if (status === 404) return '업로드 경로를 찾을 수 없습니다';
  if (status === 413) return '파일이 너무 큽니다';
  if (status === 415) return '지원하지 않는 파일 형식입니다';
  if (status >= 500) return '서버 오류가 발생했습니다';
  return '업로드 실패';
}

function handleForcedLogout(path: string, status: number, serverMessage?: string) {
  if (status !== 401) return;
  if (path.startsWith('/auth/login') || path.startsWith('/auth/register')) return;
  const msg = serverMessage || '다른 기기에서 로그인되어 로그아웃되었습니다.';
  try {
    localStorage.setItem('forcedLogoutMessage', msg);
    localStorage.removeItem('token');
    if (typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/register';
      if (!isLoginPage) window.location.href = '/login';
    }
  } catch {
    // ignore
  }
}

export const api = {
  async post(path: string, body: object) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleForcedLogout(path, res.status, (data as { error?: string }).error);
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return data;
  },
  async get(path: string) {
    const res = await fetch(`${BASE}${path}`, { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleForcedLogout(path, res.status, (data as { error?: string }).error);
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return data;
  },
  async put(path: string, body: object) {
    const res = await fetch(`${BASE}${path}`, {
      method: 'PUT',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleForcedLogout(path, res.status, (data as { error?: string }).error);
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return data;
  },
  async delete(path: string) {
    const res = await fetch(`${BASE}${path}`, { method: 'DELETE', headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      handleForcedLogout(path, res.status, (data as { error?: string }).error);
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return data;
  },
  upload(
    path: string,
    formData: FormData,
    onProgress?: (percent: number) => void
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE}${path}`);
      const t = getToken();
      if (t) xhr.setRequestHeader('Authorization', `Bearer ${t}`);
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }
      xhr.addEventListener('load', () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) resolve(data);
          else reject(new Error(mapUploadError(xhr.status, data.error)));
        } catch {
          reject(new Error(mapUploadError(xhr.status)));
        }
      });
      xhr.addEventListener('error', () => reject(new Error(mapUploadError(0))));
      xhr.addEventListener('abort', () => reject(new Error('업로드가 취소되었습니다')));
      xhr.send(formData);
    });
  },
};

export type User = { id: string; email: string; name: string; createdAt?: string; isAdmin?: boolean; statusMessage?: string | null };

export type OrgUser = { id: string; name: string; email: string; avatarUrl?: string; statusMessage?: string | null };
export type OrgDepartment = { id: string; name: string; users: OrgUser[] };
export type OrgCompany = { id: string; name: string; departments: OrgDepartment[] };

export type ReactionGroup = { emoji: string; count: number; userIds: string[] };

export type PollOption = {
  id: string;
  text: string;
  voteCount: number;
  voterIds: string[];
};

export type Poll = {
  id: string;
  question: string;
  isMultiple: boolean;
  options: PollOption[];
  messageId?: string;
};

export type Room = {
  id: string;
  name: string;
  isGroup: boolean;
  /** 'chat' = 챗뷰(메시지 기반), 'board' = 보드뷰(게시글 기반) */
  viewMode?: 'chat' | 'board';
  /** 폴더 ID (사용자별로 RoomMember.folderId) */
  folderId?: string | null;
  members: User[];
  lastMessage: { id: string; content: string; createdAt: string; senderName: string } | null;
  updatedAt: string;
  unreadCount?: number;
  avatarUrl?: string;
  isFavorite?: boolean;
};

export type Message = {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: User;
  readCount?: number;
  fileUrl?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  fileMimeType?: string | null;
  fileExpiresAt?: string | null;
  eventTitle?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  eventDescription?: string | null;
  replyToId?: string | null;
  replyTo?: { id: string; content: string; sender: { id: string; name: string } } | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  reactions?: ReactionGroup[];
  poll?: Poll | null;
};

export type PinnedMessageItem = {
  id: string;
  pinnedAt: string;
  message: {
    id: string;
    content: string;
    sender: { id: string; name: string };
    createdAt: string;
  };
};

export type Event = {
  id: string;
  userId: string;
  title: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Bookmark = {
  id: string;
  messageId: string;
  createdAt: string;
  message: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string };
    fileUrl?: string | null;
    fileName?: string | null;
    fileSize?: number | null;
    room: { id: string; name: string };
  };
};

export type MentionItem = {
  id: string;
  messageId: string;
  readAt: string | null;
  message: {
    id: string;
    content: string;
    createdAt: string;
    sender: { id: string; name: string };
    room: { id: string; name: string };
  };
};

export type ReaderInfo = {
  userId: string;
  userName: string;
  readAt: string;
};

export type FileInfo = {
  id: string;
  fileName: string | null;
  fileSize: number | null;
  fileMimeType: string | null;
  fileExpiresAt: string | null;
  createdAt: string;
  sender: { id: string; name: string };
};

export type PublicRoom = {
  id: string;
  name: string;
  memberCount: number;
  isMember: boolean;
  lastMessage: { content: string; createdAt: string; senderName: string } | null;
  updatedAt: string;
};

export type ThreadData = {
  parent: Message;
  replies: Message[];
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }) as Promise<{ user: User; token: string }>,
  register: (email: string, password: string, name: string) =>
    api.post('/auth/register', { email, password, name }) as Promise<{ user: User; token: string }>,
  me: () => api.get('/auth/me') as Promise<{ user: User }>,
  logout: () => api.post('/auth/logout', {}) as Promise<{ ok: boolean }>,
};

export const usersApi = {
  list: () => api.get('/users') as Promise<User[]>,
  updateStatus: (statusMessage: string) =>
    api.put('/users/status', { statusMessage }) as Promise<{ ok: boolean }>,
};

export const orgApi = {
  tree: () => api.get('/org/tree') as Promise<OrgCompany[]>,
  online: () => api.get('/org/online') as Promise<{ userIds: string[] }>,
};

export const announcementApi = {
  get: () => api.get('/announcement') as Promise<{ content: string | null }>,
  put: (content: string) => api.put('/announcement', { content }) as Promise<{ ok: boolean }>,
};

export const eventsApi = {
  list: () => api.get('/events') as Promise<Event[]>,
  create: (data: { title: string; startAt: string; endAt: string; description?: string }) =>
    api.post('/events', data) as Promise<Event>,
  update: (id: string, data: { title?: string; startAt?: string; endAt?: string; description?: string }) =>
    api.put(`/events/${id}`, data) as Promise<Event>,
  delete: (id: string) => api.delete(`/events/${id}`) as Promise<{ ok: boolean }>,
};

export const roomsApi = {
  list: () => api.get('/rooms') as Promise<Room[]>,
  create: (otherUserId: string) => api.post('/rooms', { otherUserId }) as Promise<Room & { members: { user: User }[] }>,
  createTopic: (data: { name: string; description?: string; isPublic?: boolean; viewMode?: string; memberIds: string[]; folderId?: string }) =>
    api.post('/rooms/topic', data) as Promise<Room>,
  get: (id: string) => api.get(`/rooms/${id}`) as Promise<Room>,
  updateViewMode: (roomId: string, viewMode: 'chat' | 'board') =>
    api.put(`/rooms/${roomId}`, { viewMode }) as Promise<{ viewMode: string }>,
  markRead: (roomId: string) => api.post(`/rooms/${roomId}/read`, {}) as Promise<{ ok: boolean }>,
  messages: (roomId: string, cursor?: string) =>
    api.get(`/rooms/${roomId}/messages${cursor ? `?cursor=${cursor}` : ''}`) as Promise<{
      messages: Message[];
      nextCursor: string | null;
      hasMore: boolean;
    }>,
  addMembers: (roomId: string, userIds: string[], isPublic?: boolean) =>
    api.post(`/rooms/${roomId}/members`, { userIds, isPublic }) as Promise<Room>,
  searchMessages: (roomId: string, query: string) =>
    api.get(`/rooms/${roomId}/messages/search?q=${encodeURIComponent(query)}`) as Promise<{ messages: Message[] }>,
  editMessage: (roomId: string, messageId: string, content: string) =>
    api.put(`/rooms/${roomId}/messages/${messageId}`, { content }) as Promise<Message>,
  deleteMessage: (roomId: string, messageId: string) =>
    api.delete(`/rooms/${roomId}/messages/${messageId}`) as Promise<{ ok: boolean }>,
  leave: (roomId: string) =>
    api.post(`/rooms/${roomId}/leave`, {}) as Promise<{ ok: boolean }>,
  toggleFavorite: (roomId: string, isFavorite: boolean) =>
    api.put(`/rooms/${roomId}/favorite`, { isFavorite }) as Promise<{ ok: boolean; isFavorite: boolean }>,
  forwardMessage: (targetRoomId: string, messageId: string) =>
    api.post(`/rooms/${targetRoomId}/forward`, { messageId }) as Promise<Message>,
  toggleReaction: (roomId: string, messageId: string, emoji: string) =>
    api.post(`/rooms/${roomId}/messages/${messageId}/reactions`, { emoji }) as Promise<{ reactions: ReactionGroup[] }>,
  pinMessage: (roomId: string, messageId: string) =>
    api.post(`/rooms/${roomId}/pin`, { messageId }) as Promise<{ ok: boolean }>,
  unpinMessage: (roomId: string, messageId: string) =>
    api.delete(`/rooms/${roomId}/pin/${messageId}`) as Promise<{ ok: boolean }>,
  getPins: (roomId: string) =>
    api.get(`/rooms/${roomId}/pins`) as Promise<{ pins: PinnedMessageItem[] }>,
  files: (roomId: string, cursor?: string) =>
    api.get(`/rooms/${roomId}/files${cursor ? `?cursor=${cursor}` : ''}`) as Promise<{ files: FileInfo[]; nextCursor: string | null; hasMore: boolean }>,
  messageReaders: (roomId: string, messageId: string) =>
    api.get(`/rooms/${roomId}/messages/${messageId}/readers`) as Promise<{ readers: ReaderInfo[] }>,
  thread: (roomId: string, messageId: string) =>
    api.get(`/rooms/${roomId}/messages/${messageId}/thread`) as Promise<ThreadData>,
  listPublic: () =>
    api.get('/rooms/public') as Promise<PublicRoom[]>,
  join: (roomId: string) =>
    api.post(`/rooms/${roomId}/join`, {}) as Promise<Room>,
};

export const filesApi = {
  upload: (roomId: string, file: File, onProgress?: (percent: number) => void, content?: string) => {
    const formData = new FormData();
    formData.append('roomId', roomId);
    formData.append('file', file);
    if (content) formData.append('content', content);
    return api.upload('/files/upload', formData, onProgress) as Promise<Message>;
  },
  async fetchBlob(messageId: string): Promise<Blob> {
    const res = await fetch(`${BASE}/files/download/${messageId}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    return res.blob();
  },
  async download(messageId: string, filename?: string | null) {
    const res = await fetch(`${BASE}/files/download/${messageId}`, {
      method: 'GET',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || res.statusText);
    }
    const blob = await res.blob();
    let downloadName = filename || 'download';
    const disp = res.headers.get('Content-Disposition');
    if (disp) {
      const utf8Match = disp.match(/filename\*=UTF-8''([^;\s]+)/i);
      if (utf8Match) {
        try {
          downloadName = decodeURIComponent(utf8Match[1]);
        } catch {
          // keep filename from param
        }
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export const pollsApi = {
  create: (data: { roomId: string; question: string; options: string[]; isMultiple?: boolean }) =>
    api.post('/polls', data) as Promise<{ message: Message; poll: Poll }>,
  vote: (pollId: string, optionId: string) =>
    api.post(`/polls/${pollId}/vote`, { optionId }) as Promise<Poll>,
  get: (pollId: string) =>
    api.get(`/polls/${pollId}`) as Promise<Poll>,
};

export type Project = {
  id: string;
  roomId: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  boards: Board[];
  tasks: TaskItem[];
};

export type Board = {
  id: string;
  projectId: string;
  name: string;
  position: number;
};

export type TaskItem = {
  id: string;
  projectId: string;
  boardId: string;
  title: string;
  description?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  priority: 'low' | 'medium' | 'high';
  startDate?: string | null;
  dueDate?: string | null;
  position: number;
  createdBy: string;
  messageId?: string | null;
  createdAt: string;
  _count?: { comments: number };
};

export type TaskComment = {
  id: string;
  taskId: string;
  userId: string;
  userName?: string;
  content: string;
  createdAt: string;
};

export const projectsApi = {
  list: (roomId: string) =>
    api.get(`/projects/room/${roomId}`) as Promise<Project[]>,
  create: (data: { roomId: string; name: string; description?: string }) =>
    api.post('/projects', data) as Promise<Project>,
  update: (id: string, data: { name?: string; description?: string }) =>
    api.put(`/projects/${id}`, data) as Promise<Project>,
  delete: (id: string) =>
    api.delete(`/projects/${id}`) as Promise<{ ok: boolean }>,
  addBoard: (id: string, name: string) =>
    api.post(`/projects/${id}/boards`, { name }) as Promise<Board>,
  updateBoard: (id: string, boardId: string, name: string) =>
    api.put(`/projects/${id}/boards/${boardId}`, { name }) as Promise<Board>,
  deleteBoard: (id: string, boardId: string) =>
    api.delete(`/projects/${id}/boards/${boardId}`) as Promise<{ ok: boolean }>,
  createTask: (id: string, data: { boardId: string; title: string; description?: string; assigneeId?: string; priority?: string; startDate?: string; dueDate?: string; messageId?: string }) =>
    api.post(`/projects/${id}/tasks`, data) as Promise<TaskItem>,
  updateTask: (id: string, taskId: string, data: { title?: string; description?: string; assigneeId?: string | null; priority?: string; startDate?: string | null; dueDate?: string | null }) =>
    api.put(`/projects/${id}/tasks/${taskId}`, data) as Promise<TaskItem>,
  deleteTask: (id: string, taskId: string) =>
    api.delete(`/projects/${id}/tasks/${taskId}`) as Promise<{ ok: boolean }>,
  moveTask: (id: string, taskId: string, boardId: string, position: number) =>
    api.post(`/projects/${id}/tasks/${taskId}/move`, { boardId, position }) as Promise<TaskItem>,
  getComments: (id: string, taskId: string) =>
    api.get(`/projects/${id}/tasks/${taskId}/comments`) as Promise<TaskComment[]>,
  addComment: (id: string, taskId: string, content: string) =>
    api.post(`/projects/${id}/tasks/${taskId}/comments`, { content }) as Promise<TaskComment>,
};

export const bookmarksApi = {
  list: () => api.get('/bookmarks') as Promise<Bookmark[]>,
  add: (messageId: string) => api.post('/bookmarks', { messageId }) as Promise<{ id: string }>,
  remove: (messageId: string) => api.delete(`/bookmarks/${messageId}`) as Promise<{ ok: boolean }>,
};

export const mentionsApi = {
  list: () => api.get('/mentions') as Promise<MentionItem[]>,
  markRead: (id: string) => api.post(`/mentions/${id}/read`, {}) as Promise<{ ok: boolean }>,
  unreadCount: () => api.get('/mentions/unread-count') as Promise<{ count: number }>,
};

export type LinkPreviewData = { url: string; title: string | null; description: string | null; imageUrl: string | null };

export const linkPreviewApi = {
  get: (url: string) =>
    api.get(`/link-preview?url=${encodeURIComponent(url)}`) as Promise<LinkPreviewData>,
  /** 썸네일 이미지를 서버 경유로 가져와서 외부 차단 시에도 표시 */
  async fetchImageBlob(imageUrl: string, pageUrl?: string): Promise<Blob> {
    let url = `${BASE}/link-preview/image?imageUrl=${encodeURIComponent(imageUrl)}`;
    if (pageUrl) url += `&referer=${encodeURIComponent(pageUrl)}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) throw new Error('이미지를 불러올 수 없습니다.');
    return res.blob();
  },
};

export type Folder = {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
};

export const foldersApi = {
  list: () => api.get('/folders') as Promise<Folder[]>,
  create: (name: string) => api.post('/folders', { name }) as Promise<Folder>,
  update: (id: string, name: string) => api.put(`/folders/${id}`, { name }) as Promise<Folder>,
  delete: (id: string) => api.delete(`/folders/${id}`) as Promise<{ ok: boolean }>,
  assign: (roomId: string, folderId: string | null) =>
    api.put('/folders/assign', { roomId, folderId }) as Promise<{ ok: boolean }>,
};

export function getSocketUrl(): string {
  if (BASE === '') return typeof window !== 'undefined' ? window.location.origin : '';
  return BASE;
}
