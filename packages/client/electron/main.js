const { app, BrowserWindow, Menu, ipcMain, Notification, Tray } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');

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
  if (url) {
    win.loadURL(url);
  } else if (file) {
    // Windows 등에서 file:// URL을 명시적으로 사용 (pathToFileURL로 정규화)
    win.loadURL(pathToFileURL(file).href);
  }

  if (process.argv.includes('--debug')) {
    win.webContents.once('did-finish-load', () => win.webContents.openDevTools());
  }
  win.webContents.on('did-fail-load', (_, code, desc, url) => {
    console.error('did-fail-load', code, desc, url);
  });

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
  if (file) return pathToFileURL(file).href;
  return 'http://localhost:5173';
}

function getRouteURL(routePath) {
  const base = getBaseURL();
  if (base.startsWith('file:')) {
    return base.split('#')[0] + '#' + routePath;
  }
  return (base.endsWith('/') ? base : base + '/') + routePath.replace(/^\//, '');
}

function openChatWindow(roomId) {
  const chatUrl = getRouteURL('/chat/' + encodeURIComponent(roomId));
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
  const kanbanUrl = getRouteURL('/kanban/' + encodeURIComponent(roomId));
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
  const ganttUrl = getRouteURL('/gantt/' + encodeURIComponent(roomId));
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

function setupAutoUpdate() {
  if (isDev || !app.isPackaged) return;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', () => {
    if (Notification.isSupported()) {
      const n = new Notification({
        title: 'EMAX 업데이트',
        body: '새 버전을 다운로드 중입니다. 완료 후 앱을 재시작하면 적용됩니다.',
      });
      n.show();
    }
  });
  autoUpdater.on('update-downloaded', () => {
    if (Notification.isSupported()) {
      const n = new Notification({
        title: 'EMAX 업데이트 준비됨',
        body: '앱을 종료하면 새 버전이 적용됩니다.',
      });
      n.show();
    }
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
  autoUpdater.checkForUpdates().catch((err) => console.error('Update check failed:', err));
}

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock) {
    app.dock.setIcon(iconPath);
  }
  createWindow();
  createTray();
  setupAutoUpdate();
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
    {
      label: '도움말',
      submenu: [
        {
          label: '업데이트 확인',
          click: () => {
            if (!isDev && app.isPackaged) {
              autoUpdater.checkForUpdates().then((r) => {
                if (r?.updateInfo?.version && Notification.isSupported()) {
                  new Notification({
                    title: 'EMAX',
                    body: r.updateInfo.version === app.getVersion() ? '이미 최신 버전입니다.' : '업데이트 확인 중입니다.',
                  }).show();
                }
              }).catch((e) => console.error(e));
            }
          },
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
