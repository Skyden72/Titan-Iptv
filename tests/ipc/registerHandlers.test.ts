import { describe, expect, it, vi } from 'vitest';
import { registerHandlers } from '../../electron/ipc/registerHandlers';
import { ipcChannels } from '../../shared/ipc';

describe('registerHandlers', () => {
  it('registers app, catalog, profile, player, settings, and diagnostics handlers', () => {
    const ipcMain = { handle: vi.fn() };

    registerHandlers({
      ipcMain: ipcMain as any,
      sendToRenderer: vi.fn(),
      repositories: {
        profiles: { save: vi.fn(), current: vi.fn(), clear: vi.fn() },
        catalog: { snapshot: vi.fn(() => ({ settings: { hardwareAcceleration: true, subtitlesEnabled: true, cacheTtlHours: 12 } })), replace: vi.fn() },
        favourites: { toggle: vi.fn() },
        progress: { save: vi.fn() },
        settings: { save: vi.fn((settings) => settings) },
      } as any,
      createXtreamClient: vi.fn(),
      playerService: { start: vi.fn(), command: vi.fn(), setSurface: vi.fn(), state: vi.fn() } as any,
      diagnostics: vi.fn(),
      setWindowFullscreen: vi.fn(),
    });

    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.appReady, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.profilesConnect, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.playerStart, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.playerSurfaceSet, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.windowFullscreenSet, expect.any(Function));
    expect(ipcMain.handle).toHaveBeenCalledWith(ipcChannels.diagnosticsGet, expect.any(Function));
  });
});
