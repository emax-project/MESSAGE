const { app, BrowserWindow, Menu, ipcMain, Tray, screen } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');

const NOTIF_WIDTH = 360;
const NOTIF_HEIGHT = 88;
const NOTIF_HEIGHT_PROGRESS = 116;
const NOTIF_DURATION_MS = 4500;

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function getNotificationHTML(title, body, progressPercent) {
  const t = escapeHtml(title);
  const b = escapeHtml(body);
  const showProgress = typeof progressPercent === 'number';
  const pct = showProgress ? Math.min(100, Math.max(0, progressPercent)) : 0;
  const progressBlock = showProgress
    ? `
    <div class="progress-wrap">
      <div class="progress-bar" style="width:${pct}%"></div>
    </div>
    <div class="progress-text">${Math.round(pct)}%</div>`
    : '';
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', sans-serif;
      background: transparent;
      overflow: hidden;
      width: ${NOTIF_WIDTH}px;
      height: ${showProgress ? NOTIF_HEIGHT_PROGRESS : NOTIF_HEIGHT}px;
    }
    .toast {
      width: 100%;
      height: 100%;
      background: linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.06);
      padding: 14px 18px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
    }
    .toast-brand {
      font-size: 11px;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.02em;
    }
    .toast-title {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
    }
    .toast-body {
      font-size: 13px;
      color: #64748b;
      line-height: 1.4;
    }
    .progress-wrap {
      height: 6px;
      background: rgba(0,0,0,0.08);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }
    .progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      border-radius: 3px;
      transition: width 0.2s ease;
    }
    .progress-text {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      margin-top: 2px;
    }
  </style>
</head>
<body>
  <div class="toast">
    <span class="toast-brand">EMAX</span>
    <div class="toast-title">${t}</div>
    <div class="toast-body">${b}</div>
    ${progressBlock}
  </div>
</body>
</html>`;
}

let customNotifWin = null;
let isUpdateProgressWindow = false;

function showCustomNotification(title, body, options) {
  const opts = options || {};
  const persistent = opts.persistent === true;
  const progress = opts.progress;
  const showProgressBar = typeof progress === 'number';

  if (customNotifWin && !customNotifWin.isDestroyed()) {
    customNotifWin.close();
    customNotifWin = null;
  }
  isUpdateProgressWindow = false;

  const notifHeight = showProgressBar ? NOTIF_HEIGHT_PROGRESS : NOTIF_HEIGHT;
  const primary = screen.getPrimaryDisplay();
  const { x, y, width: sw, height: sh } = primary.workArea;
  const px = x + sw - NOTIF_WIDTH - 24;
  const py = y + 20;

  const win = new BrowserWindow({
    width: NOTIF_WIDTH,
    height: notifHeight,
    x: px,
    y: py,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.setMenu(null);
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getNotificationHTML(title, body, progress)));
  win.once('ready-to-show', () => {
    win.show();
  });
  win.on('closed', () => {
    if (customNotifWin === win) {
      customNotifWin = null;
      isUpdateProgressWindow = false;
    }
  });

  customNotifWin = win;
  if (persistent && showProgressBar) isUpdateProgressWindow = true;

  if (!persistent) {
    setTimeout(() => {
      if (win && !win.isDestroyed()) win.close();
    }, NOTIF_DURATION_MS);
  }
}

function updateNotificationProgress(percent) {
  if (!customNotifWin || customNotifWin.isDestroyed() || !isUpdateProgressWindow) return;
  const pct = Math.min(100, Math.max(0, percent));
  const round = Math.round(pct);
  customNotifWin.webContents.executeJavaScript(
    '(function(){ var b=document.querySelector(".progress-bar"); var t=document.querySelector(".progress-text"); if(b)b.style.width="' + pct + '%"; if(t)t.textContent="' + round + '%"; })();'
  ).catch(() => {});
}
const { autoUpdater } = require('electron-updater');

let updaterBaseUrl = '';
try {
  const updaterConfig = require('./updater-config.generated.js');
  updaterBaseUrl = (updaterConfig && updaterConfig.baseUrl) || '';
} catch {
  // generated file may not exist before first build
}

// 패키징된 앱은 항상 빌드된 파일 로드. NODE_ENV 미설정 시에도 5173 로드되는 것 방지
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';
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
    width: 960,
    height: 700,
    minWidth: 780,
    minHeight: 560,
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

  if (process.argv.includes('--devtools')) {
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

ipcMain.handle('show-notification', (event, { title, body }) => {
  showCustomNotification(title || 'EMAX', body || '');
});

// #region agent log
const DEBUG_LOG = (location, message, data, hypothesisId) => {
  fetch('http://127.0.0.1:7244/ingest/b7631e9b-8e84-4b47-8cc8-d7cb99d830c8', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data: data || {}, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
};
// #endregion

function setupAutoUpdate() {
  // #region agent log
  DEBUG_LOG('main.js:setupAutoUpdate', 'setupAutoUpdate entered', { isDev, isPackaged: app.isPackaged, currentVersion: app.getVersion() }, 'H1');
  // #endregion
  if (isDev || !app.isPackaged) return;
  if (updaterBaseUrl) {
    autoUpdater.setFeedURL({ provider: 'generic', url: updaterBaseUrl });
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', (info) => {
    // #region agent log
    DEBUG_LOG('main.js:update-available', 'update-available fired', { version: info?.version, releaseDate: info?.releaseDate }, 'H5');
    // #endregion
    showCustomNotification('EMAX 업데이트', '새 버전을 다운로드 중입니다. 완료 후 앱을 재시작하면 적용됩니다.', { persistent: true, progress: 0 });
  });
  autoUpdater.on('download-progress', (progress) => {
    updateNotificationProgress(progress.percent);
  });
  autoUpdater.on('update-downloaded', () => {
    showCustomNotification('EMAX 업데이트 준비됨', '앱을 종료하면 새 버전이 적용됩니다.');
  });
  autoUpdater.on('error', (err) => {
    // #region agent log
    DEBUG_LOG('main.js:autoUpdater-error', 'autoUpdater error', { message: err?.message, code: err?.code }, 'H2');
    // #endregion
    console.error('Auto-updater error:', err);
  });
  // #region agent log
  DEBUG_LOG('main.js:checkForUpdates', 'calling checkForUpdates', {}, 'H1');
  // #endregion
  autoUpdater.checkForUpdates()
    .then((r) => {
      // #region agent log
      DEBUG_LOG('main.js:checkForUpdates-then', 'checkForUpdates resolved', {
        hasUpdateInfo: !!r?.updateInfo,
        updateVersion: r?.updateInfo?.version,
        currentVersion: app.getVersion(),
        noUpdate: r?.updateInfo == null,
      }, 'H3');
      // #endregion
    })
    .catch((err) => {
      // #region agent log
      DEBUG_LOG('main.js:checkForUpdates-catch', 'checkForUpdates failed', { message: err?.message, code: err?.code }, 'H2');
      // #endregion
      console.error('Update check failed:', err);
    });
}

app.whenReady().then(() => {
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.emax.message');
  }
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
              autoUpdater.checkForUpdates()
                .then((r) => {
                  const v = r?.updateInfo?.version;
                  const current = app.getVersion();
                  const body = v ? (v === current ? '이미 최신 버전입니다.' : `새 버전 ${v}이(가) 있습니다. 다운로드 후 앱을 재시작하면 적용됩니다.`) : '업데이트 정보를 확인했습니다.';
                  showCustomNotification('EMAX', body);
                })
                .catch((e) => {
                  console.error('Update check failed:', e);
                  showCustomNotification('EMAX', '업데이트 확인에 실패했습니다. 네트워크를 확인하거나 나중에 다시 시도해 주세요.');
                });
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
