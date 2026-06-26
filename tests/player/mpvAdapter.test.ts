import { describe, expect, it, vi } from 'vitest';
import { MpvAdapter } from '../../electron/player/mpvAdapter';

describe('MpvAdapter', () => {
  it('translates player controls into mpv JSON IPC commands', async () => {
    const writes: string[] = [];
    const adapter = new MpvAdapter('mpv.exe', {
      spawnProcess: vi.fn(() => ({
        stdin: { write: (value: string) => writes.push(value) },
        stdout: { on: vi.fn() },
        stderr: { on: vi.fn() },
        on: vi.fn(),
        kill: vi.fn(),
      } as any)),
    });

    await adapter.start({ kind: 'movie', itemId: 'movie:1', title: 'Movie', streamUrl: 'http://example.test/movie.ts' });
    await adapter.command({ type: 'setVolume', volume: 70 });
    await adapter.command({ type: 'selectAudioTrack', id: 2 });

    expect(writes.join('\n')).toContain('"loadfile","http://example.test/movie.ts","replace"');
    expect(writes.join('\n')).toContain('"set_property","volume",70');
    expect(writes.join('\n')).toContain('"set_property","aid",2');
  });
});
