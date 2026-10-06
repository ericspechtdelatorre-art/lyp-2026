const { app, BrowserWindow, shell, session, systemPreferences } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:3000';

/** @type {BrowserWindow | null} */
let mainWindow = null;

function allowMediaPermissions() {
  const sess = session.defaultSession;

  // Allow camera / microphone for getUserMedia
  sess.setPermissionRequestHandler((_webContents, permission, callback, details) => {
    const allowed = new Set([
      'media',
      'mediaKeySystem',
      'display-capture',
      'fullscreen',
      'clipboard-sanitized-write',
    ]);
    if (allowed.has(permission)) {
      callback(true);
      return;
    }
    // Chromium may send media with details.mediaTypes
    if (permission === 'media' || details?.mediaTypes?.length) {
      callback(true);
      return;
    }
    callback(false);
  });

  sess.setPermissionCheckHandler((_webContents, permission, _requestingOrigin, details) => {
    if (permission === 'media' || details?.mediaType === 'video' || details?.mediaType === 'audio') {
      return true;
    }
    return permission === 'fullscreen' || permission === 'clipboard-sanitized-write';
  });

  // Electron 28+ device permission API (webcam / mic)
  if (typeof sess.setDevicePermissionHandler === 'function') {
    sess.setDevicePermissionHandler((details) => {
      return details.deviceType === 'camera' || details.deviceType === 'microphone';
    });
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'IKEALang IDE | KALLAX Studio',
    backgroundColor: '#1e1e1e',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      nativeWindowOpen: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const u = url || 'about:blank';
    const isInterpreterPopup =
      u === 'about:blank' ||
      u.startsWith('about:blank') ||
      u.startsWith('http://127.0.0.1:') ||
      u.startsWith('http://localhost:') ||
      (isDev && u.startsWith(DEV_URL));

    if (isInterpreterPopup) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 1000,
          height: 750,
          minWidth: 640,
          minHeight: 480,
          backgroundColor: '#1e1e1e',
          autoHideMenuBar: true,
          title: 'IKEALang — Intérprete',
          webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            nativeWindowOpen: true,
          },
        },
      };
    }

    if (u.startsWith('http://') || u.startsWith('https://')) {
      shell.openExternal(u);
    }
    return { action: 'deny' };
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  allowMediaPermissions();

  // macOS: ask for camera entitlement if needed
  if (process.platform === 'darwin' && systemPreferences?.askForMediaAccess) {
    try {
      await systemPreferences.askForMediaAccess('camera');
    } catch {
      /* ignore */
    }
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
