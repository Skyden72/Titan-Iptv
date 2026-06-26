import type { PlayerCommand } from '../../shared/ipc.js';
import type { PlaybackRequest, PlayerState } from '../../types/app.js';
import type { PlayerEngine } from './playerTypes.js';

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
