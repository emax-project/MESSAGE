const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  openSecondWindow: () => ipcRenderer.invoke('open-second-window'),
  openChatWindow: (roomId) => ipcRenderer.invoke('open-chat-window', roomId),
  openKanbanWindow: (roomId) => ipcRenderer.invoke('open-kanban-window', roomId),
  openGanttWindow: (roomId) => ipcRenderer.invoke('open-gantt-window', roomId),
  showNotification: (title, body) => ipcRenderer.invoke('show-notification', { title, body }),
  windowClose: () => ipcRenderer.invoke('window-close'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowResize: (width, height) => ipcRenderer.invoke('window-resize', width, height),
  onLogout: (handler) => {
    const listener = () => handler();
    ipcRenderer.on('tray-logout', listener);
    return () => ipcRenderer.removeListener('tray-logout', listener);
  },
});
