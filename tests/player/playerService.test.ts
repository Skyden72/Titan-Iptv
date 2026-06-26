import { describe, expect, it, vi } from 'vitest';
import { PlayerService } from '../../electron/player/playerService';
import type { PlayerState } from '../../types/app';

describe('PlayerService', () => {
  it('starts playback and relays state changes', async () => {
    const state: PlayerState = { status: 'playing', positionSeconds: 0, volume: 100, muted: false, fullscreen: false, audioTracks: [], subtitleTracks: [] };
    const callbacks = new Set<(value: any) => void>();
    const emit = vi.fn();
    const service = new PlayerService({
      start: vi.fn(async () => state),
      command: vi.fn(async () => state),
      stop: vi.fn(async () => state),
      currentState: vi.fn(() => state),
      onState: vi.fn((callback) => {
        callbacks.add(callback);
        return () => callbacks.delete(callback);
      }),
    }, emit);

    await expect(service.start({ kind: 'live', itemId: 'live:1', title: 'Channel', streamUrl: 'http://example.test/live.ts' })).resolves.toBe(state);
    expect(emit).toHaveBeenCalledWith(state);
  });
});
