const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:3000';

/** @type {BrowserWindow | null} */
let mainWindow = null;

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

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
