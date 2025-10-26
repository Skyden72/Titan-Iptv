import { create, type StateCreator, type UseBoundStore, type StoreApi } from 'zustand';
// FIX: Import PersistApi to correctly type the store.
import { persist, type PersistApi } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { Channel, Media, SeriesInfo, EpgEntry, ConnectionDetails } from '../types';
import { IptvService } from '../services/iptvService';
import { __DEV__ } from '../lib/env';

// On dev startup, clear potentially corrupted state to prevent loops.
try {
  if (__DEV__) {
    localStorage.removeItem('zenith-iptv-storage');
  }
} catch (e) {
  console.error('Failed to clear storage during dev startup:', e);
}


interface AppState {
  isConnected: boolean;
  isLoading: boolean;
  connectionDetails: ConnectionDetails | null;
  channels: Channel[];
  movies: Media[];
  series: SeriesInfo[];
  epgData: Record<string, EpgEntry[]>;
  error: string | null;
  
  connect: (details: ConnectionDetails) => Promise<void>;
  disconnect: () => void;
}

const storeInitializer: StateCreator<AppState> = (set, get) => ({
  isConnected: false,
  isLoading: false,
  connectionDetails: null,
  channels: [],
  movies: [],
  series: [],
  epgData: {},
  error: null,

  connect: async (details) => {
    set({ isLoading: true, error: null });
    try {
      const service = new IptvService();
      const data = await service.fetchData(details);
      set({
        isConnected: true,
        connectionDetails: details,
        channels: data.channels,
        movies: data.movies,
        series: data.series,
        epgData: data.epg,
        isLoading: false,
      });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ isLoading: false, error });
    }
  },

  disconnect: () => {
    set({
      isConnected: false,
      connectionDetails: null,
      channels: [],
      movies: [],
      series: [],
      epgData: {},
      error: null,
    });
  },
});

// FIX: Create a type that includes both the hook signature and the persist API.
// This resolves type errors when using equality functions (like shallow) and when accessing `useAppStore.persist`.
type PersistedStore = UseBoundStore<StoreApi<AppState>> & { persist: PersistApi<AppState> };


// FIX: Correctly type the persisted store.
// 1. Provide `Partial<AppState>` as a generic to `persist` to correctly type the `partialize` option.
// 2. Cast the store to our custom `PersistedStore` type to ensure all properties and call signatures are available.
const useStore = create(
  persist<AppState, [], Partial<AppState>>(
    storeInitializer,
    {
      name: 'zenith-iptv-storage', // local storage key
      partialize: (state) => ({ 
        connectionDetails: state.connectionDetails,
        isConnected: state.isConnected,
      }),
    }
  )
) as PersistedStore;

export { useStore as useAppStore };
// Export a selector hook that uses shallow comparison.
export const useShallow = <T>(sel: (s: AppState) => T) => useStore(sel, shallow);