// FIX: Convert from CommonJS (require) to ES modules (import) to resolve issues with Node.js type definitions.
// This modern syntax is better supported by TypeScript and Electron tooling.
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'path';
import os from 'os';
// FIX: Import Buffer explicitly to ensure it is available in the ES module scope, resolving the 'Cannot find name Buffer' error.
import { Buffer } from 'buffer';
import squirrelStartup from 'electron-squirrel-startup';
import { fetch as undiciFetch } from 'undici';
import { fileURLToPath } from 'url';

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


if (squirrelStartup) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 940,
    minHeight: 560,
    backgroundColor: '#111827',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Zenith IPTV Player',
    icon: path.join(__dirname, '../build/icon.png'),
  });

  const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (viteDevServerUrl) {
    mainWindow.loadURL(viteDevServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
};

ipcMain.handle('net:request', async (_evt, req) => {
  try {
    const res = await undiciFetch(req.url, {
      method: req.method || 'GET',
      headers: req.headers,
      body: req.body,
      signal: AbortSignal.timeout(req.timeoutMs ?? 15000)
    });

    const buf = Buffer.from(await res.arrayBuffer());
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => headers[k] = v);

    return {
      ok: res.ok,
      status: res.status,
      headers,
      bodyBase64: buf.toString('base64')
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(`[undici-fetch] Request error for ${req.url}:`, error);
    return {
      ok: false,
      status: 0,
      error
    };
  }
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (os.platform() !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
