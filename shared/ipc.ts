import type {
  AppSettings,
  CatalogSnapshot,
  DiagnosticSnapshot,
  Episode,
  Favourite,
  PlayerState,
  PlayerSurfaceBounds,
  PlaybackRequest,
  Profile,
  RefreshProgress,
  XtreamCredentials,
} from '../types/app.js';

export const ipcChannels = {
  appReady: 'app:ready',
  profilesConnect: 'profiles:connect',
  profilesDisconnect: 'profiles:disconnect',
  catalogGet: 'catalog:get',
  catalogRefresh: 'catalog:refresh',
  epgRefresh: 'epg:refresh',
  seriesEpisodes: 'series:episodes',
  favouritesToggle: 'favourites:toggle',
  progressSave: 'progress:save',
  playerStart: 'player:start',
  playerCommand: 'player:command',
  playerSurfaceSet: 'player:surface:set',
  playerState: 'player:state',
  windowFullscreenSet: 'window:fullscreen:set',
  windowFullscreenChanged: 'window:fullscreen:changed',
  windowCursorPositionGet: 'window:cursor-position:get',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  diagnosticsGet: 'diagnostics:get',
} as const;

export type PlayerCommand =
  | { type: 'playPause' }
  | { type: 'stop' }
  | { type: 'seek'; seconds: number; mode: 'absolute' | 'relative' }
  | { type: 'setVolume'; volume: number }
  | { type: 'mute'; muted: boolean }
  | { type: 'fullscreen'; fullscreen: boolean }
  | { type: 'selectAudioTrack'; id: number }
  | { type: 'selectSubtitleTrack'; id: number | null }
  | { type: 'previous' }
  | { type: 'next' };

export interface TitonBridge {
  appReady(): Promise<CatalogSnapshot>;
  connectProfile(input: { name: string; credentials: XtreamCredentials }): Promise<Profile>;
  disconnectProfile(): Promise<void>;
  getCatalog(): Promise<CatalogSnapshot>;
  refreshCatalog(): Promise<void>;
  refreshEpg(): Promise<void>;
  getSeriesEpisodes(seriesId: string): Promise<Episode[]>;
  toggleFavourite(input: Favourite): Promise<Favourite[]>;
  startPlayback(input: PlaybackRequest): Promise<PlayerState>;
  sendPlayerCommand(command: PlayerCommand): Promise<PlayerState>;
  setPlayerSurface(bounds: PlayerSurfaceBounds): Promise<void>;
  setWindowFullscreen(fullscreen: boolean): Promise<boolean>;
  onWindowFullscreenChanged(callback: (fullscreen: boolean) => void): () => void;
  getCursorPosition(): Promise<{ x: number; y: number }>;
  getSettings(): Promise<AppSettings>;
  saveSettings(settings: AppSettings): Promise<AppSettings>;
  getDiagnostics(): Promise<DiagnosticSnapshot>;
  onRefreshProgress(callback: (progress: RefreshProgress) => void): () => void;
  onPlayerState(callback: (state: PlayerState) => void): () => void;
}

export type InvokeMap = {
  [ipcChannels.appReady]: { request: void; response: CatalogSnapshot };
  [ipcChannels.profilesConnect]: { request: { name: string; credentials: XtreamCredentials }; response: Profile };
  [ipcChannels.profilesDisconnect]: { request: void; response: void };
  [ipcChannels.catalogGet]: { request: void; response: CatalogSnapshot };
  [ipcChannels.catalogRefresh]: { request: void; response: void };
  [ipcChannels.epgRefresh]: { request: void; response: void };
  [ipcChannels.seriesEpisodes]: { request: string; response: Episode[] };
  [ipcChannels.favouritesToggle]: { request: Favourite; response: Favourite[] };
  [ipcChannels.playerStart]: { request: PlaybackRequest; response: PlayerState };
  [ipcChannels.playerCommand]: { request: PlayerCommand; response: PlayerState };
  [ipcChannels.playerSurfaceSet]: { request: PlayerSurfaceBounds; response: void };
  [ipcChannels.windowFullscreenSet]: { request: boolean; response: boolean };
  [ipcChannels.windowCursorPositionGet]: { request: void; response: { x: number; y: number } };
  [ipcChannels.settingsGet]: { request: void; response: AppSettings };
  [ipcChannels.settingsSave]: { request: AppSettings; response: AppSettings };
  [ipcChannels.diagnosticsGet]: { request: void; response: DiagnosticSnapshot };
};
