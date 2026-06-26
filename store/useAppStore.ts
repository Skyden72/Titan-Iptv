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
      const profile: Profile = await window.titon.connectProfile({
        name: input.name,
        credentials: { serverUrl: input.serverUrl, username: input.username, password: input.password },
      });
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
