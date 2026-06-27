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
  controlsVisible: boolean;
  open: (request: PlaybackRequest) => void;
  start: (request: PlaybackRequest) => Promise<void>;
  command: (command: PlayerCommand) => Promise<void>;
  attach: () => () => void;
  showControls: () => void;
  hideControls: () => void;
};

export const usePlayerStore = create<PlayerStore>((set) => ({
  state: initialState,
  currentRequest: null,
  controlsVisible: true,
  open(request) {
    set({ currentRequest: request, controlsVisible: true });
  },
  async start(request) {
    const state = await window.titon.startPlayback(request);
    set({ state, controlsVisible: true });
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
    set(command.type === 'stop' ? { state: { ...state, fullscreen: false }, currentRequest: null } : { state });
  },
  attach() {
    return window.titon.onPlayerState((state) => set((current) => ({ state: { ...state, fullscreen: current.state.fullscreen } })));
  },
  showControls() {
    set({ controlsVisible: true });
  },
  hideControls() {
    set({ controlsVisible: false });
  },
}));
