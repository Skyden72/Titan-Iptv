import type {
  AppSettings,
  CatalogSnapshot,
  DiagnosticSnapshot,
  Episode,
  Favourite,
  PlayerState,
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
  seriesEpisodes: 'series:episodes',
  favouritesToggle: 'favourites:toggle',
  progressSave: 'progress:save',
  playerStart: 'player:start',
  playerCommand: 'player:command',
  playerState: 'player:state',
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
  getSeriesEpisodes(seriesId: string): Promise<Episode[]>;
  toggleFavourite(input: Favourite): Promise<Favourite[]>;
  startPlayback(input: PlaybackRequest): Promise<PlayerState>;
  sendPlayerCommand(command: PlayerCommand): Promise<PlayerState>;
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
  [ipcChannels.seriesEpisodes]: { request: string; response: Episode[] };
  [ipcChannels.favouritesToggle]: { request: Favourite; response: Favourite[] };
  [ipcChannels.playerStart]: { request: PlaybackRequest; response: PlayerState };
  [ipcChannels.playerCommand]: { request: PlayerCommand; response: PlayerState };
  [ipcChannels.settingsGet]: { request: void; response: AppSettings };
  [ipcChannels.settingsSave]: { request: AppSettings; response: AppSettings };
  [ipcChannels.diagnosticsGet]: { request: void; response: DiagnosticSnapshot };
};
