import type { PlayerCommand } from '../../shared/ipc.js';
import type { PlaybackRequest, PlayerState, PlayerSurfaceBounds } from '../../types/app.js';
import type { PlayerEngine } from './playerTypes.js';

export class PlayerService {
  private playlist: string[] = [];
  private activeRequest: PlaybackRequest | null = null;
  private disposed = false;
  private readonly unsubscribe: () => void;

  constructor(
    private readonly engine: PlayerEngine,
    private readonly emit: (state: PlayerState) => void,
    private readonly configureSurface?: (bounds: PlayerSurfaceBounds) => Promise<PlayerSurfaceBounds | null>
  ) {
    this.unsubscribe = this.engine.onState((state) => this.emitState(state));
  }

  async setSurface(bounds: PlayerSurfaceBounds): Promise<void> {
    const surfaceBounds = await this.configureSurface?.(bounds);
    if (surfaceBounds !== undefined) this.engine.setSurfaceBounds(surfaceBounds);
  }

  async start(request: PlaybackRequest): Promise<PlayerState> {
    this.activeRequest = request;
    this.playlist = request.playlistItemIds ?? [];
    const state = await this.engine.start(request);
    this.emitState(state);
    return state;
  }

  async command(command: PlayerCommand): Promise<PlayerState> {
    const state = await this.engine.command(command);
    this.emitState(state);
    return state;
  }

  state(): PlayerState {
    return this.engine.currentState();
  }

  dispose(): void {
    this.disposed = true;
    this.unsubscribe();
    this.engine.setSurfaceBounds(null);
    void this.engine.stop().catch(() => undefined);
  }

  private emitState(state: PlayerState): void {
    if (this.disposed) return;
    this.emit(state);
  }
}
