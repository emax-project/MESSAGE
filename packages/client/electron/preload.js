const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  notifyAppReady: () => ipcRenderer.send('app-ready'),
  sendDebugLog: (payload) => ipcRenderer.send('debug-log', payload),
  openSecondWindow: () => ipcRenderer.invoke('open-second-window'),
  openChatWindow: (roomId) => ipcRenderer.invoke('open-chat-window', roomId),
  openKanbanWindow: (roomId) => ipcRenderer.invoke('open-kanban-window', roomId),
  openGanttWindow: (roomId) => ipcRenderer.invoke('open-gantt-window', roomId),
  showNotification: (title, body, roomId, icon, imagePreview) => ipcRenderer.invoke('show-notification', { title, body, roomId: roomId || null, icon: icon || null, imagePreview: imagePreview || null }),
  setBadgeCount: (count) => ipcRenderer.invoke('set-badge-count', count),
  setOverlayIcon: (dataUrl) => ipcRenderer.invoke('set-overlay-icon', dataUrl),
  setTrayBadge: (dataUrl) => ipcRenderer.invoke('set-tray-badge', dataUrl),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowResize: (width, height) => ipcRenderer.invoke('window-resize', width, height),
  onLogout: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('tray-logout', listener);
    return () => ipcRenderer.removeListener('tray-logout', listener);
  },
  onNavigateToRoom: (handler) => {
    const listener = (_, roomId) => handler(roomId);
    ipcRenderer.on('navigate-to-room', listener);
    return () => ipcRenderer.removeListener('navigate-to-room', listener);
  },
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  setTitleBarTheme: (isDark) => ipcRenderer.invoke('set-title-bar-theme', { isDark }),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
  openUpdateDownload: (version?: string | null) => ipcRenderer.invoke('open-update-download', version ?? null),
  onUpdateDownloaded: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('update-downloaded', listener);
    return () => ipcRenderer.removeListener('update-downloaded', listener);
  },
  fetchUserAvatar: (userId, baseUrl, token) => ipcRenderer.invoke('fetch-user-avatar', { userId, baseUrl, token }),
});
