'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, Notification } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');

const APP_NAME = 'Darsnameh';
const DATA_FILE = 'darsnameh-data.json';

let mainWindow = null;

app.setName(APP_NAME);

// Optional data directory override (useful for tests and portable setups).
if (process.env.DARSNAMEH_DATA_DIR) {
  app.setPath('userData', process.env.DARSNAMEH_DATA_DIR);
}

function dataPath() {
  return path.join(app.getPath('userData'), DATA_FILE);
}

async function ensureDataFile() {
  const file = dataPath();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify({}, null, 2), 'utf8');
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, 'assets', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    backgroundColor: '#080b16',
    show: false,
    frame: false,
    title: 'درس‌نامه',
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.setMenu(null);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      if (/^https?:/i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await ensureDataFile();
    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}

/* ---------------------------- IPC: window chrome -------------------------- */

ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:toggleMaximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:isMaximized', () => Boolean(mainWindow?.isMaximized()));

/* ------------------------------- IPC: data ------------------------------- */

ipcMain.handle('data:load', async () => {
  try {
    const raw = await fs.readFile(dataPath(), 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('load data failed:', error);
    return {};
  }
});

ipcMain.handle('data:save', async (_event, data) => {
  try {
    const file = dataPath();
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmp, file);
    return { ok: true };
  } catch (error) {
    console.error('save data failed:', error);
    return { ok: false, error: String(error) };
  }
});

ipcMain.handle('data:export', async (_event, json) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'ذخیره نسخه پشتیبان',
    defaultPath: `darsnameh-backup-${new Date().toISOString().slice(0, 10)}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePath) return { ok: false, canceled: true };
  await fs.writeFile(result.filePath, json, 'utf8');
  return { ok: true, filePath: result.filePath };
});

ipcMain.handle('data:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'بازیابی از نسخه پشتیبان',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  });
  if (result.canceled || !result.filePaths[0]) return { ok: false, canceled: true };
  const text = await fs.readFile(result.filePaths[0], 'utf8');
  return { ok: true, data: text, filePath: result.filePaths[0] };
});

ipcMain.handle('data:openFolder', async () => {
  await shell.openPath(app.getPath('userData'));
  return { ok: true, path: app.getPath('userData') };
});

ipcMain.handle('app:info', () => ({
  version: app.getVersion(),
  platform: process.platform,
  dataPath: dataPath(),
  electron: process.versions.electron
}));

ipcMain.handle('app:notify', (_event, { title, body }) => {
  if (!Notification.isSupported()) return { ok: false };
  const notification = new Notification({
    title: title || 'درس‌نامه',
    body: body || '',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    silent: false
  });
  notification.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
  notification.show();
  return { ok: true };
});
