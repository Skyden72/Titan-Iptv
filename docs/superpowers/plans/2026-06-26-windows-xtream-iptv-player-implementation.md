# Windows Xtream IPTV Player Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first complete Windows desktop Xtream Codes IPTV app with Live TV, Movies/VOD, Series, EPG, Favourites, local desktop storage, mpv-first native playback, custom controls, and repeatable Windows packaging.

**Architecture:** Keep React as the renderer and Electron as the secure desktop boundary. Put all provider calls, local storage, credential handling, mpv process control, and packaging-sensitive behavior in the main process behind typed IPC contracts. Keep Xtream normalization and the mpv adapter independent of the UI so playback can preserve 2160p and 5.1-capable streams without browser playback constraints.

**Tech Stack:** Electron, React, Vite, TypeScript, Zustand, Vitest, better-sqlite3, fast-xml-parser, mpv via JSON IPC, electron-builder, Windows PowerShell verification.

---

## File Structure

- Modify `package.json`: add build scripts for renderer/main/preload, test scripts, packaging scripts, runtime dependencies, and mpv asset handling.
- Modify `package-lock.json`: regenerate after package changes; keep it committed once it matches `package.json`.
- Modify `tsconfig.json`: make it renderer-only or split it into project references.
- Create `tsconfig.renderer.json`: renderer typecheck with `noEmit`.
- Create `tsconfig.electron.json`: Electron main/preload compile target that emits `dist-electron`.
- Modify `vite.config.ts`: renderer-only Vite output, dev server environment, and safe production config.
- Modify `index.html`: remove CDN import map and remote Tailwind script; use bundled app assets only.
- Create `src/` folders over the current root-level renderer files, or keep current root files and create focused domain folders. For this repo, keep root entry files for the first pass and add focused folders to limit churn.
- Create `shared/ipc.ts`: typed IPC channel names, request/response contracts, and redaction-safe DTOs shared by main, preload, and renderer.
- Modify `electron/main.ts`: window creation, IPC registration, app lifecycle, storage bootstrapping, provider refresh calls, player lifecycle, and safe diagnostics.
- Modify `electron/preload.ts`: expose a single typed `window.titon` bridge instead of ad hoc `electronNet`.
- Create `electron/ipc/registerHandlers.ts`: register provider, storage, player, settings, diagnostics, and app handlers.
- Create `electron/storage/database.ts`: create and migrate the local SQLite database under Electron `app.getPath('userData')`.
- Create `electron/storage/repositories.ts`: profiles, catalog, EPG, favourites, progress, settings, and history operations.
- Create `electron/xtream/client.ts`: Xtream `player_api.php` and XMLTV fetching with credentials kept out of logs.
- Create `electron/xtream/urls.ts`: stream URL construction for live, movie, and episode playback.
- Create `electron/xtream/normalize.ts`: convert raw Xtream responses into app models.
- Create `electron/xtream/epg.ts`: XMLTV parsing and programme normalization.
- Create `electron/player/playerTypes.ts`: stable player engine interface and state events.
- Create `electron/player/mpvAdapter.ts`: spawn mpv, send JSON IPC commands, receive property/state events, and expose track/seek/volume/fullscreen controls.
- Create `electron/player/mpvLocator.ts`: find bundled mpv first, then PATH-installed mpv, then return actionable diagnostics.
- Create `electron/player/playerService.ts`: one active player session, playlist context, channel up/down, and safe shutdown.
- Create `types/app.ts`: app domain types used by renderer and IPC DTOs.
- Modify `types.ts`: either re-export `types/app.ts` or shrink it to compatibility exports during the migration.
- Modify `store/useAppStore.ts`: remove browser localStorage persistence and use IPC-backed app state.
- Create `store/playerStore.ts`: playback state, track lists, controls overlay state, and keyboard intent helpers.
- Modify `components/ConnectWizard.tsx`: Xtream-only profile form, connection test, profile save, and sanitized errors.
- Modify `components/AppLayout.tsx`: persistent app shell with navigation, refresh status, global search entry, and settings access.
- Modify `components/TopNav.tsx`: navigation for Live TV, Movies, Series, EPG, Favourites, Settings, and Diagnostics.
- Replace `components/Player.tsx`: custom mpv-backed player controls rather than `<video>`.
- Create `components/player/PlayerOverlay.tsx`: play/pause, stop, seek, volume, mute, fullscreen, previous/next, track selectors, stream info, and error/buffering display.
- Create `components/player/usePlayerShortcuts.ts`: keyboard shortcuts for player controls.
- Modify `pages/LiveTv.tsx`: category/channel list, channel detail EPG, favourite toggle, and launch playback.
- Modify `pages/Movies.tsx`: VOD categories, search, favourite toggle, resume state, and playback launch.
- Modify `pages/Series.tsx`: series categories, details, seasons, episodes, favourite toggle, resume state, and playback launch.
- Create `pages/Epg.tsx`: EPG grid and channel schedule detail.
- Create `pages/Favourites.tsx`: favourites for live channels, movies, series, and episodes.
- Create `pages/Settings.tsx`: hardware acceleration, audio output preference note, subtitles, cache refresh, diagnostics, and mpv path status.
- Create `pages/Diagnostics.tsx`: provider status, cache stats, mpv detection, redacted recent errors, and build info.
- Create `tests/xtream/*.test.ts`: URL building, normalization, EPG parsing.
- Create `tests/storage/*.test.ts`: database migration and repository operations.
- Create `tests/player/*.test.ts`: mpv command translation and player service behavior using a fake process.
- Create `tests/ipc/*.test.ts`: IPC handler validation with fake services.
- Create `build/icon.svg`, `build/icon.png`, and `build/icon.ico`: packaging assets.
- Create `docs/manual-verification/windows-playback.md`: manual verification checklist for Xtream login, playback, controls, EPG, favourites, packaging, 2160p-capable streams, and 5.1-capable streams.

## Task 1: Build And Dependency Foundation

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.renderer.json`
- Create: `tsconfig.electron.json`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `tests/setup.ts`

- [ ] **Step 1: Add the test/build dependencies**

Update `package.json` so the app can build renderer and Electron outputs separately, test the domain code, and parse/store IPTV data locally.

```json
{
  "name": "titon-iptv-player",
  "productName": "Titon IPTV Player",
  "version": "1.0.0",
  "description": "Windows desktop Xtream Codes IPTV player with native mpv playback",
  "main": "dist-electron/main.js",
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173",
    "electron:dev": "concurrently -k \"npm run dev\" \"wait-on http://127.0.0.1:5173 && cross-env VITE_DEV_SERVER_URL=http://127.0.0.1:5173 electron .\"",
    "build:renderer": "vite build",
    "build:electron": "tsc -p tsconfig.electron.json",
    "typecheck": "tsc -p tsconfig.renderer.json --noEmit && tsc -p tsconfig.electron.json --noEmit false",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "npm run typecheck && npm run test && npm run build:renderer && npm run build:electron",
    "build:win": "npm run build && electron-builder --win --config builder.json",
    "pack:portable": "npm run build && electron-builder --win portable --config builder.json"
  },
  "dependencies": {
    "@electron/remote": "^2.1.2",
    "better-sqlite3": "^11.10.0",
    "electron-squirrel-startup": "^1.0.1",
    "fast-xml-parser": "^4.5.3",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1",
    "undici": "^6.21.3",
    "zustand": "^4.5.7"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.13",
    "@types/node": "^20.17.57",
    "@types/react": "^18.3.23",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^4.5.2",
    "concurrently": "^8.2.2",
    "cross-env": "^7.0.3",
    "electron": "^32.3.3",
    "electron-builder": "^25.1.8",
    "typescript": "^5.8.3",
    "vite": "^5.4.19",
    "vitest": "^2.1.9",
    "wait-on": "^7.2.0"
  }
}
```

- [ ] **Step 2: Regenerate the lockfile**

Run:

```powershell
npm install
```

Expected: `package-lock.json` is updated and no `m3u-parser-generator` dependency remains because M3U is out of scope for the first finished version.

- [ ] **Step 3: Split TypeScript configs**

Replace `tsconfig.json` with project references.

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.renderer.json" },
    { "path": "./tsconfig.electron.json" }
  ]
}
```

Create `tsconfig.renderer.json`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "types": ["vite/client", "vitest/globals"],
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": false,
    "noEmit": true
  },
  "include": [
    "App.tsx",
    "index.tsx",
    "router.tsx",
    "types.ts",
    "components/**/*.tsx",
    "pages/**/*.tsx",
    "store/**/*.ts",
    "store/**/*.tsx",
    "shared/**/*.ts",
    "types/**/*.ts",
    "tests/**/*.ts",
    "vite.config.ts"
  ],
  "exclude": ["electron", "dist", "dist-electron", "node_modules"]
}
```

Create `tsconfig.electron.json`.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "types": ["node", "electron"],
    "strict": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "outDir": "dist-electron",
    "rootDir": ".",
    "sourceMap": true
  },
  "include": [
    "electron/**/*.ts",
    "shared/**/*.ts",
    "types/**/*.ts",
    "types.ts"
  ],
  "exclude": ["dist", "dist-electron", "node_modules", "tests"]
}
```

- [ ] **Step 4: Remove remote import maps and CDN Tailwind**

Replace `index.html` with bundled-only HTML.

```html
<!doctype html>
<html lang="en" class="h-full">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: http: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'; connect-src 'self' http: https:;" />
    <title>Titon IPTV Player</title>
  </head>
  <body class="h-full">
    <div id="root" class="h-full"></div>
    <script type="module" src="/index.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Update Vite config for bundled renderer**

Replace `vite.config.ts`.

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
  },
});
```

- [ ] **Step 6: Add the empty test setup**

Create `tests/setup.ts`.

```ts
import { afterEach, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});
```

- [ ] **Step 7: Verify the current build failure is now replaced by actionable failures**

Run:

```powershell
npm run typecheck
```

Expected: failures point to app code that still references `window.electronNet`, browser storage, or old environment helpers. No failure should mention invalid `typeof import` syntax.

- [ ] **Step 8: Commit the foundation**

Run:

```powershell
git add package.json package-lock.json tsconfig.json tsconfig.renderer.json tsconfig.electron.json vite.config.ts index.html tests/setup.ts
git commit -m "chore: establish desktop build foundation"
```

Expected: a commit with the build and dependency baseline.

## Task 2: Shared App Types And Typed IPC Contract

**Files:**
- Create: `types/app.ts`
- Modify: `types.ts`
- Create: `shared/ipc.ts`
- Modify: `electron/preload.ts`
- Create: `shared/window.d.ts`

- [ ] **Step 1: Create app domain types**

Create `types/app.ts`.

```ts
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
```

- [ ] **Step 2: Keep legacy imports compiling through re-exports**

Replace `types.ts`.

```ts
export * from './types/app';

declare global {
  interface Window {
    titon: import('./shared/ipc').TitonBridge;
  }
}

export {};
```

- [ ] **Step 3: Define the typed IPC bridge**

Create `shared/ipc.ts`.

```ts
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
  Series,
  XtreamCredentials,
} from '../types/app';

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
```

- [ ] **Step 4: Replace the preload bridge**

Replace `electron/preload.ts`.

```ts
import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, type Favourite, type PlayerCommand, type TitonBridge } from '../shared/ipc';
import type { AppSettings, PlaybackRequest, RefreshProgress, PlayerState, XtreamCredentials } from '../types/app';

const bridge: TitonBridge = {
  appReady: () => ipcRenderer.invoke(ipcChannels.appReady),
  connectProfile: (input: { name: string; credentials: XtreamCredentials }) => ipcRenderer.invoke(ipcChannels.profilesConnect, input),
  disconnectProfile: () => ipcRenderer.invoke(ipcChannels.profilesDisconnect),
  getCatalog: () => ipcRenderer.invoke(ipcChannels.catalogGet),
  refreshCatalog: () => ipcRenderer.invoke(ipcChannels.catalogRefresh),
  getSeriesEpisodes: (seriesId: string) => ipcRenderer.invoke(ipcChannels.seriesEpisodes, seriesId),
  toggleFavourite: (input: Favourite) => ipcRenderer.invoke(ipcChannels.favouritesToggle, input),
  startPlayback: (input: PlaybackRequest) => ipcRenderer.invoke(ipcChannels.playerStart, input),
  sendPlayerCommand: (command: PlayerCommand) => ipcRenderer.invoke(ipcChannels.playerCommand, command),
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
```

- [ ] **Step 5: Fix the preload import type issue**

If TypeScript rejects importing `Favourite` from `../shared/ipc`, replace the import block with:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import { ipcChannels, type PlayerCommand, type TitonBridge } from '../shared/ipc';
import type { AppSettings, Favourite, PlaybackRequest, RefreshProgress, PlayerState, XtreamCredentials } from '../types/app';
```

- [ ] **Step 6: Add a window declaration file**

Create `shared/window.d.ts`.

```ts
import type { TitonBridge } from './ipc';

declare global {
  interface Window {
    titon: TitonBridge;
  }
}

export {};
```

- [ ] **Step 7: Verify typed IPC compiles**

Run:

```powershell
npm run typecheck
```

Expected: remaining failures are from old renderer code calling removed model fields or old services. No errors should come from `electron/preload.ts`, `shared/ipc.ts`, or `types/app.ts`.

- [ ] **Step 8: Commit shared contracts**

Run:

```powershell
git add types.ts types shared electron/preload.ts
git commit -m "feat: define typed desktop ipc contract"
```

Expected: shared app types and bridge contract are committed.

## Task 3: Local Desktop Storage

**Files:**
- Create: `electron/storage/database.ts`
- Create: `electron/storage/repositories.ts`
- Create: `tests/storage/database.test.ts`
- Create: `tests/storage/repositories.test.ts`

- [ ] **Step 1: Write migration tests**

Create `tests/storage/database.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../electron/storage/database';

describe('createDatabase', () => {
  it('creates all required tables', () => {
    const db = createDatabase(':memory:');
    const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as { name: string }[];
    expect(tables.map((table) => table.name)).toEqual([
      'categories',
      'episodes',
      'epg_programmes',
      'favourites',
      'history',
      'live_channels',
      'movies',
      'profiles',
      'schema_migrations',
      'series',
      'settings',
      'watch_progress',
    ]);
  });
});
```

- [ ] **Step 2: Implement database creation and migrations**

Create `electron/storage/database.ts`.

```ts
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';

export type AppDatabase = Database.Database;

const schema = `
create table if not exists schema_migrations (
  version integer primary key,
  applied_at text not null
);
create table if not exists profiles (
  id text primary key,
  name text not null,
  server_url text not null,
  username text not null,
  password text not null,
  created_at text not null,
  updated_at text not null,
  last_refresh_at text,
  account_status text
);
create table if not exists categories (
  id text not null,
  kind text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (kind, id)
);
create table if not exists live_channels (
  id text primary key,
  category_id text not null,
  name text not null,
  logo_url text,
  stream_id integer not null,
  stream_url text not null,
  epg_channel_id text,
  sort_order integer not null default 0
);
create table if not exists movies (
  id text primary key,
  category_id text not null,
  title text not null,
  poster_url text,
  stream_id integer not null,
  stream_url text not null,
  container_extension text not null,
  rating text,
  release_year text,
  plot text,
  duration_seconds integer
);
create table if not exists series (
  id text primary key,
  category_id text not null,
  title text not null,
  poster_url text,
  series_id integer not null,
  rating text,
  release_year text,
  plot text
);
create table if not exists episodes (
  id text primary key,
  series_id text not null,
  season_number integer not null,
  episode_number integer not null,
  title text not null,
  stream_id integer not null,
  stream_url text not null,
  container_extension text not null,
  duration_seconds integer,
  plot text
);
create table if not exists epg_programmes (
  id text primary key,
  channel_id text not null,
  start_at text not null,
  end_at text not null,
  title text not null,
  description text
);
create table if not exists favourites (
  kind text not null,
  item_id text not null,
  created_at text not null,
  primary key (kind, item_id)
);
create table if not exists watch_progress (
  kind text not null,
  item_id text not null,
  position_seconds integer not null,
  duration_seconds integer,
  updated_at text not null,
  primary key (kind, item_id)
);
create table if not exists history (
  kind text not null,
  item_id text not null,
  title text not null,
  played_at text not null
);
create table if not exists settings (
  key text primary key,
  value_json text not null
);
insert or ignore into schema_migrations (version, applied_at) values (1, datetime('now'));
`;

export function resolveDatabasePath(userDataPath: string): string {
  const dir = path.join(userDataPath, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'titon.sqlite');
}

export function createDatabase(filename: string): AppDatabase {
  const db = new Database(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}
```

- [ ] **Step 3: Write repository operation tests**

Create `tests/storage/repositories.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../electron/storage/database';
import { createRepositories } from '../../electron/storage/repositories';

describe('repositories', () => {
  it('saves profiles, catalog items, favourites, progress, and settings', () => {
    const repos = createRepositories(createDatabase(':memory:'));

    repos.profiles.save({
      id: 'profile-1',
      name: 'Home',
      serverUrl: 'http://example.test:8080',
      username: 'demo',
      createdAt: '2026-06-26T08:00:00.000Z',
      updatedAt: '2026-06-26T08:00:00.000Z',
      accountStatus: 'Active',
    }, 'secret');

    repos.catalog.replace({
      liveCategories: [{ id: '1', kind: 'live', name: 'News', sortOrder: 1 }],
      movieCategories: [],
      seriesCategories: [],
      liveChannels: [{
        id: 'live:10',
        categoryId: '1',
        name: 'News 4K',
        streamId: 10,
        streamUrl: 'http://example.test/live/demo/secret/10.ts',
        sortOrder: 10,
      }],
      movies: [],
      series: [],
      episodes: [],
      epg: [],
    });

    const favourites = repos.favourites.toggle({ kind: 'live', itemId: 'live:10', createdAt: '2026-06-26T08:00:00.000Z' });
    repos.progress.save({ kind: 'movie', itemId: 'movie:11', positionSeconds: 120, durationSeconds: 600, updatedAt: '2026-06-26T08:01:00.000Z' });
    repos.settings.save({ hardwareAcceleration: true, subtitlesEnabled: true, cacheTtlHours: 12 });

    const snapshot = repos.catalog.snapshot();
    expect(snapshot.profile?.name).toBe('Home');
    expect(snapshot.liveChannels[0].name).toBe('News 4K');
    expect(favourites).toHaveLength(1);
    expect(snapshot.progress[0].positionSeconds).toBe(120);
    expect(snapshot.settings.cacheTtlHours).toBe(12);
  });
});
```

- [ ] **Step 4: Implement repositories**

Create `electron/storage/repositories.ts`.

```ts
import type { AppDatabase } from './database';
import type {
  AppSettings,
  CatalogSnapshot,
  Category,
  Episode,
  EpgProgramme,
  Favourite,
  LiveChannel,
  Profile,
  Series,
  VodMovie,
  WatchProgress,
} from '../../types/app';

type CatalogReplaceInput = {
  liveCategories: Category[];
  movieCategories: Category[];
  seriesCategories: Category[];
  liveChannels: LiveChannel[];
  movies: VodMovie[];
  series: Series[];
  episodes: Episode[];
  epg: EpgProgramme[];
};

const defaultSettings: AppSettings = {
  hardwareAcceleration: true,
  subtitlesEnabled: true,
  cacheTtlHours: 12,
};

function readJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function createRepositories(db: AppDatabase) {
  const profiles = {
    save(profile: Profile, password: string) {
      db.prepare(`
        insert into profiles (id, name, server_url, username, password, created_at, updated_at, last_refresh_at, account_status)
        values (@id, @name, @serverUrl, @username, @password, @createdAt, @updatedAt, @lastRefreshAt, @accountStatus)
        on conflict(id) do update set
          name = excluded.name,
          server_url = excluded.server_url,
          username = excluded.username,
          password = excluded.password,
          updated_at = excluded.updated_at,
          last_refresh_at = excluded.last_refresh_at,
          account_status = excluded.account_status
      `).run({ ...profile, password });
    },
    current(): (Profile & { password: string }) | null {
      const row = db.prepare('select * from profiles order by updated_at desc limit 1').get() as any;
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        serverUrl: row.server_url,
        username: row.username,
        password: row.password,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        lastRefreshAt: row.last_refresh_at ?? undefined,
        accountStatus: row.account_status ?? undefined,
      };
    },
    clear() {
      db.prepare('delete from profiles').run();
    },
  };

  const catalog = {
    replace(input: CatalogReplaceInput) {
      const tx = db.transaction(() => {
        db.prepare('delete from categories').run();
        db.prepare('delete from live_channels').run();
        db.prepare('delete from movies').run();
        db.prepare('delete from series').run();
        db.prepare('delete from episodes').run();
        db.prepare('delete from epg_programmes').run();

        const categoryStmt = db.prepare('insert into categories (id, kind, name, sort_order) values (@id, @kind, @name, @sortOrder)');
        for (const category of [...input.liveCategories, ...input.movieCategories, ...input.seriesCategories]) categoryStmt.run(category);

        const liveStmt = db.prepare('insert into live_channels (id, category_id, name, logo_url, stream_id, stream_url, epg_channel_id, sort_order) values (@id, @categoryId, @name, @logoUrl, @streamId, @streamUrl, @epgChannelId, @sortOrder)');
        for (const channel of input.liveChannels) liveStmt.run(channel);

        const movieStmt = db.prepare('insert into movies (id, category_id, title, poster_url, stream_id, stream_url, container_extension, rating, release_year, plot, duration_seconds) values (@id, @categoryId, @title, @posterUrl, @streamId, @streamUrl, @containerExtension, @rating, @releaseYear, @plot, @durationSeconds)');
        for (const movie of input.movies) movieStmt.run(movie);

        const seriesStmt = db.prepare('insert into series (id, category_id, title, poster_url, series_id, rating, release_year, plot) values (@id, @categoryId, @title, @posterUrl, @seriesId, @rating, @releaseYear, @plot)');
        for (const item of input.series) seriesStmt.run(item);

        const episodeStmt = db.prepare('insert into episodes (id, series_id, season_number, episode_number, title, stream_id, stream_url, container_extension, duration_seconds, plot) values (@id, @seriesId, @seasonNumber, @episodeNumber, @title, @streamId, @streamUrl, @containerExtension, @durationSeconds, @plot)');
        for (const episode of input.episodes) episodeStmt.run(episode);

        const epgStmt = db.prepare('insert into epg_programmes (id, channel_id, start_at, end_at, title, description) values (@id, @channelId, @startAt, @endAt, @title, @description)');
        for (const programme of input.epg) epgStmt.run(programme);
      });
      tx();
    },
    snapshot(): CatalogSnapshot {
      const current = profiles.current();
      const categories = db.prepare('select id, kind, name, sort_order as sortOrder from categories order by kind, sort_order, name').all() as Category[];
      const settingsRow = db.prepare("select value_json from settings where key = 'app'").get() as { value_json?: string } | undefined;
      return {
        profile: current ? { ...current, password: undefined as never } : null,
        liveCategories: categories.filter((category) => category.kind === 'live'),
        movieCategories: categories.filter((category) => category.kind === 'movie'),
        seriesCategories: categories.filter((category) => category.kind === 'series'),
        liveChannels: db.prepare('select id, category_id as categoryId, name, logo_url as logoUrl, stream_id as streamId, stream_url as streamUrl, epg_channel_id as epgChannelId, sort_order as sortOrder from live_channels order by sort_order, name').all() as LiveChannel[],
        movies: db.prepare('select id, category_id as categoryId, title, poster_url as posterUrl, stream_id as streamId, stream_url as streamUrl, container_extension as containerExtension, rating, release_year as releaseYear, plot, duration_seconds as durationSeconds from movies order by title').all() as VodMovie[],
        series: db.prepare('select id, category_id as categoryId, title, poster_url as posterUrl, series_id as seriesId, rating, release_year as releaseYear, plot from series order by title').all() as Series[],
        episodes: db.prepare('select id, series_id as seriesId, season_number as seasonNumber, episode_number as episodeNumber, title, stream_id as streamId, stream_url as streamUrl, container_extension as containerExtension, duration_seconds as durationSeconds, plot from episodes order by series_id, season_number, episode_number').all() as Episode[],
        epg: db.prepare('select id, channel_id as channelId, start_at as startAt, end_at as endAt, title, description from epg_programmes order by start_at').all() as EpgProgramme[],
        favourites: db.prepare('select kind, item_id as itemId, created_at as createdAt from favourites order by created_at desc').all() as Favourite[],
        progress: db.prepare('select kind, item_id as itemId, position_seconds as positionSeconds, duration_seconds as durationSeconds, updated_at as updatedAt from watch_progress').all() as WatchProgress[],
        settings: readJson(settingsRow?.value_json, defaultSettings),
      };
    },
  };

  const favourites = {
    toggle(favourite: Favourite): Favourite[] {
      const existing = db.prepare('select 1 from favourites where kind = ? and item_id = ?').get(favourite.kind, favourite.itemId);
      if (existing) {
        db.prepare('delete from favourites where kind = ? and item_id = ?').run(favourite.kind, favourite.itemId);
      } else {
        db.prepare('insert into favourites (kind, item_id, created_at) values (?, ?, ?)').run(favourite.kind, favourite.itemId, favourite.createdAt);
      }
      return db.prepare('select kind, item_id as itemId, created_at as createdAt from favourites order by created_at desc').all() as Favourite[];
    },
  };

  const progress = {
    save(input: WatchProgress) {
      db.prepare(`
        insert into watch_progress (kind, item_id, position_seconds, duration_seconds, updated_at)
        values (@kind, @itemId, @positionSeconds, @durationSeconds, @updatedAt)
        on conflict(kind, item_id) do update set
          position_seconds = excluded.position_seconds,
          duration_seconds = excluded.duration_seconds,
          updated_at = excluded.updated_at
      `).run(input);
    },
  };

  const settings = {
    save(input: AppSettings): AppSettings {
      db.prepare("insert into settings (key, value_json) values ('app', ?) on conflict(key) do update set value_json = excluded.value_json").run(JSON.stringify(input));
      return input;
    },
  };

  return { profiles, catalog, favourites, progress, settings };
}
```

- [ ] **Step 5: Run storage tests**

Run:

```powershell
npm test -- tests/storage/database.test.ts tests/storage/repositories.test.ts
```

Expected: both storage tests pass.

- [ ] **Step 6: Commit storage**

Run:

```powershell
git add electron/storage tests/storage
git commit -m "feat: add local desktop storage"
```

Expected: storage schema and repositories are committed.

## Task 4: Xtream Client, URL Builder, Normalization, And EPG

**Files:**
- Create: `electron/xtream/urls.ts`
- Create: `electron/xtream/client.ts`
- Create: `electron/xtream/normalize.ts`
- Create: `electron/xtream/epg.ts`
- Create: `tests/xtream/urls.test.ts`
- Create: `tests/xtream/normalize.test.ts`
- Create: `tests/xtream/epg.test.ts`
- Modify: `services/iptvService.ts`
- Modify: `lib/xtream.ts`
- Modify: `lib/http.ts`

- [ ] **Step 1: Write Xtream URL tests**

Create `tests/xtream/urls.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { buildPlayerApiUrl, buildStreamUrl, redactCredentialedUrl } from '../../electron/xtream/urls';

describe('xtream urls', () => {
  it('builds player api urls with encoded credentials', () => {
    expect(buildPlayerApiUrl({
      serverUrl: 'http://example.test:8080/',
      username: 'demo user',
      password: 'p@ss',
      action: 'get_live_streams',
    })).toBe('http://example.test:8080/player_api.php?username=demo%20user&password=p%40ss&action=get_live_streams');
  });

  it('builds live, movie, and episode stream urls', () => {
    const credentials = { serverUrl: 'http://example.test:8080', username: 'u', password: 'p' };
    expect(buildStreamUrl(credentials, 'live', 10, 'ts')).toBe('http://example.test:8080/live/u/p/10.ts');
    expect(buildStreamUrl(credentials, 'movie', 11, 'mp4')).toBe('http://example.test:8080/movie/u/p/11.mp4');
    expect(buildStreamUrl(credentials, 'episode', 12, 'mkv')).toBe('http://example.test:8080/series/u/p/12.mkv');
  });

  it('redacts passwords in credentialed urls', () => {
    expect(redactCredentialedUrl('http://example.test/live/user/secret/10.ts')).toBe('http://example.test/live/user/[redacted]/10.ts');
  });
});
```

- [ ] **Step 2: Implement URL builder**

Create `electron/xtream/urls.ts`.

```ts
import type { XtreamCredentials } from '../../types/app';

type ApiInput = XtreamCredentials & { action?: string; extra?: Record<string, string | number | undefined> };
type StreamKind = 'live' | 'movie' | 'episode';

function cleanServer(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, '');
}

export function buildPlayerApiUrl(input: ApiInput): string {
  const url = new URL(`${cleanServer(input.serverUrl)}/player_api.php`);
  url.searchParams.set('username', input.username);
  url.searchParams.set('password', input.password);
  if (input.action) url.searchParams.set('action', input.action);
  for (const [key, value] of Object.entries(input.extra ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function buildXmlTvUrl(input: XtreamCredentials): string {
  const url = new URL(`${cleanServer(input.serverUrl)}/xmltv.php`);
  url.searchParams.set('username', input.username);
  url.searchParams.set('password', input.password);
  return url.toString();
}

export function buildStreamUrl(credentials: XtreamCredentials, kind: StreamKind, streamId: number, extension: string): string {
  const folder = kind === 'episode' ? 'series' : kind;
  return `${cleanServer(credentials.serverUrl)}/${folder}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${streamId}.${extension}`;
}

export function redactCredentialedUrl(url: string): string {
  return url.replace(/\/(live|movie|series)\/([^/]+)\/([^/]+)\//, '/$1/$2/[redacted]/').replace(/password=([^&]+)/, 'password=[redacted]');
}
```

- [ ] **Step 3: Write normalization tests**

Create `tests/xtream/normalize.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { normalizeLive, normalizeMovies, normalizeSeries, normalizeSeriesDetails } from '../../electron/xtream/normalize';

const credentials = { serverUrl: 'http://example.test:8080', username: 'user', password: 'pass' };

describe('xtream normalization', () => {
  it('normalizes live streams', () => {
    const result = normalizeLive(credentials, [{ stream_id: 10, name: 'News 4K', stream_icon: 'logo.png', category_id: '1', epg_channel_id: 'news', num: 7 }]);
    expect(result[0]).toMatchObject({ id: 'live:10', name: 'News 4K', streamId: 10, sortOrder: 7, streamUrl: 'http://example.test:8080/live/user/pass/10.ts' });
  });

  it('normalizes movies with container extensions', () => {
    const result = normalizeMovies(credentials, [{ stream_id: 11, name: 'Film', stream_icon: 'poster.jpg', category_id: '2', container_extension: 'mp4', rating: '7.2', plot: 'Plot', releaseDate: '2024-01-01' }]);
    expect(result[0]).toMatchObject({ id: 'movie:11', title: 'Film', containerExtension: 'mp4', releaseYear: '2024' });
  });

  it('normalizes series and episodes', () => {
    const series = normalizeSeries([{ series_id: 20, name: 'Show', cover: 'cover.jpg', category_id: '3', rating: '8', plot: 'Story', releaseDate: '2023-02-01' }]);
    const episodes = normalizeSeriesDetails(credentials, 'series:20', { episodes: { '1': [{ id: '30', episode_num: 2, title: 'Second', container_extension: 'mkv', info: { duration_secs: 1800, plot: 'Episode plot' } }] } });
    expect(series[0]).toMatchObject({ id: 'series:20', seriesId: 20, releaseYear: '2023' });
    expect(episodes[0]).toMatchObject({ id: 'episode:30', seriesId: 'series:20', seasonNumber: 1, episodeNumber: 2, streamUrl: 'http://example.test:8080/series/user/pass/30.mkv' });
  });
});
```

- [ ] **Step 4: Implement normalization**

Create `electron/xtream/normalize.ts`.

```ts
import type { Category, Episode, LiveChannel, Series, VodMovie, XtreamCredentials } from '../../types/app';
import { buildStreamUrl } from './urls';

export function normalizeCategories(kind: Category['kind'], rows: any[]): Category[] {
  return rows.map((row, index) => ({
    id: String(row.category_id ?? row.id ?? index),
    kind,
    name: String(row.category_name ?? row.name ?? 'Uncategorized'),
    sortOrder: Number(row.sort_order ?? index),
  }));
}

export function normalizeLive(credentials: XtreamCredentials, rows: any[]): LiveChannel[] {
  return rows.map((row, index) => {
    const streamId = Number(row.stream_id);
    return {
      id: `live:${streamId}`,
      categoryId: String(row.category_id ?? ''),
      name: String(row.name ?? `Channel ${streamId}`),
      logoUrl: row.stream_icon || undefined,
      streamId,
      streamUrl: buildStreamUrl(credentials, 'live', streamId, 'ts'),
      epgChannelId: row.epg_channel_id || undefined,
      sortOrder: Number(row.num ?? index),
    };
  });
}

export function normalizeMovies(credentials: XtreamCredentials, rows: any[]): VodMovie[] {
  return rows.map((row) => {
    const streamId = Number(row.stream_id);
    const extension = String(row.container_extension || 'mp4');
    const releaseDate = String(row.releaseDate ?? row.added ?? '');
    return {
      id: `movie:${streamId}`,
      categoryId: String(row.category_id ?? ''),
      title: String(row.name ?? `Movie ${streamId}`),
      posterUrl: row.stream_icon || row.cover || undefined,
      streamId,
      streamUrl: buildStreamUrl(credentials, 'movie', streamId, extension),
      containerExtension: extension,
      rating: row.rating || undefined,
      releaseYear: /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : undefined,
      plot: row.plot || undefined,
      durationSeconds: row.duration_secs ? Number(row.duration_secs) : undefined,
    };
  });
}

export function normalizeSeries(rows: any[]): Series[] {
  return rows.map((row) => {
    const seriesId = Number(row.series_id);
    const releaseDate = String(row.releaseDate ?? '');
    return {
      id: `series:${seriesId}`,
      categoryId: String(row.category_id ?? ''),
      title: String(row.name ?? `Series ${seriesId}`),
      posterUrl: row.cover || row.stream_icon || undefined,
      seriesId,
      rating: row.rating || undefined,
      releaseYear: /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : undefined,
      plot: row.plot || undefined,
    };
  });
}

export function normalizeSeriesDetails(credentials: XtreamCredentials, seriesId: string, details: any): Episode[] {
  const episodesBySeason = details?.episodes ?? {};
  const episodes: Episode[] = [];
  for (const [seasonKey, seasonEpisodes] of Object.entries(episodesBySeason)) {
    for (const row of seasonEpisodes as any[]) {
      const streamId = Number(row.id);
      const extension = String(row.container_extension || 'mp4');
      episodes.push({
        id: `episode:${streamId}`,
        seriesId,
        seasonNumber: Number(seasonKey),
        episodeNumber: Number(row.episode_num ?? row.episodeNum ?? episodes.length + 1),
        title: String(row.title ?? `Episode ${streamId}`),
        streamId,
        streamUrl: buildStreamUrl(credentials, 'episode', streamId, extension),
        containerExtension: extension,
        durationSeconds: row.info?.duration_secs ? Number(row.info.duration_secs) : undefined,
        plot: row.info?.plot || undefined,
      });
    }
  }
  return episodes.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
}
```

- [ ] **Step 5: Write EPG parser tests**

Create `tests/xtream/epg.test.ts`.

```ts
import { describe, expect, it } from 'vitest';
import { parseXmlTv } from '../../electron/xtream/epg';

describe('parseXmlTv', () => {
  it('parses programme entries and maps channel ids', () => {
    const xml = `<?xml version="1.0"?>
      <tv>
        <programme start="20260626080000 +0200" stop="20260626090000 +0200" channel="news">
          <title>Morning News</title>
          <desc>Headlines</desc>
        </programme>
      </tv>`;

    expect(parseXmlTv(xml, new Map([['news', 'live:10']]))).toEqual([{
      id: 'live:10:20260626080000 +0200',
      channelId: 'live:10',
      startAt: '2026-06-26T06:00:00.000Z',
      endAt: '2026-06-26T07:00:00.000Z',
      title: 'Morning News',
      description: 'Headlines',
    }]);
  });
});
```

- [ ] **Step 6: Implement XMLTV parsing**

Create `electron/xtream/epg.ts`.

```ts
import { XMLParser } from 'fast-xml-parser';
import type { EpgProgramme } from '../../types/app';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseXmlTvDate(input: string): string {
  const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) ([+-])(\d{2})(\d{2})$/);
  if (!match) return new Date(input).toISOString();
  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const offsetMs = (Number(offsetHour) * 60 + Number(offsetMinute)) * 60 * 1000 * (sign === '+' ? 1 : -1);
  return new Date(utc - offsetMs).toISOString();
}

function readText(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value?.['#text'] === 'string') return value['#text'];
  return '';
}

export function parseXmlTv(xml: string, channelMap: Map<string, string>): EpgProgramme[] {
  const parsed = parser.parse(xml);
  const programmes = arrayify<any>(parsed?.tv?.programme);
  return programmes.flatMap((programme) => {
    const channelId = channelMap.get(String(programme.channel));
    if (!channelId || !programme.start || !programme.stop) return [];
    return [{
      id: `${channelId}:${programme.start}`,
      channelId,
      startAt: parseXmlTvDate(String(programme.start)),
      endAt: parseXmlTvDate(String(programme.stop)),
      title: readText(programme.title) || 'Untitled',
      description: readText(programme.desc) || undefined,
    }];
  });
}
```

- [ ] **Step 7: Implement Xtream client**

Create `electron/xtream/client.ts`.

```ts
import { fetch } from 'undici';
import type { RefreshProgress, XtreamCredentials } from '../../types/app';
import { parseXmlTv } from './epg';
import { normalizeCategories, normalizeLive, normalizeMovies, normalizeSeries, normalizeSeriesDetails } from './normalize';
import { buildPlayerApiUrl, buildXmlTvUrl, redactCredentialedUrl } from './urls';

export class XtreamError extends Error {
  constructor(message: string, public readonly safeUrl?: string) {
    super(message);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new XtreamError(`Provider returned HTTP ${response.status}`, redactCredentialedUrl(url));
  return response.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { accept: 'application/xml,text/xml,*/*' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new XtreamError(`Provider returned HTTP ${response.status}`, redactCredentialedUrl(url));
  return response.text();
}

export class XtreamClient {
  constructor(private readonly credentials: XtreamCredentials) {}

  async authenticate() {
    const auth = await getJson<any>(buildPlayerApiUrl(this.credentials));
    if (auth?.user_info?.auth !== 1) {
      throw new XtreamError(`Authentication failed: ${auth?.user_info?.status ?? 'Unknown status'}`);
    }
    return auth;
  }

  async refresh(onProgress: (progress: RefreshProgress) => void) {
    onProgress({ phase: 'auth', message: 'Checking account', completed: 0, total: 7 });
    const auth = await this.authenticate();

    onProgress({ phase: 'categories', message: 'Loading categories', completed: 1, total: 7 });
    const [liveCategoriesRaw, movieCategoriesRaw, seriesCategoriesRaw] = await Promise.all([
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_live_categories' })),
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_vod_categories' })),
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series_categories' })),
    ]);

    onProgress({ phase: 'live', message: 'Loading live channels', completed: 2, total: 7 });
    const liveRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_live_streams' }));

    onProgress({ phase: 'movies', message: 'Loading movies', completed: 3, total: 7 });
    const moviesRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_vod_streams' }));

    onProgress({ phase: 'series', message: 'Loading series', completed: 4, total: 7 });
    const seriesRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series' }));
    const series = normalizeSeries(seriesRaw);
    const episodes = (await Promise.all(series.map((item) =>
      getJson<any>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series_info', extra: { series_id: item.seriesId } }))
        .then((details) => normalizeSeriesDetails(this.credentials, item.id, details))
        .catch(() => [])
    ))).flat();

    onProgress({ phase: 'epg', message: 'Loading EPG', completed: 5, total: 7 });
    const liveChannels = normalizeLive(this.credentials, liveRaw);
    const epgChannelMap = new Map(liveChannels.flatMap((channel) => channel.epgChannelId ? [[channel.epgChannelId, channel.id] as const] : []));
    const epg = await getText(buildXmlTvUrl(this.credentials)).then((xml) => parseXmlTv(xml, epgChannelMap)).catch(() => []);

    onProgress({ phase: 'saving', message: 'Saving provider data', completed: 6, total: 7 });
    return {
      accountStatus: auth?.user_info?.status as string | undefined,
      liveCategories: normalizeCategories('live', liveCategoriesRaw),
      movieCategories: normalizeCategories('movie', movieCategoriesRaw),
      seriesCategories: normalizeCategories('series', seriesCategoriesRaw),
      liveChannels,
      movies: normalizeMovies(this.credentials, moviesRaw),
      series,
      episodes,
      epg,
    };
  }
}
```

- [ ] **Step 8: Retire old renderer-side provider helpers**

Replace `services/iptvService.ts` with a compatibility module that directs renderer code to IPC while pages are migrated.

```ts
export class IptvService {
  async fetchData() {
    return window.titon.getCatalog();
  }
}
```

Replace `lib/xtream.ts`.

```ts
export { buildPlayerApiUrl, buildStreamUrl, redactCredentialedUrl } from '../electron/xtream/urls';
```

Replace `lib/http.ts`.

```ts
export async function httpGet<T = unknown>(url: string): Promise<{ ok: boolean; status: number; json?: T; text?: string; error?: string }> {
  try {
    const response = await fetch(url);
    const text = await response.text();
    try {
      return { ok: response.ok, status: response.status, text, json: JSON.parse(text) as T };
    } catch {
      return { ok: response.ok, status: response.status, text };
    }
  } catch (error) {
    return { ok: false, status: 0, error: error instanceof Error ? error.message : String(error) };
  }
}
```

- [ ] **Step 9: Run Xtream tests**

Run:

```powershell
npm test -- tests/xtream/urls.test.ts tests/xtream/normalize.test.ts tests/xtream/epg.test.ts
```

Expected: Xtream URL, normalization, and EPG tests pass.

- [ ] **Step 10: Commit Xtream domain**

Run:

```powershell
git add electron/xtream tests/xtream services/iptvService.ts lib/xtream.ts lib/http.ts
git commit -m "feat: add xtream provider domain"
```

Expected: Xtream domain code is committed.

## Task 5: Electron Main Process And IPC Handlers

**Files:**
- Modify: `electron/main.ts`
- Create: `electron/ipc/registerHandlers.ts`
- Create: `tests/ipc/registerHandlers.test.ts`

- [ ] **Step 1: Write IPC handler tests**

Create `tests/ipc/registerHandlers.test.ts`.

```ts
import { describe, expect, it, vi } from 'vitest';
import { registerHandlers } from '../../electron/ipc/registerHandlers';
import { ipcChannels } from '../../shared/ipc';

describe('registerHandlers', () => {
  it('registers app, catalog, profile, player, settings, and diagnostics handlers', () => {
    const ipcMain = { handle: vi.fn() };
    registerHandlers({
      ipcMain: ipcMain as any,
      sendToRenderer: vi.fn(),
      repositories: {
        profiles: { save: vi.fn(), current: vi.fn(), clear: vi.fn() },
        catalog: { snapshot: vi.fn(() => ({ settings: { hardwareAcceleration: true, subtitlesEnabled: true, cacheTtlHours: 12 } })), replace: vi.fn() },
        favourites: { toggle: vi.fn() },
        progress: { save: vi.fn() },
        settings: { save: vi.fn((settings) => settings) },
      } as any,
      createXtreamClient: vi.fn(),
      playerService: { start: vi.fn(), command: vi.fn(), state: vi.fn() } as any,
      diagnostics: vi.fn(),
    });

    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.appReady, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.profilesConnect, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.playerStart, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.diagnosticsGet, expect.any(Function));
  });
});
```

- [ ] **Step 2: Implement handler registration**

Create `electron/ipc/registerHandlers.ts`.

```ts
import crypto from 'node:crypto';
import type { IpcMain } from 'electron';
import { ipcChannels, type PlayerCommand } from '../../shared/ipc';
import type { AppSettings, Favourite, PlaybackRequest, RefreshProgress, XtreamCredentials } from '../../types/app';
import type { XtreamClient } from '../xtream/client';

type RegisterInput = {
  ipcMain: Pick<IpcMain, 'handle'>;
  sendToRenderer: (channel: string, payload: unknown) => void;
  repositories: any;
  createXtreamClient: (credentials: XtreamCredentials) => XtreamClient;
  playerService: {
    start(input: PlaybackRequest): Promise<any>;
    command(command: PlayerCommand): Promise<any>;
    state(): any;
  };
  diagnostics: () => Promise<any> | any;
};

function now() {
  return new Date().toISOString();
}

export function registerHandlers(input: RegisterInput) {
  const { ipcMain, repositories, createXtreamClient, playerService, sendToRenderer } = input;

  ipcMain.handle(ipcChannels.appReady, async () => repositories.catalog.snapshot());
  ipcMain.handle(ipcChannels.catalogGet, async () => repositories.catalog.snapshot());
  ipcMain.handle(ipcChannels.profilesDisconnect, async () => {
    repositories.profiles.clear();
  });

  ipcMain.handle(ipcChannels.profilesConnect, async (_event, payload: { name: string; credentials: XtreamCredentials }) => {
    const createdAt = now();
    const client = createXtreamClient(payload.credentials);
    const auth = await client.authenticate();
    const profile = {
      id: crypto.randomUUID(),
      name: payload.name,
      serverUrl: payload.credentials.serverUrl,
      username: payload.credentials.username,
      createdAt,
      updatedAt: createdAt,
      accountStatus: auth?.user_info?.status,
    };
    repositories.profiles.save(profile, payload.credentials.password);
    return profile;
  });

  ipcMain.handle(ipcChannels.catalogRefresh, async () => {
    const profile = repositories.profiles.current();
    if (!profile) throw new Error('Connect an Xtream profile before refreshing.');
    const client = createXtreamClient({ serverUrl: profile.serverUrl, username: profile.username, password: profile.password });
    const result = await client.refresh((progress: RefreshProgress) => sendToRenderer(ipcChannels.catalogRefresh, progress));
    repositories.catalog.replace(result);
    sendToRenderer(ipcChannels.catalogRefresh, { phase: 'complete', message: 'Provider refresh complete', completed: 7, total: 7 });
  });

  ipcMain.handle(ipcChannels.seriesEpisodes, async (_event, seriesId: string) =>
    repositories.catalog.snapshot().episodes.filter((episode: any) => episode.seriesId === seriesId)
  );

  ipcMain.handle(ipcChannels.favouritesToggle, async (_event, favourite: Favourite) => repositories.favourites.toggle(favourite));
  ipcMain.handle(ipcChannels.progressSave, async (_event, progress) => repositories.progress.save(progress));
  ipcMain.handle(ipcChannels.playerStart, async (_event, request: PlaybackRequest) => playerService.start(request));
  ipcMain.handle(ipcChannels.playerCommand, async (_event, command: PlayerCommand) => playerService.command(command));
  ipcMain.handle(ipcChannels.settingsGet, async () => repositories.catalog.snapshot().settings);
  ipcMain.handle(ipcChannels.settingsSave, async (_event, settings: AppSettings) => repositories.settings.save(settings));
  ipcMain.handle(ipcChannels.diagnosticsGet, async () => input.diagnostics());
}
```

- [ ] **Step 3: Wire Electron main**

Replace `electron/main.ts`.

```ts
import { app, BrowserWindow, shell, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import squirrelStartup from 'electron-squirrel-startup';
import { createDatabase, resolveDatabasePath } from './storage/database.js';
import { createRepositories } from './storage/repositories.js';
import { registerHandlers } from './ipc/registerHandlers.js';
import { XtreamClient } from './xtream/client.js';
import { MpvAdapter } from './player/mpvAdapter.js';
import { PlayerService } from './player/playerService.js';
import { locateMpv } from './player/mpvLocator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (squirrelStartup) app.quit();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: '#0f172a',
    title: 'Titon IPTV Player',
    icon: path.join(__dirname, '../build/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  const viteDevServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (viteDevServerUrl) {
    mainWindow.loadURL(viteDevServerUrl);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  return mainWindow;
}

app.whenReady().then(async () => {
  const dbPath = resolveDatabasePath(app.getPath('userData'));
  const db = createDatabase(dbPath);
  const repositories = createRepositories(db);
  const win = createWindow();
  const mpv = await locateMpv(app.getAppPath());
  const playerService = new PlayerService(new MpvAdapter(mpv.path), (state) => win.webContents.send('player:state', state));

  registerHandlers({
    ipcMain,
    repositories,
    createXtreamClient: (credentials) => new XtreamClient(credentials),
    playerService,
    sendToRenderer: (channel, payload) => win.webContents.send(channel, payload),
    diagnostics: () => ({
      appVersion: app.getVersion(),
      electronVersion: process.versions.electron,
      platform: `${os.platform()} ${os.release()}`,
      mpvAvailable: mpv.available,
      mpvPath: mpv.path,
      databasePath: dbPath,
      catalogCounts: {
        live: repositories.catalog.snapshot().liveChannels.length,
        movies: repositories.catalog.snapshot().movies.length,
        series: repositories.catalog.snapshot().series.length,
        epg: repositories.catalog.snapshot().epg.length,
      },
      recentErrors: mpv.available ? [] : [mpv.message],
    }),
  });
});

app.on('window-all-closed', () => {
  if (os.platform() !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
```

- [ ] **Step 4: Run IPC tests and compile Electron**

Run:

```powershell
npm test -- tests/ipc/registerHandlers.test.ts
npm run build:electron
```

Expected: IPC tests pass, and `dist-electron/main.js` plus `dist-electron/preload.js` are emitted.

- [ ] **Step 5: Commit Electron IPC**

Run:

```powershell
git add electron/main.ts electron/ipc tests/ipc
git commit -m "feat: wire electron ipc services"
```

Expected: Electron main process and IPC handlers are committed.

## Task 6: mpv Player Engine Adapter

**Files:**
- Create: `electron/player/playerTypes.ts`
- Create: `electron/player/mpvLocator.ts`
- Create: `electron/player/mpvAdapter.ts`
- Create: `electron/player/playerService.ts`
- Create: `tests/player/mpvAdapter.test.ts`
- Create: `tests/player/playerService.test.ts`

- [ ] **Step 1: Write mpv command translation tests**

Create `tests/player/mpvAdapter.test.ts`.

```ts
import { describe, expect, it, vi } from 'vitest';
import { MpvAdapter } from '../../electron/player/mpvAdapter';

describe('MpvAdapter', () => {
  it('translates player controls into mpv JSON IPC commands', async () => {
    const writes: string[] = [];
    const adapter = new MpvAdapter('mpv.exe', {
      spawnProcess: vi.fn(() => ({
        stdin: { write: (value: string) => writes.push(value) },
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      } as any)),
    });

    await adapter.start({ kind: 'movie', itemId: 'movie:1', title: 'Movie', streamUrl: 'http://example.test/movie.ts' });
    await adapter.command({ type: 'setVolume', volume: 70 });
    await adapter.command({ type: 'selectAudioTrack', id: 2 });

    expect(writes.join('\n')).toContain('"loadfile","http://example.test/movie.ts","replace"');
    expect(writes.join('\n')).toContain('"set_property","volume",70');
    expect(writes.join('\n')).toContain('"set_property","aid",2');
  });
});
```

- [ ] **Step 2: Create player engine types**

Create `electron/player/playerTypes.ts`.

```ts
import type { PlayerCommand } from '../../shared/ipc';
import type { PlaybackRequest, PlayerState } from '../../types/app';

export interface PlayerEngine {
  start(request: PlaybackRequest): Promise<PlayerState>;
  command(command: PlayerCommand): Promise<PlayerState>;
  stop(): Promise<PlayerState>;
  currentState(): PlayerState;
  onState(callback: (state: PlayerState) => void): () => void;
}
```

- [ ] **Step 3: Implement mpv locator**

Create `electron/player/mpvLocator.ts`.

```ts
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export type MpvLocation = { available: true; path: string; message: string } | { available: false; path?: string; message: string };

export async function locateMpv(appPath: string): Promise<MpvLocation> {
  const bundled = path.join(appPath, 'resources', 'mpv', 'mpv.exe');
  if (fs.existsSync(bundled)) return { available: true, path: bundled, message: 'Bundled mpv found' };

  const fromPath = spawnSync('where.exe', ['mpv.exe'], { encoding: 'utf8' });
  const first = fromPath.stdout.split(/\r?\n/).find(Boolean);
  if (fromPath.status === 0 && first) return { available: true, path: first.trim(), message: 'System mpv found' };

  return {
    available: false,
    message: 'mpv.exe was not found. Place mpv.exe under resources/mpv or install mpv and add it to PATH.',
  };
}
```

- [ ] **Step 4: Implement mpv adapter**

Create `electron/player/mpvAdapter.ts`.

```ts
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import type { PlayerCommand } from '../../shared/ipc';
import type { PlaybackRequest, PlayerState, TrackInfo } from '../../types/app';
import type { PlayerEngine } from './playerTypes';

type Deps = {
  spawnProcess?: typeof spawn;
};

const idleState: PlayerState = {
  status: 'idle',
  positionSeconds: 0,
  volume: 100,
  muted: false,
  fullscreen: false,
  audioTracks: [],
  subtitleTracks: [],
};

export class MpvAdapter implements PlayerEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private state: PlayerState = idleState;
  private listeners = new Set<(state: PlayerState) => void>();
  private requestId = 1;

  constructor(private readonly mpvPath: string | undefined, private readonly deps: Deps = {}) {}

  async start(request: PlaybackRequest): Promise<PlayerState> {
    if (!this.mpvPath) {
      return this.update({ ...idleState, status: 'failed', error: 'mpv.exe is unavailable. Open Diagnostics for setup steps.' });
    }
    if (!this.process) this.spawnMpv();
    this.update({ ...this.state, status: 'connecting', title: request.title, itemId: request.itemId, error: undefined });
    this.send(['loadfile', request.streamUrl, 'replace']);
    this.send(['set_property', 'hwdec', 'auto-safe']);
    this.send(['observe_property', 1, 'time-pos']);
    this.send(['observe_property', 2, 'duration']);
    this.send(['observe_property', 3, 'pause']);
    this.send(['observe_property', 4, 'track-list']);
    this.send(['observe_property', 5, 'video-params']);
    this.send(['observe_property', 6, 'audio-params']);
    return this.state;
  }

  async command(command: PlayerCommand): Promise<PlayerState> {
    if (command.type === 'playPause') this.send(['cycle', 'pause']);
    if (command.type === 'stop') return this.stop();
    if (command.type === 'seek') this.send(['seek', command.seconds, command.mode === 'absolute' ? 'absolute' : 'relative']);
    if (command.type === 'setVolume') {
      this.send(['set_property', 'volume', command.volume]);
      this.update({ ...this.state, volume: command.volume });
    }
    if (command.type === 'mute') {
      this.send(['set_property', 'mute', command.muted]);
      this.update({ ...this.state, muted: command.muted });
    }
    if (command.type === 'fullscreen') {
      this.send(['set_property', 'fullscreen', command.fullscreen]);
      this.update({ ...this.state, fullscreen: command.fullscreen });
    }
    if (command.type === 'selectAudioTrack') this.send(['set_property', 'aid', command.id]);
    if (command.type === 'selectSubtitleTrack') this.send(['set_property', 'sid', command.id ?? 'no']);
    return this.state;
  }

  async stop(): Promise<PlayerState> {
    this.send(['stop']);
    return this.update({ ...idleState, volume: this.state.volume, muted: this.state.muted });
  }

  currentState(): PlayerState {
    return this.state;
  }

  onState(callback: (state: PlayerState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private spawnMpv() {
    const spawnProcess = this.deps.spawnProcess ?? spawn;
    this.process = spawnProcess(this.mpvPath!, [
      '--idle=yes',
      '--force-window=yes',
      '--input-terminal=no',
      '--input-ipc-server=',
      '--term-playing-msg=',
      '--msg-level=all=v',
      '--audio-channels=auto',
      '--hwdec=auto-safe',
    ], { stdio: 'pipe', windowsHide: false }) as ChildProcessWithoutNullStreams;

    this.process.stdout.on('data', (chunk) => this.handleOutput(String(chunk)));
    this.process.stderr.on('data', (chunk) => {
      const text = String(chunk);
      if (/error|failed/i.test(text)) this.update({ ...this.state, status: 'failed', error: text.trim().slice(0, 500) });
    });
    this.process.on('exit', () => {
      this.process = null;
      this.update({ ...this.state, status: this.state.status === 'idle' ? 'idle' : 'ended' });
    });
  }

  private send(command: unknown[]) {
    this.process?.stdin.write(`${JSON.stringify({ command, request_id: this.requestId++ })}\n`);
  }

  private handleOutput(output: string) {
    for (const line of output.split(/\r?\n/).filter(Boolean)) {
      try {
        const message = JSON.parse(line);
        if (message.event === 'file-loaded') this.update({ ...this.state, status: 'playing' });
        if (message.event === 'pause') this.update({ ...this.state, status: 'paused' });
        if (message.event === 'unpause') this.update({ ...this.state, status: 'playing' });
        if (message.event === 'end-file') this.update({ ...this.state, status: 'ended' });
        if (message.event === 'property-change') this.applyProperty(message.name, message.data);
      } catch {
        if (/buffer/i.test(line)) this.update({ ...this.state, status: 'buffering' });
      }
    }
  }

  private applyProperty(name: string, data: any) {
    if (name === 'time-pos') this.update({ ...this.state, positionSeconds: Number(data ?? 0) });
    if (name === 'duration') this.update({ ...this.state, durationSeconds: Number(data ?? 0) });
    if (name === 'pause') this.update({ ...this.state, status: data ? 'paused' : 'playing' });
    if (name === 'track-list') {
      const tracks = Array.isArray(data) ? data : [];
      const mapTrack = (track: any): TrackInfo => ({ id: Number(track.id), type: track.type, title: track.title, lang: track.lang, selected: Boolean(track.selected) });
      this.update({
        ...this.state,
        audioTracks: tracks.filter((track) => track.type === 'audio').map(mapTrack),
        subtitleTracks: tracks.filter((track) => track.type === 'sub').map(mapTrack),
      });
    }
    if (name === 'video-params') this.update({ ...this.state, videoParams: { width: data?.w, height: data?.h, codec: data?.pixelformat, fps: data?.fps } });
    if (name === 'audio-params') this.update({ ...this.state, audioParams: { codec: data?.format, channels: data?.['channel-count'] ? `${data['channel-count']}ch` : data?.channels, samplerate: data?.samplerate } });
  }

  private update(next: PlayerState): PlayerState {
    this.state = next;
    for (const listener of this.listeners) listener(next);
    return next;
  }
}
```

- [ ] **Step 5: Write player service tests**

Create `tests/player/playerService.test.ts`.

```ts
import { describe, expect, it, vi } from 'vitest';
import { PlayerService } from '../../electron/player/playerService';

describe('PlayerService', () => {
  it('starts playback and relays state changes', async () => {
    const state = { status: 'playing', positionSeconds: 0, volume: 100, muted: false, fullscreen: false, audioTracks: [], subtitleTracks: [] };
    const callbacks = new Set<(value: any) => void>();
    const service = new PlayerService({
      start: vi.fn(async () => state),
      command: vi.fn(async () => state),
      stop: vi.fn(async () => state),
      currentState: vi.fn(() => state),
      onState: vi.fn((callback) => {
        callbacks.add(callback);
        return () => callbacks.delete(callback);
      }),
    }, vi.fn());

    await expect(service.start({ kind: 'live', itemId: 'live:1', title: 'Channel', streamUrl: 'http://example.test/live.ts' })).resolves.toBe(state);
  });
});
```

- [ ] **Step 6: Implement player service**

Create `electron/player/playerService.ts`.

```ts
import type { PlayerCommand } from '../../shared/ipc';
import type { PlaybackRequest, PlayerState } from '../../types/app';
import type { PlayerEngine } from './playerTypes';

export class PlayerService {
  private playlist: string[] = [];
  private activeRequest: PlaybackRequest | null = null;

  constructor(private readonly engine: PlayerEngine, private readonly emit: (state: PlayerState) => void) {
    this.engine.onState((state) => this.emit(state));
  }

  async start(request: PlaybackRequest): Promise<PlayerState> {
    this.activeRequest = request;
    this.playlist = request.playlistItemIds ?? [];
    const state = await this.engine.start(request);
    this.emit(state);
    return state;
  }

  async command(command: PlayerCommand): Promise<PlayerState> {
    const state = await this.engine.command(command);
    this.emit(state);
    return state;
  }

  state(): PlayerState {
    return this.engine.currentState();
  }
}
```

- [ ] **Step 7: Run player tests**

Run:

```powershell
npm test -- tests/player/mpvAdapter.test.ts tests/player/playerService.test.ts
```

Expected: player adapter and service tests pass.

- [ ] **Step 8: Commit mpv engine**

Run:

```powershell
git add electron/player tests/player
git commit -m "feat: add mpv player engine"
```

Expected: mpv adapter, locator, and service are committed.

## Task 7: Renderer State And App Boot

**Files:**
- Modify: `store/useAppStore.ts`
- Create: `store/playerStore.ts`
- Modify: `App.tsx`
- Modify: `router.tsx`
- Modify: `components/RequireProfile.tsx`
- Modify: `components/ConnectWizard.tsx`

- [ ] **Step 1: Replace browser persisted app store**

Replace `store/useAppStore.ts`.

```ts
import { create } from 'zustand';
import type { CatalogSnapshot, Favourite, Profile, RefreshProgress } from '../types/app';

type AppState = CatalogSnapshot & {
  booted: boolean;
  loading: boolean;
  error?: string;
  refreshProgress?: RefreshProgress;
  boot: () => Promise<void>;
  connect: (input: { name: string; serverUrl: string; username: string; password: string }) => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
  toggleFavourite: (favourite: Favourite) => Promise<void>;
};

const emptySnapshot: CatalogSnapshot = {
  profile: null,
  liveCategories: [],
  movieCategories: [],
  seriesCategories: [],
  liveChannels: [],
  movies: [],
  series: [],
  episodes: [],
  epg: [],
  favourites: [],
  progress: [],
  settings: { hardwareAcceleration: true, subtitlesEnabled: true, cacheTtlHours: 12 },
};

export const useAppStore = create<AppState>((set, get) => ({
  ...emptySnapshot,
  booted: false,
  loading: false,
  async boot() {
    set({ loading: true, error: undefined });
    const unsubscribe = window.titon.onRefreshProgress((refreshProgress) => set({ refreshProgress }));
    try {
      const snapshot = await window.titon.appReady();
      set({ ...snapshot, booted: true, loading: false });
    } catch (error) {
      unsubscribe();
      set({ error: error instanceof Error ? error.message : String(error), booted: true, loading: false });
    }
  },
  async connect(input) {
    set({ loading: true, error: undefined });
    try {
      const profile: Profile = await window.titon.connectProfile({ name: input.name, credentials: { serverUrl: input.serverUrl, username: input.username, password: input.password } });
      set({ profile, loading: false });
      await get().refresh();
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  async disconnect() {
    await window.titon.disconnectProfile();
    set({ ...emptySnapshot, booted: true });
  },
  async refresh() {
    set({ loading: true, error: undefined });
    try {
      await window.titon.refreshCatalog();
      const snapshot = await window.titon.getCatalog();
      set({ ...snapshot, loading: false });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  },
  async toggleFavourite(favourite) {
    const favourites = await window.titon.toggleFavourite(favourite);
    set({ favourites });
  },
}));
```

- [ ] **Step 2: Add player store**

Create `store/playerStore.ts`.

```ts
import { create } from 'zustand';
import type { PlaybackRequest, PlayerState } from '../types/app';
import type { PlayerCommand } from '../shared/ipc';

const initialState: PlayerState = {
  status: 'idle',
  positionSeconds: 0,
  volume: 100,
  muted: false,
  fullscreen: false,
  audioTracks: [],
  subtitleTracks: [],
};

type PlayerStore = {
  state: PlayerState;
  controlsVisible: boolean;
  start: (request: PlaybackRequest) => Promise<void>;
  command: (command: PlayerCommand) => Promise<void>;
  attach: () => () => void;
  showControls: () => void;
  hideControls: () => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  state: initialState,
  controlsVisible: true,
  async start(request) {
    const state = await window.titon.startPlayback(request);
    set({ state, controlsVisible: true });
  },
  async command(command) {
    const state = await window.titon.sendPlayerCommand(command);
    set({ state });
  },
  attach() {
    return window.titon.onPlayerState((state) => set({ state }));
  },
  showControls() {
    set({ controlsVisible: true });
  },
  hideControls() {
    set({ controlsVisible: false });
  },
}));
```

- [ ] **Step 3: Boot app from IPC**

Replace `App.tsx`.

```tsx
import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAppStore } from './store/useAppStore';
import { usePlayerStore } from './store/playerStore';
import Loader from './components/Loader';

function App() {
  const boot = useAppStore((state) => state.boot);
  const booted = useAppStore((state) => state.booted);
  const attachPlayer = usePlayerStore((state) => state.attach);

  useEffect(() => {
    boot();
    return attachPlayer();
  }, [boot, attachPlayer]);

  if (!booted) {
    return <div className="h-full bg-slate-950 text-slate-100 flex items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="h-full bg-slate-950 text-slate-100 antialiased">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Add all required routes**

Replace `router.tsx`.

```tsx
import { createHashRouter } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import RequireProfile from './components/RequireProfile';
import Home from './pages/Home';
import LiveTv from './pages/LiveTv';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Epg from './pages/Epg';
import Favourites from './pages/Favourites';
import Settings from './pages/Settings';
import Diagnostics from './pages/Diagnostics';

const router = createHashRouter([
  { path: '/connect', element: <Home /> },
  {
    path: '/',
    element: <RequireProfile><AppLayout /></RequireProfile>,
    children: [
      { index: true, element: <LiveTv /> },
      { path: 'live-tv', element: <LiveTv /> },
      { path: 'movies', element: <Movies /> },
      { path: 'series', element: <Series /> },
      { path: 'epg', element: <Epg /> },
      { path: 'favourites', element: <Favourites /> },
      { path: 'settings', element: <Settings /> },
      { path: 'diagnostics', element: <Diagnostics /> },
    ],
  },
]);

export default router;
```

- [ ] **Step 5: Replace profile guard**

Replace `components/RequireProfile.tsx`.

```tsx
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const profile = useAppStore((state) => state.profile);
  if (!profile) return <Navigate to="/connect" replace />;
  return <>{children}</>;
};

export default RequireProfile;
```

- [ ] **Step 6: Make connection Xtream-only**

Replace `components/ConnectWizard.tsx`.

```tsx
import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv } from 'lucide-react';
import Loader from './Loader';
import { useAppStore } from '../store/useAppStore';

const ConnectWizard: React.FC = () => {
  const navigate = useNavigate();
  const { connect, loading, error, profile, refreshProgress } = useAppStore((state) => ({
    connect: state.connect,
    loading: state.loading,
    error: state.error,
    profile: state.profile,
    refreshProgress: state.refreshProgress,
  }));
  const [name, setName] = useState('Home IPTV');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (profile) navigate('/live-tv', { replace: true });
  }, [profile, navigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    connect({ name, serverUrl, username, password });
  }

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
      <form onSubmit={handleSubmit} className="p-7 space-y-5">
        <div className="flex items-center gap-3">
          <Tv className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Titon IPTV Player</h1>
            <p className="text-sm text-slate-400">Connect an Xtream Codes profile</p>
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-300">Profile name</span>
          <input className="form-input mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Server URL</span>
          <input className="form-input mt-1" value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} placeholder="http://server.example:8080" required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Username</span>
          <input className="form-input mt-1" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Password</span>
          <input className="form-input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {refreshProgress && <p className="text-sm text-cyan-200">{refreshProgress.message}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button className="w-full h-11 rounded-md bg-cyan-500 text-slate-950 font-semibold disabled:bg-slate-600" disabled={loading}>
          {loading ? <Loader /> : 'Connect and Refresh'}
        </button>
      </form>
    </div>
  );
};

export default ConnectWizard;
```

- [ ] **Step 7: Run renderer typecheck**

Run:

```powershell
npm run typecheck
```

Expected: remaining failures are limited to pages and components that still expect old type names or missing new pages.

- [ ] **Step 8: Commit app state boot**

Run:

```powershell
git add store App.tsx router.tsx components/RequireProfile.tsx components/ConnectWizard.tsx
git commit -m "feat: boot renderer from desktop services"
```

Expected: renderer state uses the Electron bridge instead of browser localStorage.

## Task 8: App Shell And Navigation

**Files:**
- Modify: `components/AppLayout.tsx`
- Modify: `components/TopNav.tsx`
- Modify: `components/icons.tsx`

- [ ] **Step 1: Replace app layout**

Replace `components/AppLayout.tsx`.

```tsx
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useAppStore } from '../store/useAppStore';

const AppLayout: React.FC = () => {
  const refreshProgress = useAppStore((state) => state.refreshProgress);
  return (
    <div className="h-full flex flex-col bg-slate-950">
      <TopNav />
      {refreshProgress && refreshProgress.phase !== 'complete' && (
        <div className="h-8 bg-cyan-950 text-cyan-100 px-4 flex items-center text-sm">
          {refreshProgress.message}
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
```

- [ ] **Step 2: Replace top navigation**

Replace `components/TopNav.tsx`.

```tsx
import { Heart, ListVideo, MonitorPlay, RefreshCcw, Search, Settings, Tv, Video, Wrench } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const links = [
  { to: '/live-tv', label: 'Live TV', icon: MonitorPlay },
  { to: '/movies', label: 'Movies', icon: Video },
  { to: '/series', label: 'Series', icon: Tv },
  { to: '/epg', label: 'EPG', icon: ListVideo },
  { to: '/favourites', label: 'Favourites', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/diagnostics', label: 'Diagnostics', icon: Wrench },
];

const TopNav: React.FC = () => {
  const navigate = useNavigate();
  const refresh = useAppStore((state) => state.refresh);
  const disconnect = useAppStore((state) => state.disconnect);
  const profile = useAppStore((state) => state.profile);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Tv className="h-7 w-7 text-cyan-400 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">Titon IPTV</div>
          <div className="text-xs text-slate-400 truncate">{profile?.name}</div>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `h-10 px-3 rounded-md flex items-center gap-2 text-sm ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden xl:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button className="icon-button" title="Search" onClick={() => navigate('/live-tv')}>
          <Search className="h-4 w-4" />
        </button>
        <button className="icon-button" title="Refresh provider" onClick={() => refresh()}>
          <RefreshCcw className="h-4 w-4" />
        </button>
        <button className="text-sm text-slate-300 hover:text-white px-3 h-10 rounded-md hover:bg-slate-800" onClick={() => disconnect().then(() => navigate('/connect'))}>
          Disconnect
        </button>
      </div>
    </header>
  );
};

export default TopNav;
```

- [ ] **Step 3: Keep old icons compatible**

Replace `components/icons.tsx`.

```tsx
export { ArrowLeftToLine as ArrowLeftOnRectangleIcon, Film as FilmIcon, Tv as TvIcon, Video as VideoCameraIcon } from 'lucide-react';
```

- [ ] **Step 4: Add global utility classes**

In `index.tsx`, add a stylesheet import at the top after React imports:

```tsx
import './styles.css';
```

Create `styles.css`.

```css
html,
body {
  margin: 0;
  height: 100%;
  background: #020617;
  color: #e2e8f0;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

.form-input {
  width: 100%;
  height: 2.75rem;
  border-radius: 0.375rem;
  border: 1px solid #334155;
  background: #0f172a;
  color: #f8fafc;
  padding: 0 0.75rem;
  outline: none;
}

.form-input:focus {
  border-color: #22d3ee;
  box-shadow: 0 0 0 2px rgba(34, 211, 238, 0.2);
}

.icon-button {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.375rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: transparent;
  border: 0;
}

.icon-button:hover {
  color: #fff;
  background: #1e293b;
}
```

- [ ] **Step 5: Run renderer build**

Run:

```powershell
npm run build:renderer
```

Expected: Vite builds without CDN import-map usage.

- [ ] **Step 6: Commit shell**

Run:

```powershell
git add components/AppLayout.tsx components/TopNav.tsx components/icons.tsx index.tsx styles.css
git commit -m "feat: add complete app navigation shell"
```

Expected: shell navigation for all first-version areas is committed.

## Task 9: Custom mpv-Backed Player UI

**Files:**
- Replace: `components/Player.tsx`
- Create: `components/player/PlayerOverlay.tsx`
- Create: `components/player/usePlayerShortcuts.ts`

- [ ] **Step 1: Add keyboard shortcuts**

Create `components/player/usePlayerShortcuts.ts`.

```ts
import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';

export function usePlayerShortcuts(enabled: boolean) {
  const command = usePlayerStore((state) => state.command);
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      if (event.code === 'Space') {
        event.preventDefault();
        command({ type: 'playPause' });
      }
      if (event.key === 'ArrowRight') command({ type: 'seek', seconds: 10, mode: 'relative' });
      if (event.key === 'ArrowLeft') command({ type: 'seek', seconds: -10, mode: 'relative' });
      if (event.key === 'ArrowUp') command({ type: 'setVolume', volume: 100 });
      if (event.key === 'ArrowDown') command({ type: 'setVolume', volume: 40 });
      if (event.key.toLowerCase() === 'm') command({ type: 'mute', muted: true });
      if (event.key.toLowerCase() === 'f') command({ type: 'fullscreen', fullscreen: true });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [command, enabled]);
}
```

- [ ] **Step 2: Add player overlay controls**

Create `components/player/PlayerOverlay.tsx`.

```tsx
import { Maximize2, Pause, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';

function formatTime(value?: number) {
  if (!value || Number.isNaN(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

const PlayerOverlay: React.FC = () => {
  const { state, command } = usePlayerStore((store) => ({ state: store.state, command: store.command }));
  const isPaused = state.status === 'paused';
  const canSeek = Boolean(state.durationSeconds);

  return (
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-4 text-white">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-lg font-semibold truncate">{state.title}</div>
          <div className="text-sm text-slate-300">
            {state.status}
            {state.videoParams?.height ? ` · ${state.videoParams.height}p` : ''}
            {state.audioParams?.channels ? ` · ${state.audioParams.channels}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-button" title="Previous" onClick={() => command({ type: 'previous' })}><SkipBack className="h-5 w-5" /></button>
          <button className="icon-button" title={isPaused ? 'Play' : 'Pause'} onClick={() => command({ type: 'playPause' })}>{isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
          <button className="icon-button" title="Stop" onClick={() => command({ type: 'stop' })}><Square className="h-5 w-5" /></button>
          <button className="icon-button" title="Next" onClick={() => command({ type: 'next' })}><SkipForward className="h-5 w-5" /></button>
          <button className="icon-button" title={state.muted ? 'Unmute' : 'Mute'} onClick={() => command({ type: 'mute', muted: !state.muted })}>{state.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
          <input aria-label="Volume" type="range" min={0} max={100} value={state.volume} onChange={(event) => command({ type: 'setVolume', volume: Number(event.target.value) })} />
          <button className="icon-button" title="Fullscreen" onClick={() => command({ type: 'fullscreen', fullscreen: !state.fullscreen })}><Maximize2 className="h-5 w-5" /></button>
        </div>
      </div>
      {canSeek && (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <span>{formatTime(state.positionSeconds)}</span>
          <input className="flex-1" aria-label="Seek" type="range" min={0} max={state.durationSeconds ?? 0} value={state.positionSeconds} onChange={(event) => command({ type: 'seek', seconds: Number(event.target.value), mode: 'absolute' })} />
          <span>{formatTime(state.durationSeconds)}</span>
        </div>
      )}
      {(state.audioTracks.length > 0 || state.subtitleTracks.length > 0) && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {state.audioTracks.length > 0 && (
            <select className="form-input max-w-52 h-9" value={state.audioTracks.find((track) => track.selected)?.id ?? ''} onChange={(event) => command({ type: 'selectAudioTrack', id: Number(event.target.value) })}>
              {state.audioTracks.map((track) => <option key={track.id} value={track.id}>{track.title || track.lang || `Audio ${track.id}`}</option>)}
            </select>
          )}
          {state.subtitleTracks.length > 0 && (
            <select className="form-input max-w-52 h-9" value={state.subtitleTracks.find((track) => track.selected)?.id ?? 'off'} onChange={(event) => command({ type: 'selectSubtitleTrack', id: event.target.value === 'off' ? null : Number(event.target.value) })}>
              <option value="off">Subtitles off</option>
              {state.subtitleTracks.map((track) => <option key={track.id} value={track.id}>{track.title || track.lang || `Subtitle ${track.id}`}</option>)}
            </select>
          )}
        </div>
      )}
      {state.error && <div className="mt-3 text-sm text-red-200">{state.error}</div>}
    </div>
  );
};

export default PlayerOverlay;
```

- [ ] **Step 3: Replace player component**

Replace `components/Player.tsx`.

```tsx
import { useEffect } from 'react';
import type { PlaybackRequest } from '../types/app';
import { usePlayerStore } from '../store/playerStore';
import PlayerOverlay from './player/PlayerOverlay';
import { usePlayerShortcuts } from './player/usePlayerShortcuts';

type PlayerProps = {
  request: PlaybackRequest | null;
};

const Player: React.FC<PlayerProps> = ({ request }) => {
  const start = usePlayerStore((state) => state.start);
  const playerState = usePlayerStore((state) => state.state);
  const controlsVisible = usePlayerStore((state) => state.controlsVisible);
  const showControls = usePlayerStore((state) => state.showControls);
  const hideControls = usePlayerStore((state) => state.hideControls);

  usePlayerShortcuts(Boolean(request));

  useEffect(() => {
    if (request) start(request);
  }, [request, start]);

  if (!request) {
    return <div className="h-full w-full bg-black flex items-center justify-center text-slate-500">Select something to play</div>;
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden" onMouseMove={showControls} onMouseLeave={hideControls}>
      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
        {playerState.status === 'connecting' || playerState.status === 'buffering' ? playerState.status : 'mpv playback window'}
      </div>
      {controlsVisible && <PlayerOverlay />}
    </div>
  );
};

export default Player;
```

- [ ] **Step 4: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: failures are limited to pages that still pass `streamUrl` and `title` instead of `request`.

- [ ] **Step 5: Commit player UI**

Run:

```powershell
git add components/Player.tsx components/player store/playerStore.ts
git commit -m "feat: add custom mpv player controls"
```

Expected: custom player UI is committed.

## Task 10: Live TV, Movies, Series, EPG, And Favourites Screens

**Files:**
- Modify: `pages/LiveTv.tsx`
- Modify: `pages/Movies.tsx`
- Modify: `pages/Series.tsx`
- Create: `pages/Epg.tsx`
- Create: `pages/Favourites.tsx`

- [ ] **Step 1: Replace Live TV screen**

Replace `pages/LiveTv.tsx` with grouped channels, favourites, EPG detail, and player launch.

```tsx
import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import Player from '../components/Player';
import { useAppStore } from '../store/useAppStore';
import type { LiveChannel, PlaybackRequest } from '../types/app';

const LiveTv: React.FC = () => {
  const { liveChannels, liveCategories, epg, favourites, toggleFavourite } = useAppStore((state) => state);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [selected, setSelected] = useState<LiveChannel | null>(liveChannels[0] ?? null);
  const [request, setRequest] = useState<PlaybackRequest | null>(null);

  const filtered = useMemo(() => liveChannels.filter((channel) =>
    (categoryId === 'all' || channel.categoryId === categoryId) &&
    channel.name.toLowerCase().includes(query.toLowerCase())
  ), [liveChannels, categoryId, query]);

  const schedule = selected ? epg.filter((programme) => programme.channelId === selected.id).slice(0, 12) : [];
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'live').map((item) => item.itemId));

  function play(channel: LiveChannel) {
    setSelected(channel);
    setRequest({ kind: 'live', itemId: channel.id, title: channel.name, streamUrl: channel.streamUrl, playlistItemIds: filtered.map((item) => item.id) });
  }

  return (
    <div className="h-full grid grid-cols-[22rem_1fr] bg-slate-950">
      <aside className="min-h-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 space-y-3">
          <input className="form-input" placeholder="Search channels" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">All categories</option>
            {liveCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((channel) => (
            <button key={channel.id} className={`w-full p-3 flex items-center gap-3 text-left hover:bg-slate-900 ${selected?.id === channel.id ? 'bg-slate-900 border-l-2 border-cyan-400' : ''}`} onClick={() => setSelected(channel)}>
              <img src={channel.logoUrl || ''} alt="" className="h-10 w-10 rounded bg-slate-800 object-cover" />
              <span className="flex-1 truncate">{channel.name}</span>
              <Play className="h-4 w-4 text-cyan-300" onClick={(event) => { event.stopPropagation(); play(channel); }} />
              <Heart className={`h-4 w-4 ${favouriteIds.has(channel.id) ? 'fill-cyan-300 text-cyan-300' : 'text-slate-500'}`} onClick={(event) => { event.stopPropagation(); toggleFavourite({ kind: 'live', itemId: channel.id, createdAt: new Date().toISOString() }); }} />
            </button>
          ))}
        </div>
      </aside>
      <section className="min-h-0 grid grid-rows-[1fr_11rem]">
        <Player request={request} />
        <div className="border-t border-slate-800 bg-slate-900/80 p-4 overflow-y-auto">
          <h2 className="font-semibold text-white">{selected?.name ?? 'No channel selected'}</h2>
          <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
            {schedule.map((programme) => <div key={programme.id} className="text-sm text-slate-300"><span className="text-slate-500">{new Date(programme.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {programme.title}</div>)}
            {selected && schedule.length === 0 && <p className="text-sm text-slate-500">No EPG data available for this channel.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveTv;
```

- [ ] **Step 2: Replace Movies screen**

Replace `pages/Movies.tsx` with VOD browsing and playback launch.

```tsx
import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';

const Movies: React.FC = () => {
  const { movies, movieCategories, favourites, toggleFavourite, progress } = useAppStore((state) => state);
  const start = usePlayerStore((state) => state.start);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'movie').map((item) => item.itemId));
  const filtered = useMemo(() => movies.filter((movie) => (categoryId === 'all' || movie.categoryId === categoryId) && movie.title.toLowerCase().includes(query.toLowerCase())), [movies, categoryId, query]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex gap-3">
        <input className="form-input max-w-md" placeholder="Search movies" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="form-input max-w-xs" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {movieCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7 gap-4">
        {filtered.map((movie) => {
          const saved = progress.find((item) => item.kind === 'movie' && item.itemId === movie.id);
          return (
            <article key={movie.id} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <img src={movie.posterUrl || ''} alt="" className="aspect-[2/3] w-full object-cover bg-slate-800" />
              <div className="p-3 space-y-2">
                <h2 className="font-medium text-white line-clamp-2">{movie.title}</h2>
                <p className="text-xs text-slate-400">{movie.releaseYear ?? 'Unknown year'} {saved ? `· Resume ${Math.floor(saved.positionSeconds / 60)}m` : ''}</p>
                <div className="flex gap-2">
                  <button className="icon-button" title="Play" onClick={() => start({ kind: 'movie', itemId: movie.id, title: movie.title, streamUrl: movie.streamUrl })}><Play className="h-4 w-4" /></button>
                  <button className="icon-button" title="Favourite" onClick={() => toggleFavourite({ kind: 'movie', itemId: movie.id, createdAt: new Date().toISOString() })}><Heart className={`h-4 w-4 ${favouriteIds.has(movie.id) ? 'fill-cyan-300 text-cyan-300' : ''}`} /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Movies;
```

- [ ] **Step 3: Replace Series screen**

Replace `pages/Series.tsx`.

```tsx
import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import type { Series as SeriesItem } from '../types/app';

const Series: React.FC = () => {
  const { series, episodes, seriesCategories, favourites, toggleFavourite, progress } = useAppStore((state) => state);
  const start = usePlayerStore((state) => state.start);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [selected, setSelected] = useState<SeriesItem | null>(series[0] ?? null);
  const filtered = useMemo(() => series.filter((item) => (categoryId === 'all' || item.categoryId === categoryId) && item.title.toLowerCase().includes(query.toLowerCase())), [series, categoryId, query]);
  const selectedEpisodes = selected ? episodes.filter((episode) => episode.seriesId === selected.id) : [];
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'series').map((item) => item.itemId));

  return (
    <div className="h-full grid grid-cols-[24rem_1fr] bg-slate-950">
      <aside className="border-r border-slate-800 overflow-y-auto p-4 space-y-3">
        <input className="form-input" placeholder="Search series" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {seriesCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        {filtered.map((item) => (
          <button key={item.id} className={`w-full text-left p-3 rounded-md hover:bg-slate-900 ${selected?.id === item.id ? 'bg-slate-900' : ''}`} onClick={() => setSelected(item)}>
            <div className="font-medium text-white">{item.title}</div>
            <div className="text-xs text-slate-400">{item.releaseYear ?? ''}</div>
          </button>
        ))}
      </aside>
      <section className="overflow-y-auto p-5">
        {selected ? (
          <div className="space-y-5">
            <div className="flex gap-5">
              <img src={selected.posterUrl || ''} alt="" className="w-40 aspect-[2/3] object-cover rounded-lg bg-slate-800" />
              <div>
                <h1 className="text-2xl font-semibold text-white">{selected.title}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{selected.plot}</p>
                <button className="mt-4 icon-button" title="Favourite series" onClick={() => toggleFavourite({ kind: 'series', itemId: selected.id, createdAt: new Date().toISOString() })}><Heart className={`h-5 w-5 ${favouriteIds.has(selected.id) ? 'fill-cyan-300 text-cyan-300' : ''}`} /></button>
              </div>
            </div>
            <div className="space-y-2">
              {selectedEpisodes.map((episode) => {
                const saved = progress.find((item) => item.kind === 'episode' && item.itemId === episode.id);
                return (
                  <div key={episode.id} className="h-14 rounded-md bg-slate-900 border border-slate-800 px-3 flex items-center gap-3">
                    <button className="icon-button" title="Play episode" onClick={() => start({ kind: 'episode', itemId: episode.id, title: `${selected.title} - ${episode.title}`, streamUrl: episode.streamUrl })}><Play className="h-4 w-4" /></button>
                    <div className="flex-1">
                      <div className="text-white">S{episode.seasonNumber} E{episode.episodeNumber}: {episode.title}</div>
                      {saved && <div className="text-xs text-slate-400">Resume at {Math.floor(saved.positionSeconds / 60)}m</div>}
                    </div>
                    <button className="icon-button" title="Favourite episode" onClick={() => toggleFavourite({ kind: 'episode', itemId: episode.id, createdAt: new Date().toISOString() })}><Heart className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="text-slate-500">Select a series</div>}
      </section>
    </div>
  );
};

export default Series;
```

- [ ] **Step 4: Add EPG page**

Create `pages/Epg.tsx`.

```tsx
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const Epg: React.FC = () => {
  const { liveChannels, epg } = useAppStore((state) => state);
  const [channelId, setChannelId] = useState(liveChannels[0]?.id ?? '');
  const programmes = useMemo(() => epg.filter((programme) => programme.channelId === channelId), [epg, channelId]);

  return (
    <div className="h-full grid grid-cols-[20rem_1fr]">
      <aside className="border-r border-slate-800 overflow-y-auto">
        {liveChannels.map((channel) => <button key={channel.id} className={`w-full text-left p-3 hover:bg-slate-900 ${channel.id === channelId ? 'bg-slate-900' : ''}`} onClick={() => setChannelId(channel.id)}>{channel.name}</button>)}
      </aside>
      <section className="overflow-y-auto p-5">
        <h1 className="text-xl font-semibold text-white mb-4">Programme Guide</h1>
        <div className="space-y-2">
          {programmes.map((programme) => (
            <article key={programme.id} className="rounded-md bg-slate-900 border border-slate-800 p-3">
              <div className="text-sm text-cyan-200">{new Date(programme.startAt).toLocaleString()} - {new Date(programme.endAt).toLocaleTimeString()}</div>
              <div className="font-medium text-white">{programme.title}</div>
              {programme.description && <p className="text-sm text-slate-400">{programme.description}</p>}
            </article>
          ))}
          {programmes.length === 0 && <p className="text-slate-500">No EPG data available for this channel.</p>}
        </div>
      </section>
    </div>
  );
};

export default Epg;
```

- [ ] **Step 5: Add Favourites page**

Create `pages/Favourites.tsx`.

```tsx
import { Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';

const Favourites: React.FC = () => {
  const { favourites, liveChannels, movies, series, episodes } = useAppStore((state) => state);
  const start = usePlayerStore((state) => state.start);

  const items = favourites.map((favourite) => {
    if (favourite.kind === 'live') return { favourite, item: liveChannels.find((channel) => channel.id === favourite.itemId), title: liveChannels.find((channel) => channel.id === favourite.itemId)?.name };
    if (favourite.kind === 'movie') return { favourite, item: movies.find((movie) => movie.id === favourite.itemId), title: movies.find((movie) => movie.id === favourite.itemId)?.title };
    if (favourite.kind === 'series') return { favourite, item: series.find((show) => show.id === favourite.itemId), title: series.find((show) => show.id === favourite.itemId)?.title };
    return { favourite, item: episodes.find((episode) => episode.id === favourite.itemId), title: episodes.find((episode) => episode.id === favourite.itemId)?.title };
  }).filter((entry) => entry.item);

  return (
    <div className="h-full overflow-y-auto p-5">
      <h1 className="text-xl font-semibold text-white mb-4">Favourites</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {items.map(({ favourite, item, title }) => (
          <article key={`${favourite.kind}:${favourite.itemId}`} className="h-16 rounded-md bg-slate-900 border border-slate-800 px-4 flex items-center gap-3">
            <div className="flex-1">
              <div className="text-white">{title}</div>
              <div className="text-xs text-slate-400">{favourite.kind}</div>
            </div>
            {'streamUrl' in (item as any) && (
              <button className="icon-button" title="Play" onClick={() => start({ kind: favourite.kind as any, itemId: favourite.itemId, title: title ?? 'Favourite', streamUrl: (item as any).streamUrl })}>
                <Play className="h-4 w-4" />
              </button>
            )}
          </article>
        ))}
        {items.length === 0 && <p className="text-slate-500">No favourites yet.</p>}
      </div>
    </div>
  );
};

export default Favourites;
```

- [ ] **Step 6: Run typecheck**

Run:

```powershell
npm run typecheck
```

Expected: Live TV, Movies, Series, EPG, and Favourites compile.

- [ ] **Step 7: Commit content screens**

Run:

```powershell
git add pages/LiveTv.tsx pages/Movies.tsx pages/Series.tsx pages/Epg.tsx pages/Favourites.tsx
git commit -m "feat: add xtream library screens"
```

Expected: all first-version content surfaces are committed.

## Task 11: Settings, Diagnostics, And Error Safety

**Files:**
- Create: `pages/Settings.tsx`
- Create: `pages/Diagnostics.tsx`
- Modify: `electron/xtream/client.ts`
- Modify: `electron/player/mpvAdapter.ts`

- [ ] **Step 1: Add Settings page**

Create `pages/Settings.tsx`.

```tsx
import { useEffect, useState } from 'react';
import type { AppSettings } from '../types/app';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.titon.getSettings().then(setSettings);
  }, []);

  if (!settings) return <div className="p-5 text-slate-500">Loading settings</div>;

  async function save(next: AppSettings) {
    setSettings(next);
    await window.titon.saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="h-full overflow-y-auto p-5 max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <label className="flex items-center justify-between rounded-md bg-slate-900 border border-slate-800 p-4">
        <span>
          <span className="block text-white">Hardware acceleration</span>
          <span className="text-sm text-slate-400">mpv uses safe automatic hardware decoding to preserve 2160p-capable playback when supported.</span>
        </span>
        <input type="checkbox" checked={settings.hardwareAcceleration} onChange={(event) => save({ ...settings, hardwareAcceleration: event.target.checked })} />
      </label>
      <label className="flex items-center justify-between rounded-md bg-slate-900 border border-slate-800 p-4">
        <span>
          <span className="block text-white">Subtitles enabled</span>
          <span className="text-sm text-slate-400">Subtitle tracks remain selectable in the player when the stream exposes them.</span>
        </span>
        <input type="checkbox" checked={settings.subtitlesEnabled} onChange={(event) => save({ ...settings, subtitlesEnabled: event.target.checked })} />
      </label>
      <label className="block rounded-md bg-slate-900 border border-slate-800 p-4">
        <span className="block text-white">Cache refresh window</span>
        <input className="form-input mt-2 max-w-40" type="number" min={1} max={168} value={settings.cacheTtlHours} onChange={(event) => save({ ...settings, cacheTtlHours: Number(event.target.value) })} />
      </label>
      <label className="block rounded-md bg-slate-900 border border-slate-800 p-4">
        <span className="block text-white">mpv path</span>
        <input className="form-input mt-2" value={settings.mpvPath ?? ''} onChange={(event) => setSettings({ ...settings, mpvPath: event.target.value || undefined })} onBlur={() => save(settings)} />
      </label>
      {saved && <p className="text-sm text-cyan-200">Settings saved</p>}
    </div>
  );
};

export default Settings;
```

- [ ] **Step 2: Add Diagnostics page**

Create `pages/Diagnostics.tsx`.

```tsx
import { useEffect, useState } from 'react';
import type { DiagnosticSnapshot } from '../types/app';

const Diagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot | null>(null);

  useEffect(() => {
    window.titon.getDiagnostics().then(setDiagnostics);
  }, []);

  if (!diagnostics) return <div className="p-5 text-slate-500">Loading diagnostics</div>;

  return (
    <div className="h-full overflow-y-auto p-5 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold text-white">Diagnostics</h1>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-slate-500">App</span><div>{diagnostics.appVersion}</div></div>
        <div><span className="text-slate-500">Electron</span><div>{diagnostics.electronVersion}</div></div>
        <div><span className="text-slate-500">Platform</span><div>{diagnostics.platform}</div></div>
        <div><span className="text-slate-500">mpv</span><div>{diagnostics.mpvAvailable ? diagnostics.mpvPath : 'Not found'}</div></div>
        <div className="col-span-2"><span className="text-slate-500">Database</span><div className="break-all">{diagnostics.databasePath}</div></div>
      </section>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4">
        <h2 className="font-medium text-white">Catalog</h2>
        <pre className="mt-2 text-sm text-slate-300">{JSON.stringify(diagnostics.catalogCounts, null, 2)}</pre>
      </section>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4">
        <h2 className="font-medium text-white">Recent Errors</h2>
        {diagnostics.recentErrors.length === 0 ? <p className="text-sm text-slate-500">No recent errors</p> : diagnostics.recentErrors.map((error) => <p key={error} className="text-sm text-red-200">{error}</p>)}
      </section>
    </div>
  );
};

export default Diagnostics;
```

- [ ] **Step 3: Ensure errors do not expose credentials**

In `electron/xtream/client.ts`, wrap thrown URL-related errors with `redactCredentialedUrl(url)` and never include raw `password` values in `Error.message`. Use this exact pattern in `getJson` and `getText`.

```ts
throw new XtreamError(`Provider returned HTTP ${response.status} for ${redactCredentialedUrl(url)}`);
```

- [ ] **Step 4: Ensure mpv errors are bounded**

In `electron/player/mpvAdapter.ts`, keep stderr errors at 500 characters and do not include full stream URLs.

```ts
const safe = text.replace(/\/(live|movie|series)\/([^/]+)\/([^/]+)\//, '/$1/$2/[redacted]/').trim().slice(0, 500);
if (/error|failed/i.test(safe)) this.update({ ...this.state, status: 'failed', error: safe });
```

- [ ] **Step 5: Run full tests**

Run:

```powershell
npm test
npm run typecheck
```

Expected: tests pass and both renderer and Electron typechecks pass.

- [ ] **Step 6: Commit settings and diagnostics**

Run:

```powershell
git add pages/Settings.tsx pages/Diagnostics.tsx electron/xtream/client.ts electron/player/mpvAdapter.ts
git commit -m "feat: add settings and diagnostics"
```

Expected: settings and diagnostics are committed.

## Task 12: Packaging Assets And Windows Build

**Files:**
- Modify: `builder.json`
- Create: `build/icon.svg`
- Create: `build/icon.png`
- Create: `build/icon.ico`
- Create: `resources/mpv/README.md`
- Modify: `.gitignore`

- [ ] **Step 1: Update builder config**

Replace `builder.json`.

```json
{
  "appId": "com.skyden.titoniptvplayer",
  "productName": "Titon IPTV Player",
  "copyright": "Copyright © 2026",
  "directories": {
    "output": "release",
    "buildResources": "build"
  },
  "files": [
    "dist/**/*",
    "dist-electron/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources/mpv",
      "to": "resources/mpv",
      "filter": ["**/*"]
    }
  ],
  "win": {
    "target": ["nsis", "portable"],
    "icon": "build/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": false,
    "allowElevation": true,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

- [ ] **Step 2: Add icon source**

Create `build/icon.svg`.

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" rx="48" fill="#020617"/>
  <path d="M52 74c0-12.15 9.85-22 22-22h108c12.15 0 22 9.85 22 22v74c0 12.15-9.85 22-22 22H74c-12.15 0-22-9.85-22-22V74z" fill="#0f172a" stroke="#22d3ee" stroke-width="10"/>
  <path d="M112 96l52 32-52 32V96z" fill="#22d3ee"/>
  <path d="M88 204h80" stroke="#e2e8f0" stroke-width="12" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Generate PNG and ICO**

Run with the bundled Node runtime and an image tool available in the workspace. If ImageMagick is installed:

```powershell
magick build/icon.svg -resize 512x512 build/icon.png
magick build/icon.svg -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

Expected: `build/icon.png` and `build/icon.ico` exist. If `magick` is unavailable, use a Node SVG-to-PNG/ICO package and record the exact command in the final implementation notes.

- [ ] **Step 4: Add mpv resource instructions**

Create `resources/mpv/README.md`.

```md
# mpv Runtime

Place the Windows mpv runtime files here for bundled builds.

Expected bundled path after packaging:

`resources/mpv/mpv.exe`

During development the app also checks `PATH` for `mpv.exe`. Playback is mpv-first; if mpv is missing, Diagnostics reports the setup action instead of falling back to Chromium video.
```

- [ ] **Step 5: Ensure large mpv binaries are handled intentionally**

Add this section to `.gitignore` while keeping the README tracked.

```gitignore
# Local mpv runtime binaries can be large; keep instructions tracked.
resources/mpv/*
!resources/mpv/README.md
```

- [ ] **Step 6: Run Windows build**

Run:

```powershell
npm run build
npm run build:win
```

Expected: `release/` contains the Windows installer and portable target. If `mpv.exe` is missing, the app still builds and Diagnostics reports the missing runtime.

- [ ] **Step 7: Commit packaging**

Run:

```powershell
git add builder.json build resources/mpv/README.md .gitignore
git commit -m "chore: configure windows packaging"
```

Expected: packaging assets and config are committed.

## Task 13: Manual Verification Checklist

**Files:**
- Create: `docs/manual-verification/windows-playback.md`
- Modify: `README.md`

- [ ] **Step 1: Add manual verification checklist**

Create `docs/manual-verification/windows-playback.md`.

```md
# Windows Playback Verification

Use a real Xtream Codes test account supplied by the user. Do not commit credentials, stream URLs, screenshots containing credentials, or provider-specific account data.

## Build Verification

- `npm run test` passes.
- `npm run build` passes.
- `npm run build:win` creates installer and portable artifacts under `release/`.
- `dist-electron/main.js` and `dist-electron/preload.js` exist after the build.

## Connection Verification

- Invalid credentials show a clear sanitized error.
- Valid credentials save one local profile.
- Provider refresh loads Live TV, Movies, Series, Episodes, and EPG where available.
- Diagnostics does not display passwords or full credentialed stream URLs.

## Playback Verification

- Live channel playback starts through mpv.
- Movie playback starts through mpv and seek controls work.
- Episode playback starts through mpv and seek controls work.
- Play/pause, stop, volume, mute, fullscreen, previous/next, audio track selector, subtitle selector, and keyboard shortcuts work.
- Player status transitions through connecting, playing, paused, ended, and failed when those states are triggered.
- A 2160p-capable provider stream is not downscaled by the app; confirm stream info shows the provider resolution when hardware supports it.
- A 5.1-capable provider stream exposes surround audio when the Windows audio device supports it; confirm stream info shows multichannel audio when available.

## Library Verification

- Live TV category filtering and search work.
- Movies category filtering and search work.
- Series details show seasons and episodes.
- EPG page shows programme entries when XMLTV is available.
- Favourites work for live channels, movies, series, and episodes.
- Resume/progress appears for movies and episodes after playback progress is saved.

## Failure Verification

- Missing mpv reports setup action in Diagnostics.
- Provider timeout shows retry guidance without exposing credentials.
- Empty categories render empty states.
- Missing logos and posters do not break layouts.
```

- [ ] **Step 2: Update README**

Replace `README.md`.

```md
# Titon IPTV Player

Windows desktop Xtream Codes IPTV player built with Electron, React, and mpv.

## Development

```powershell
npm install
npm run electron:dev
```

## Verification

```powershell
npm test
npm run build
npm run build:win
```

## Playback Runtime

Playback is mpv-first. During development, install `mpv.exe` on PATH or place the Windows mpv runtime under `resources/mpv`.

The app is designed to preserve provider stream capabilities up to 2160p and 5.1 audio when the provider stream, Windows hardware, GPU drivers, audio device, and codec support them.
```

- [ ] **Step 3: Run final automated verification**

Run:

```powershell
npm test
npm run build
```

Expected: automated tests and production build pass.

- [ ] **Step 4: Commit documentation**

Run:

```powershell
git add README.md docs/manual-verification/windows-playback.md
git commit -m "docs: add windows playback verification"
```

Expected: verification docs are committed.

## Task 14: Final Pass And Release Readiness

**Files:**
- Inspect: all changed files
- Inspect: `git status --short`
- Inspect: `npm audit`

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm test
npm run build
npm run build:win
```

Expected: tests pass, renderer builds, Electron output builds, and Windows package artifacts are produced.

- [ ] **Step 2: Run audit and record remaining risk**

Run:

```powershell
npm audit
```

Expected: no high-severity issues from the baseline stack. If any remain, update dependencies within the same major where possible and rerun `npm install`, `npm test`, and `npm run build`.

- [ ] **Step 3: Verify git status**

Run:

```powershell
git status --short
```

Expected: no uncommitted files except optional local `resources/mpv` binaries ignored by `.gitignore`.

- [ ] **Step 4: Write final implementation summary**

Prepare a final response that includes:

```md
Implemented:
- Windows Electron build outputs renderer, main, and preload.
- Xtream Live TV, Movies, Series, EPG, Favourites, Settings, and Diagnostics are present.
- mpv-first native playback is wired through a stable player interface.
- Custom player controls are implemented.
- Local desktop storage replaces browser-only localStorage.
- Windows packaging is configured.

Verified:
- npm test
- npm run build
- npm run build:win

Notes:
- 2160p and 5.1 playback are preserved when provider stream and hardware support them.
- Bundled mpv requires placing the Windows mpv runtime under resources/mpv, or installing mpv on PATH for development.
```

## Self-Review

- Spec coverage: the plan covers Windows desktop, React renderer, Electron main/preload IPC, Xtream Live TV, Movies/VOD, Series, EPG, Favourites, local desktop storage, mpv-first native playback, custom controls, 2160p/5.1 capability preservation, settings, diagnostics, packaging, tests, and manual verification.
- Scope check: the spec is broad but cohesive because the first finished version requires all listed IPTV surfaces plus playback and packaging. The plan breaks the work into independently testable slices with commits.
- Placeholder scan: the plan contains concrete commands, paths, and code blocks for each implementation step. Where an environment-dependent icon generation fallback exists, the primary exact command is listed and the fallback requires recording the exact command used.
- Type consistency: shared names used across tasks are `Profile`, `Category`, `LiveChannel`, `VodMovie`, `Series`, `Episode`, `EpgProgramme`, `Favourite`, `PlaybackRequest`, `PlayerState`, `AppSettings`, `DiagnosticSnapshot`, and IPC methods on `window.titon`.
