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
