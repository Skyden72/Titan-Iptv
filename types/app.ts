export type ProfileId = string;
export type MediaKind = 'live' | 'movie' | 'series' | 'episode';
export type PlayerStatus = 'idle' | 'connecting' | 'buffering' | 'playing' | 'paused' | 'stalled' | 'ended' | 'failed';

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface Profile {
  id: ProfileId;
  name: string;
  serverUrl: string;
  username: string;
  createdAt: string;
  updatedAt: string;
  lastRefreshAt?: string;
  accountStatus?: string;
}

export interface Category {
  id: string;
  kind: 'live' | 'movie' | 'series';
  name: string;
  sortOrder: number;
}

export interface LiveChannel {
  id: string;
  categoryId: string;
  name: string;
  logoUrl?: string;
  streamId: number;
  streamUrl: string;
  epgChannelId?: string;
  sortOrder: number;
}

export interface VodMovie {
  id: string;
  categoryId: string;
  title: string;
  posterUrl?: string;
  streamId: number;
  streamUrl: string;
  containerExtension: string;
  rating?: string;
  releaseYear?: string;
  plot?: string;
  durationSeconds?: number;
}

export interface Series {
  id: string;
  categoryId: string;
  title: string;
  posterUrl?: string;
  seriesId: number;
  rating?: string;
  releaseYear?: string;
  plot?: string;
}

export interface Episode {
  id: string;
  seriesId: string;
  seasonNumber: number;
  episodeNumber: number;
  title: string;
  streamId: number;
  streamUrl: string;
  containerExtension: string;
  durationSeconds?: number;
  plot?: string;
}

export interface EpgProgramme {
  id: string;
  channelId: string;
  startAt: string;
  endAt: string;
  title: string;
  description?: string;
}

export interface Favourite {
  kind: MediaKind;
  itemId: string;
  createdAt: string;
}

export interface WatchProgress {
  kind: 'movie' | 'episode';
  itemId: string;
  positionSeconds: number;
  durationSeconds?: number;
  updatedAt: string;
}

export interface PlaybackRequest {
  kind: 'live' | 'movie' | 'episode';
  itemId: string;
  title: string;
  streamUrl: string;
  playlistItemIds?: string[];
}

export interface TrackInfo {
  id: number;
  type: 'audio' | 'sub';
  title?: string;
  lang?: string;
  selected: boolean;
}

export interface PlayerState {
  status: PlayerStatus;
  title?: string;
  itemId?: string;
  positionSeconds: number;
  durationSeconds?: number;
  volume: number;
  muted: boolean;
  fullscreen: boolean;
  audioTracks: TrackInfo[];
  subtitleTracks: TrackInfo[];
  videoParams?: {
    width?: number;
    height?: number;
    codec?: string;
    fps?: number;
  };
  audioParams?: {
    codec?: string;
    channels?: string;
    samplerate?: number;
  };
  error?: string;
}

export interface AppSettings {
  hardwareAcceleration: boolean;
  preferredAudioOutput?: string;
  subtitlesEnabled: boolean;
  cacheTtlHours: number;
  mpvPath?: string;
}

export interface CatalogSnapshot {
  profile: Profile | null;
  liveCategories: Category[];
  movieCategories: Category[];
  seriesCategories: Category[];
  liveChannels: LiveChannel[];
  movies: VodMovie[];
  series: Series[];
  episodes: Episode[];
  epg: EpgProgramme[];
  favourites: Favourite[];
  progress: WatchProgress[];
  settings: AppSettings;
}

export interface RefreshProgress {
  phase: 'auth' | 'categories' | 'live' | 'movies' | 'series' | 'epg' | 'saving' | 'complete';
  message: string;
  completed: number;
  total: number;
}

export interface DiagnosticSnapshot {
  appVersion: string;
  electronVersion: string;
  platform: string;
  mpvAvailable: boolean;
  mpvPath?: string;
  databasePath: string;
  catalogCounts: Record<string, number>;
  recentErrors: string[];
}
