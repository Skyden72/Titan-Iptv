// FIX: Convert from CommonJS (require) to ES modules (import) to resolve issues with Node.js type definitions.
// This modern syntax is better supported by TypeScript and Electron tooling.
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import squirrelStartup from 'electron-squirrel-startup';
import { fileURLToPath } from 'node:url';
import type { PlayerCommand } from '../shared/ipc.js';
import type { PlaybackRequest, PlayerState } from '../types/app.js';
import { createDatabase, resolveDatabasePath } from './storage/database.js';
import { createRepositories } from './storage/repositories.js';
import { registerHandlers } from './ipc/registerHandlers.js';
import { XtreamClient } from './xtream/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (squirrelStartup) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const idlePlayerState: PlayerState = {
  status: 'idle',
  positionSeconds: 0,
  volume: 100,
  muted: false,
  fullscreen: false,
  audioTracks: [],
  subtitleTracks: [],
};

function createPlaceholderPlayerService() {
  let state = idlePlayerState;
  return {
    async start(request: PlaybackRequest) {
      state = {
        ...state,
        status: 'failed',
        title: request.title,
        itemId: request.itemId,
        error: 'Native mpv playback is not wired yet.',
      };
      return state;
    },
    async command(_command: PlayerCommand) {
      return state;
    },
    state() {
      return state;
    },
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
      preload: path.join(__dirname, 'preload.js'),
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

  return mainWindow;
};

app.whenReady().then(() => {
  const dbPath = resolveDatabasePath(app.getPath('userData'));
  const db = createDatabase(dbPath);
  const repositories = createRepositories(db);
  const win = createWindow();
  const playerService = createPlaceholderPlayerService();

  registerHandlers({
    ipcMain,
    repositories,
    createXtreamClient: (credentials) => new XtreamClient(credentials),
    playerService,
    sendToRenderer: (channel, payload) => win.webContents.send(channel, payload),
    diagnostics: () => {
      const snapshot = repositories.catalog.snapshot();
      return {
        appVersion: app.getVersion(),
        electronVersion: process.versions.electron,
        platform: `${os.platform()} ${os.release()}`,
        mpvAvailable: false,
        databasePath: dbPath,
        catalogCounts: {
          live: snapshot.liveChannels.length,
          movies: snapshot.movies.length,
          series: snapshot.series.length,
          epg: snapshot.epg.length,
        },
        recentErrors: ['Native mpv playback is not wired yet.'],
      };
    },
  });
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
