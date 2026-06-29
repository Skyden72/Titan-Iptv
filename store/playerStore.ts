import { create } from 'zustand';
import type { PlayerCommand } from '../shared/ipc';
import type { PlaybackRequest, PlayerState } from '../types/app';

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
  currentRequest: PlaybackRequest | null;
  activeRequestKey: string | null;
  controlsVisible: boolean;
  open: (request: PlaybackRequest) => void;
  start: (request: PlaybackRequest) => Promise<void>;
  command: (command: PlayerCommand) => Promise<void>;
  attach: () => () => void;
  showControls: () => void;
  hideControls: () => void;
};

function playbackKey(request: PlaybackRequest): string {
  return `${request.kind}:${request.itemId}:${request.streamUrl}`;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  state: initialState,
  currentRequest: null,
  activeRequestKey: null,
  controlsVisible: true,
  open(request) {
    set({ currentRequest: request, controlsVisible: true });
  },
  async start(request) {
    const key = playbackKey(request);
    if (get().activeRequestKey === key) {
      set({ controlsVisible: true });
      return;
    }
    const state = await window.titon.startPlayback(request);
    set((current) => ({ state: { ...state, fullscreen: current.state.fullscreen }, activeRequestKey: key, controlsVisible: true }));
  },
  async command(command) {
    if (command.type === 'fullscreen') {
      const fullscreen = await window.titon.setWindowFullscreen(command.fullscreen);
      set((current) => ({ state: { ...current.state, fullscreen } }));
      return;
    }
    if (command.type === 'stop') {
      await window.titon.setWindowFullscreen(false);
    }
    const state = await window.titon.sendPlayerCommand(command);
    set((current) => (
      command.type === 'stop'
        ? { state: { ...state, fullscreen: false }, currentRequest: null, activeRequestKey: null }
        : { state: { ...state, fullscreen: current.state.fullscreen } }
    ));
  },
  attach() {
    const unsubscribePlayerState = window.titon.onPlayerState((state) => set((current) => ({ state: { ...state, fullscreen: current.state.fullscreen } })));
    const unsubscribeFullscreen = window.titon.onWindowFullscreenChanged((fullscreen) => {
      set((current) => ({ state: { ...current.state, fullscreen }, controlsVisible: true }));
    });
    return () => {
      unsubscribePlayerState();
      unsubscribeFullscreen();
    };
  },
  showControls() {
    set({ controlsVisible: true });
  },
  hideControls() {
    set({ controlsVisible: false });
  },
}));
