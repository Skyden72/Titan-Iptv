// FIX: Convert from CommonJS (require) to ES modules (import) to resolve issues with Node.js type definitions.
// This modern syntax is better supported by TypeScript and Electron tooling.
import { app, BrowserWindow, shell, ipcMain, screen } from 'electron';
import path from 'node:path';
import os from 'node:os';
import squirrelStartup from 'electron-squirrel-startup';
import { fileURLToPath } from 'node:url';
import type { PlayerCommand } from '../shared/ipc.js';
import type { PlayerSurfaceBounds } from '../types/app.js';
import { createDatabase, resolveDatabasePath } from './storage/database.js';
import { createRepositories } from './storage/repositories.js';
import { registerHandlers } from './ipc/registerHandlers.js';
import { XtreamClient } from './xtream/client.js';
import { locateMpv } from './player/mpvLocator.js';
import { MpvAdapter } from './player/mpvAdapter.js';
import { PlayerService } from './player/playerService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (squirrelStartup) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let playerService: PlayerService | null = null;

function sendToWindow(window: BrowserWindow, channel: string, payload: unknown): void {
  if (window.isDestroyed() || window.webContents.isDestroyed()) return;
  try {
    window.webContents.send(channel, payload);
  } catch (error) {
    if (String(error).includes('Object has been destroyed')) return;
    throw error;
  }
}

function nativeWindowId(window: BrowserWindow): string {
  const handle = window.getNativeWindowHandle();
  return handle.length >= 8 ? handle.readBigUInt64LE(0).toString() : String(handle.readUInt32LE(0));
}

async function configurePlayerSurface(bounds: PlayerSurfaceBounds): Promise<PlayerSurfaceBounds | null> {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  if (!bounds.visible || bounds.width < 16 || bounds.height < 16) {
    return null;
  }

  return {
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(16, Math.round(bounds.width)),
    height: Math.max(16, Math.round(bounds.height)),
    visible: true,
    parentWindowId: nativeWindowId(mainWindow),
  };
}

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Titon IPTV Player',
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

  mainWindow.on('closed', () => {
    if (mainWindow === null) return;
    mainWindow = null;
  });

  return mainWindow;
};

app.whenReady().then(async () => {
  const dbPath = resolveDatabasePath(app.getPath('userData'));
  const db = createDatabase(dbPath);
  const repositories = createRepositories(db);
  const win = createWindow();
  const mpv = await locateMpv(app.getAppPath());
  const service = new PlayerService(
    new MpvAdapter(mpv.path),
    (state) => sendToWindow(win, 'player:state', state),
    configurePlayerSurface
  );
  playerService = service;

  registerHandlers({
    ipcMain,
    repositories,
    createXtreamClient: (credentials) => new XtreamClient(credentials),
    playerService: service,
    sendToRenderer: (channel, payload) => sendToWindow(win, channel, payload),
    setWindowFullscreen: (fullscreen) => {
      if (win.isDestroyed()) return false;
      win.setFullScreen(fullscreen);
      return fullscreen;
    },
    getCursorPosition: () => screen.getCursorScreenPoint(),
    diagnostics: () => {
      const snapshot = repositories.catalog.snapshot();
      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron,
        platform: `${os.platform()} ${os.release()}`,
        mpvAvailable: mpv.available,
        mpvPath: mpv.path,
        databasePath: dbPath,
        catalogCounts: {
          live: snapshot.liveChannels.length,
          movies: snapshot.movies.length,
          series: snapshot.series.length,
          epg: snapshot.epg.length,
        },
        recentErrors: mpv.available ? [] : [mpv.message],
      };
    },
  });
});

app.on('before-quit', () => {
  playerService?.dispose();
  playerService = null;
});

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
