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

/* ----------------------------- IPC: AI proxy ----------------------------- */

const AI_TIMEOUT_MS = 90000;
const AI_MAX_CONTENT = 24000;

function chatCompletionsUrl(baseUrl) {
  const raw = String(baseUrl || '').trim();
  if (!raw) throw new Error('آدرس سرویس (Base URL) خالی است.');
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('آدرس سرویس معتبر نیست. نمونه: https://api.openai.com/v1');
  }
  if (!/^https?:$/i.test(url.protocol)) {
    throw new Error('آدرس سرویس باید با http یا https شروع شود.');
  }
  let path = url.pathname.replace(/\/+$/, '');
  if (/\/chat\/completions$/i.test(path)) {
    url.pathname = path;
    url.hash = '';
    return url.toString();
  }
  if (!path) path = '/v1/chat/completions';
  else path = `${path}/chat/completions`;
  url.pathname = path;
  url.hash = '';
  return url.toString();
}

function aiStatusMessage(status) {
  if (status === 400 || status === 422) return 'سرویس درخواست را نپذیرفت. آدرس، نام مدل و تنظیمات را بررسی کن.';
  if (status === 401 || status === 403) return 'کلید API نامعتبر است یا اجازهٔ دسترسی ندارد.';
  if (status === 404) return 'آدرس سرویس یا نام مدل پیدا نشد.';
  if (status === 429) return 'سرویس هوش مصنوعی فعلاً محدودیت درخواست دارد. کمی بعد دوباره تلاش کن.';
  if (status >= 500) return 'سرویس هوش مصنوعی موقتاً در دسترس نیست.';
  return 'درخواست به سرویس هوش مصنوعی ناموفق بود.';
}

async function requestCompletion(url, apiKey, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://darsnameh.app',
        'X-Title': 'Darsnameh'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* keep raw text */ }
    return { ok: response.ok, status: response.status, data, text };
  } catch (error) {
    const timeout = error?.name === 'AbortError';
    return {
      ok: false,
      status: 0,
      error: timeout
        ? 'زمان انتظار برای پاسخ سرویس تمام شد.'
        : 'اتصال به سرویس هوش مصنوعی برقرار نشد. اینترنت و آدرس سرویس را بررسی کن.'
    };
  } finally {
    clearTimeout(timer);
  }
}

function extractAiContent(data) {
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      if (typeof part?.text === 'string') return part.text;
      return '';
    }).join('');
  }
  if (typeof choice?.text === 'string') return choice.text;
  return '';
}

async function callAi(payload = {}) {
  const baseUrl = String(payload.baseUrl || '').trim();
  const apiKey = String(payload.apiKey || '').trim();
  const model = String(payload.model || '').trim();
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (!apiKey) return { ok: false, status: 0, error: 'کلید API را وارد کن.' };
  if (!model) return { ok: false, status: 0, error: 'نام مدل را وارد کن.' };
  if (!messages.length) return { ok: false, status: 0, error: 'پیامی برای ارسال وجود ندارد.' };

  const safeMessages = messages
    .filter((m) => m && (m.role === 'system' || m.role === 'user' || m.role === 'assistant'))
    .slice(-30)
    .map((m) => ({ role: m.role, content: String(m.content || '').slice(0, 20000) }));

  let url;
  try {
    url = chatCompletionsUrl(baseUrl);
  } catch (error) {
    return { ok: false, status: 0, error: error.message };
  }

  const body = {
    model,
    messages: safeMessages,
    temperature: Number.isFinite(Number(payload.temperature)) ? Number(payload.temperature) : 0.35,
    max_tokens: Number.isFinite(Number(payload.maxTokens)) ? Number(payload.maxTokens) : 1800
  };

  let result = await requestCompletion(url, apiKey, body);

  // Some OpenAI-compatible providers reject sampling fields. Retry with a minimal body.
  if (!result.ok && (result.status === 400 || result.status === 422)) {
    const retry = await requestCompletion(url, apiKey, { model, messages: safeMessages });
    if (retry.ok || retry.status !== 400) result = retry;
  }

  if (!result.ok) {
    const detail = result.data?.error?.message
      || result.data?.message
      || (result.text ? String(result.text).slice(0, 500) : '')
      || result.error
      || '';
    return {
      ok: false,
      status: result.status || 0,
      error: result.error || aiStatusMessage(result.status),
      detail
    };
  }

  const content = extractAiContent(result.data).trim();
  if (!content) {
    return {
      ok: false,
      status: result.status,
      error: 'پاسخ سرویس خالی بود. نام مدل و آدرس سرویس را بررسی کن.',
      detail: result.text ? String(result.text).slice(0, 500) : ''
    };
  }

  return {
    ok: true,
    content: content.slice(0, AI_MAX_CONTENT),
    model: result.data?.model || model,
    usage: result.data?.usage || null
  };
}

ipcMain.handle('ai:chat', async (_event, payload) => {
  try {
    return await callAi(payload);
  } catch (error) {
    console.error('ai chat failed:', error);
    return { ok: false, status: 0, error: 'خطای داخلی در ارتباط با سرویس هوش مصنوعی رخ داد.' };
  }
});

ipcMain.handle('ai:test', async (_event, payload) => {
  try {
    return await callAi({
      ...payload,
      messages: [
        { role: 'system', content: 'You are a connection test. Reply briefly.' },
        { role: 'user', content: 'فقط بنویس: آماده‌ام' }
      ],
      temperature: 0,
      maxTokens: 128
    });
  } catch (error) {
    console.error('ai test failed:', error);
    return { ok: false, status: 0, error: 'آزمایش اتصال ناموفق بود.' };
  }
});

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
