import type { PlayerCommand } from '../../shared/ipc.js';
import type { PlaybackRequest, PlayerState } from '../../types/app.js';

export interface PlayerEngine {
  start(request: PlaybackRequest): Promise<PlayerState>;
  command(command: PlayerCommand): Promise<PlayerState>;
  stop(): Promise<PlayerState>;
  currentState(): PlayerState;
  onState(callback: (state: PlayerState) => void): () => void;
}
