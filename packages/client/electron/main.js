const { app, BrowserWindow, Menu, ipcMain, Tray, screen, shell } = require('electron');
const path = require('path');

// Windows: GPU 렌더링 문제로 검은 화면 발생 시 소프트웨어 렌더링 강제
if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-gpu-sandbox');
}

// 단일 인스턴스 잠금: 두 번 실행하면 기존 창을 포커스하고 종료
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

const NOTIF_WIDTH = 360;
const NOTIF_HEIGHT = 100;
const NOTIF_HEIGHT_PROGRESS = 128;
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

function getNotificationHTML(title, body, progressPercent, hasRoomId) {
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
  const clickHint = hasRoomId && !showProgress
    ? `<div class="toast-hint">클릭하여 채팅방으로 이동</div>`
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
      cursor: ${hasRoomId && !showProgress ? 'pointer' : 'default'};
    }
    .toast {
      width: 100%;
      height: 100%;
      background: linear-gradient(145deg, #ffffff 0%, #f5f5f5 100%);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08);
      border: 1px solid rgba(0,0,0,0.06);
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 3px;
      transition: background 0.15s;
    }
    .toast:hover {
      background: linear-gradient(145deg, #f0f4ff 0%, #e8eeff 100%);
      border-color: rgba(99,102,241,0.2);
    }
    .toast-brand {
      font-size: 11px;
      font-weight: 700;
      color: #6366f1;
      letter-spacing: 0.02em;
    }
    .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toast-body {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .toast-hint {
      font-size: 11px;
      color: #6366f1;
      margin-top: 2px;
      opacity: 0.8;
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
    ${clickHint}
    ${progressBlock}
  </div>
</body>
</html>`;
}

let customNotifWin = null;
let isUpdateProgressWindow = false;
let pendingNotifRoomId = null;

const notifPreloadPath = path.join(__dirname, 'notif-preload.js');

function showCustomNotification(title, body, options) {
  const opts = options || {};
  const persistent = opts.persistent === true;
  const progress = opts.progress;
  const showProgressBar = typeof progress === 'number';
  const roomId = opts.roomId || null;

  if (customNotifWin && !customNotifWin.isDestroyed()) {
    customNotifWin.close();
    customNotifWin = null;
  }
  isUpdateProgressWindow = false;
  pendingNotifRoomId = roomId;

  const notifHeight = showProgressBar ? NOTIF_HEIGHT_PROGRESS : NOTIF_HEIGHT;
  const primary = screen.getPrimaryDisplay();
  const { x, y, width: sw } = primary.workArea;
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
      preload: notifPreloadPath,
    },
  });

  win.setMenu(null);
  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(getNotificationHTML(title, body, progress, !!roomId)));
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
let mainWindow = null;

// 창별 show 핸들러 (Map으로 관리, win 객체에 프로퍼티 직접 부착보다 안전)
const windowReadyHandlers = new Map();

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
    width: 1250,
    height: 900,
    minWidth: 780,
    minHeight: 560,
    frame: false,
    titleBarStyle: 'hidden',
    show: false,
    // 흰 화면 플래시 방지 (특히 Windows 첫 실행)
    backgroundColor: '#0f172a',
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
    // loadFile()은 Electron이 ASAR 가상 경로, Windows 경로 구분자, file:// 변환을 직접 처리
    // pathToFileURL() 사용 시 ASAR 패키지 내 경로를 잘못 해석해 로드 실패 가능
    win.loadFile(file);
  }

  // 창 표시 로직:
  // 1순위: ready-to-show 이벤트 (Electron 공식 권장, 첫 페인트 완료 후 발생)
  // 2순위: app-ready IPC (React 마운트 완료 신호)
  // 3순위: 8초 절대 타임아웃
  let readyShown = false;
  const timers = [];
  const showWindow = () => {
    if (!readyShown && !win.isDestroyed()) {
      readyShown = true;
      timers.forEach((t) => clearTimeout(t));
      win.show();
    }
  };

  // 절대 타임아웃 (8초)
  timers.push(setTimeout(showWindow, 8000));

  // ready-to-show: 첫 번째 프레임이 실제로 그려진 후 발생 (Windows에서 가장 안정적)
  win.once('ready-to-show', showWindow);

  // windowReadyHandlers에 등록 (app-ready IPC 핸들러에서 사용)
  windowReadyHandlers.set(win.webContents.id, showWindow);
  win.on('closed', () => {
    windowReadyHandlers.delete(win.webContents.id);
  });

  // 렌더러 크래시 복구: 한 번만 자동 재로드
  let crashed = false;
  win.webContents.on('render-process-gone', (event, details) => {
    console.error('[window] render-process-gone:', details.reason);
    if (!crashed && details.reason !== 'clean-exit' && !win.isDestroyed()) {
      crashed = true;
      readyShown = false;
      const url2 = getLoadURL();
      const file2 = getLoadFile();
      if (url2) win.loadURL(url2);
      else if (file2) win.loadFile(file2);
    }
  });

  // F12로 DevTools 열기 (디버깅용)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' && input.type === 'keyDown') {
      win.webContents.toggleDevTools();
    }
  });

  if (process.argv.includes('--devtools')) {
    win.webContents.once('did-finish-load', () => win.webContents.openDevTools());
  }

  // 파일 로드 실패 시 화면에 오류 표시
  win.webContents.on('did-fail-load', (_, code, desc, validatedURL) => {
    console.error('did-fail-load', code, desc, validatedURL);
    if (code === -3) return; // 사용자 취소 (무시)
    showWindow();
    win.webContents.executeJavaScript(`
      document.body.innerHTML = '<div style="padding:40px;font-family:sans-serif;background:#fff;color:#1e293b;min-height:100vh;">'
        + '<h2 style="color:#dc2626">앱 로드 오류</h2>'
        + '<p>오류 코드: ' + ${JSON.stringify(String(code))} + '</p>'
        + '<p>설명: ' + ${JSON.stringify(String(desc))} + '</p>'
        + '<p>URL: ' + ${JSON.stringify(String(validatedURL))} + '</p>'
        + '<p style="margin-top:16px;color:#64748b">이 화면을 개발자에게 전달해 주세요.</p>'
        + '</div>';
    `).catch(() => {});
  });

  const isMainWindow = !options.secondWindow;
  win.isMainWindow = isMainWindow;
  if (isMainWindow) {
    mainWindow = win;
    win.on('close', (e) => {
      e.preventDefault();
      win.hide();
    });
    win.on('closed', () => {
      if (mainWindow === win) mainWindow = null;
    });
  }

  return win;
}

function openSecondWindow() {
  createWindow({
    width: 900,
    height: 650,
    secondWindow: true,
  });
}

function loadRoute(win, routePath) {
  const url = getLoadURL();
  const file = getLoadFile();
  if (url) {
    const base = url.endsWith('/') ? url : url + '/';
    win.loadURL(base + routePath.replace(/^\//, ''));
  } else if (file) {
    // loadFile의 두 번째 인자 hash로 HashRouter 경로 전달
    win.loadFile(file, { hash: routePath });
  }
}

function openChatWindow(roomId) {
  const win = createWindow({ width: 480, height: 680, minWidth: 400, minHeight: 500, secondWindow: true });
  loadRoute(win, '/chat/' + encodeURIComponent(roomId));
}

function openKanbanWindow(roomId) {
  const win = createWindow({ width: 1100, height: 750, minWidth: 800, minHeight: 600, secondWindow: true });
  loadRoute(win, '/kanban/' + encodeURIComponent(roomId));
}

function openGanttWindow(roomId) {
  const win = createWindow({ width: 1200, height: 700, minWidth: 900, minHeight: 550, secondWindow: true });
  loadRoute(win, '/gantt/' + encodeURIComponent(roomId));
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
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
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

ipcMain.on('app-ready', (event) => {
  const showFn = windowReadyHandlers.get(event.sender.id);
  if (showFn) showFn();
});

ipcMain.handle('show-notification', (_, { title, body, roomId }) => {
  showCustomNotification(title || 'EMAX', body || '', { roomId: roomId || null });
});

ipcMain.on('notification-clicked', () => {
  const roomId = pendingNotifRoomId;
  pendingNotifRoomId = null;
  if (customNotifWin && !customNotifWin.isDestroyed()) {
    customNotifWin.close();
    customNotifWin = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    if (roomId) {
      mainWindow.webContents.send('navigate-to-room', roomId);
    }
  }
});

ipcMain.handle('open-external', (_, url) => {
  if (url && typeof url === 'string') shell.openExternal(url);
});

function setupAutoUpdate() {
  if (isDev || !app.isPackaged) return;
  if (updaterBaseUrl) {
    autoUpdater.setFeedURL({ provider: 'generic', url: updaterBaseUrl });
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', () => {
    showCustomNotification('EMAX 업데이트', '새 버전을 다운로드 중입니다. 완료 후 앱을 재시작하면 적용됩니다.', { persistent: true, progress: 0 });
  });
  autoUpdater.on('download-progress', (progress) => {
    updateNotificationProgress(progress.percent);
  });
  autoUpdater.on('update-downloaded', () => {
    showCustomNotification('EMAX 업데이트 준비됨', '앱을 종료하면 새 버전이 적용됩니다.');
  });
  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });
  autoUpdater.checkForUpdates()
    .then(() => {
      // 업데이트 확인 완료 (별도 처리 불필요)
    })
    .catch((err) => {
      console.error('Update check failed:', err);
    });
}

app.on('second-instance', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

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
  // 메인 창은 닫기 시 hide되므로 destroy되지 않음. 앱은 트레이에서 계속 실행.
  // 사용자가 트레이 메뉴에서 '종료'를 선택할 때만 app.quit() 호출됨.
});

app.on('activate', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  } else if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
