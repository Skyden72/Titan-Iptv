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
      if (command.fullscreen) {
        await document.documentElement.requestFullscreen?.();
      } else if (document.fullscreenElement) {
        await document.exitFullscreen?.();
      }
      set((current) => ({ state: { ...current.state, fullscreen: command.fullscreen } }));
      return;
    }
    const state = await window.titon.sendPlayerCommand(command);
    set(command.type === 'stop' ? { state, currentRequest: null } : { state });
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
