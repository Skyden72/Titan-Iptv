import crypto from 'node:crypto';
import type { IpcMain } from 'electron';
import { ipcChannels, type PlayerCommand } from '../../shared/ipc.js';
import type { AppSettings, Favourite, PlaybackRequest, RefreshProgress, XtreamCredentials } from '../../types/app.js';
import type { XtreamClient } from '../xtream/client.js';

type RegisterInput = {
  ipcMain: Pick<IpcMain, 'handle'>;
  sendToRenderer: (channel: string, payload: unknown) => void;
  repositories: any;
  createXtreamClient: (credentials: XtreamCredentials) => XtreamClient;
  playerService: {
    start(input: PlaybackRequest): Promise<any>;
    command(command: PlayerCommand): Promise<any>;
    state(): any;
  };
  diagnostics: () => Promise<any> | any;
};

function now() {
  return new Date().toISOString();
}

export function registerHandlers(input: RegisterInput) {
  const { ipcMain, repositories, createXtreamClient, playerService, sendToRenderer } = input;

  ipcMain.handle(ipcChannels.appReady, async () => repositories.catalog.snapshot());
  ipcMain.handle(ipcChannels.catalogGet, async () => repositories.catalog.snapshot());
  ipcMain.handle(ipcChannels.profilesDisconnect, async () => {
    repositories.profiles.clear();
  });

  ipcMain.handle(ipcChannels.profilesConnect, async (_event, payload: { name: string; credentials: XtreamCredentials }) => {
    const createdAt = now();
    const client = createXtreamClient(payload.credentials);
    const auth = await client.authenticate();
    const profile = {
      id: crypto.randomUUID(),
      name: payload.name,
      serverUrl: payload.credentials.serverUrl,
      username: payload.credentials.username,
      createdAt,
      updatedAt: createdAt,
      accountStatus: auth?.user_info?.status,
    };
    repositories.profiles.save(profile, payload.credentials.password);
    return profile;
  });

  ipcMain.handle(ipcChannels.catalogRefresh, async () => {
    const profile = repositories.profiles.current();
    if (!profile) throw new Error('Connect an Xtream profile before refreshing.');
    const client = createXtreamClient({ serverUrl: profile.serverUrl, username: profile.username, password: profile.password });
    const result = await client.refresh((progress: RefreshProgress) => sendToRenderer(ipcChannels.catalogRefresh, progress));
    repositories.catalog.replace(result);
    sendToRenderer(ipcChannels.catalogRefresh, { phase: 'complete', message: 'Provider refresh complete', completed: 7, total: 7 });
  });

  ipcMain.handle(ipcChannels.seriesEpisodes, async (_event, seriesId: string) =>
    repositories.catalog.snapshot().episodes.filter((episode: any) => episode.seriesId === seriesId)
  );

  ipcMain.handle(ipcChannels.favouritesToggle, async (_event, favourite: Favourite) => repositories.favourites.toggle(favourite));
  ipcMain.handle(ipcChannels.progressSave, async (_event, progress) => repositories.progress.save(progress));
  ipcMain.handle(ipcChannels.playerStart, async (_event, request: PlaybackRequest) => playerService.start(request));
  ipcMain.handle(ipcChannels.playerCommand, async (_event, command: PlayerCommand) => playerService.command(command));
  ipcMain.handle(ipcChannels.settingsGet, async () => repositories.catalog.snapshot().settings);
  ipcMain.handle(ipcChannels.settingsSave, async (_event, settings: AppSettings) => repositories.settings.save(settings));
  ipcMain.handle(ipcChannels.diagnosticsGet, async () => input.diagnostics());
}
