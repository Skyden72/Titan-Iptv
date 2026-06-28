import { contextBridge, ipcRenderer } from 'electron';
import type { PlayerCommand, TitonBridge } from '../shared/ipc.js';
import type {
  AppSettings,
  Favourite,
  PlaybackRequest,
  RefreshProgress,
  PlayerState,
  XtreamCredentials,
} from '../types/app.js';

const ipcChannels = {
  appReady: 'app:ready',
  profilesConnect: 'profiles:connect',
  profilesDisconnect: 'profiles:disconnect',
  catalogGet: 'catalog:get',
  catalogRefresh: 'catalog:refresh',
  epgRefresh: 'epg:refresh',
  seriesEpisodes: 'series:episodes',
  favouritesToggle: 'favourites:toggle',
  playerStart: 'player:start',
  playerCommand: 'player:command',
  playerSurfaceSet: 'player:surface:set',
  playerState: 'player:state',
  windowFullscreenSet: 'window:fullscreen:set',
  windowCursorPositionGet: 'window:cursor-position:get',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  diagnosticsGet: 'diagnostics:get',
} as const;

const bridge: TitonBridge = {
  appReady: () => ipcRenderer.invoke(ipcChannels.appReady),
  connectProfile: (input: { name: string; credentials: XtreamCredentials }) =>
    ipcRenderer.invoke(ipcChannels.profilesConnect, input),
  disconnectProfile: () => ipcRenderer.invoke(ipcChannels.profilesDisconnect),
  getCatalog: () => ipcRenderer.invoke(ipcChannels.catalogGet),
  refreshCatalog: () => ipcRenderer.invoke(ipcChannels.catalogRefresh),
  refreshEpg: () => ipcRenderer.invoke(ipcChannels.epgRefresh),
  getSeriesEpisodes: (seriesId: string) => ipcRenderer.invoke(ipcChannels.seriesEpisodes, seriesId),
  toggleFavourite: (input: Favourite) => ipcRenderer.invoke(ipcChannels.favouritesToggle, input),
  startPlayback: (input: PlaybackRequest) => ipcRenderer.invoke(ipcChannels.playerStart, input),
  sendPlayerCommand: (command: PlayerCommand) => ipcRenderer.invoke(ipcChannels.playerCommand, command),
  setPlayerSurface: (bounds) => ipcRenderer.invoke(ipcChannels.playerSurfaceSet, bounds),
  setWindowFullscreen: (fullscreen: boolean) => ipcRenderer.invoke(ipcChannels.windowFullscreenSet, fullscreen),
  getCursorPosition: () => ipcRenderer.invoke(ipcChannels.windowCursorPositionGet),
  getSettings: () => ipcRenderer.invoke(ipcChannels.settingsGet),
  saveSettings: (settings: AppSettings) => ipcRenderer.invoke(ipcChannels.settingsSave, settings),
  getDiagnostics: () => ipcRenderer.invoke(ipcChannels.diagnosticsGet),
  onRefreshProgress: (callback: (progress: RefreshProgress) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: RefreshProgress) => callback(progress);
    ipcRenderer.on(ipcChannels.catalogRefresh, listener);
    return () => ipcRenderer.off(ipcChannels.catalogRefresh, listener);
  },
  onPlayerState: (callback: (state: PlayerState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: PlayerState) => callback(state);
    ipcRenderer.on(ipcChannels.playerState, listener);
    return () => ipcRenderer.off(ipcChannels.playerState, listener);
  },
};

contextBridge.exposeInMainWorld('titon', bridge);
