const { app, BrowserWindow, Menu, ipcMain, Notification, Tray } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV !== 'production' || !app.isPackaged;
const preloadPath = path.join(__dirname, 'preload.js');
const iconPath = path.join(__dirname, '../build/icons/icon.png');
let tray = null;

function getLoadURL() {
  if (isDev) return 'http://localhost:5173';
  return null;
}

function getLoadFile() {
  if (!isDev) return path.join(__dirname, '../dist/index.html');
  return null;
}

function createWindow(options = {}) {
  const win = new BrowserWindow({
    width: 420,
    height: 520,
    minWidth: 380,
    minHeight: 480,
    frame: false,
    titleBarStyle: 'hidden',
    // macOS: 창에 icon 지정 시 타이틀 바에 거대하게 표시되므로 제외. 도크 아이콘은 app.dock.setIcon으로만 설정.
    ...(process.platform !== 'darwin' ? { icon: iconPath } : {}),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: preloadPath,
    },
    ...options,
  });

  const url = getLoadURL();
  const file = getLoadFile();
  if (url) win.loadURL(url);
  if (file) win.loadFile(file);
  return win;
}

function openSecondWindow() {
  createWindow({
    width: 900,
    height: 650,
    secondWindow: true,
  });
}

function getBaseURL() {
  const url = getLoadURL();
  const file = getLoadFile();
  if (url) return url;
  if (file) return 'file://' + file.replace(/\\/g, '/');
  return 'http://localhost:5173';
}

function openChatWindow(roomId) {
  const base = getBaseURL();
  const chatUrl = (base.endsWith('/') ? base : base + '/') + 'chat/' + encodeURIComponent(roomId);
  const win = createWindow({
    width: 480,
    height: 680,
    minWidth: 400,
    minHeight: 500,
    secondWindow: true,
  });
  win.loadURL(chatUrl);
}

function openKanbanWindow(roomId) {
  const base = getBaseURL();
  const kanbanUrl = (base.endsWith('/') ? base : base + '/') + 'kanban/' + encodeURIComponent(roomId);
  const win = createWindow({
    width: 1100,
    height: 750,
    minWidth: 800,
    minHeight: 600,
    secondWindow: true,
  });
  win.loadURL(kanbanUrl);
}

function openGanttWindow(roomId) {
  const base = getBaseURL();
  const ganttUrl = (base.endsWith('/') ? base : base + '/') + 'gantt/' + encodeURIComponent(roomId);
  const win = createWindow({
    width: 1200,
    height: 700,
    minWidth: 900,
    minHeight: 550,
    secondWindow: true,
  });
  win.loadURL(ganttUrl);
}

function broadcastLogout() {
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('tray-logout');
  });
}

function createTray() {
  if (tray) return;
  tray = new Tray(iconPath);
  tray.setToolTip('EMAX');
  const menu = Menu.buildFromTemplate([
    {
      label: '로그아웃',
      click: () => broadcastLogout(),
    },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on('click', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.show();
      win.focus();
    }
  });
}

ipcMain.handle('open-second-window', () => {
  openSecondWindow();
});

ipcMain.handle('open-chat-window', (_, roomId) => {
  if (roomId) openChatWindow(roomId);
});

ipcMain.handle('open-kanban-window', (_, roomId) => {
  if (roomId) openKanbanWindow(roomId);
});

ipcMain.handle('open-gantt-window', (_, roomId) => {
  if (roomId) openGanttWindow(roomId);
});

ipcMain.handle('window-close', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});
ipcMain.handle('window-minimize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});
ipcMain.handle('window-maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) win.unmaximize();
    else win.maximize();
  }
});

ipcMain.handle('window-resize', (event, width, height) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && typeof width === 'number' && typeof height === 'number') {
    win.setSize(Math.round(width), Math.round(height));
  }
});

const notificationRefs = [];
ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const n = new Notification({ title, body });
    notificationRefs.push(n);
    n.on('close', () => {
      const i = notificationRefs.indexOf(n);
      if (i !== -1) notificationRefs.splice(i, 1);
    });
    n.show();
  }
});

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }
  createWindow();
  createTray();
  const menu = Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'fileMenu' },
    { role: 'editMenu' },
    {
      label: '테스트',
      submenu: [
        {
          label: '새 창 열기 (다른 계정으로 로그인)',
          click: openSecondWindow,
        },
      ],
    },
    { role: 'windowMenu' },
  ]);
  Menu.setApplicationMenu(menu);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
