const { contextBridge, ipcRenderer } = require('electron');

const ipcChannels = {
  appReady: 'app:ready',
  profilesConnect: 'profiles:connect',
  profilesDisconnect: 'profiles:disconnect',
  catalogGet: 'catalog:get',
  catalogRefresh: 'catalog:refresh',
  seriesEpisodes: 'series:episodes',
  favouritesToggle: 'favourites:toggle',
  playerStart: 'player:start',
  playerCommand: 'player:command',
  playerState: 'player:state',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  diagnosticsGet: 'diagnostics:get',
};

const bridge = {
  appReady: () => ipcRenderer.invoke(ipcChannels.appReady),
  connectProfile: (input) => ipcRenderer.invoke(ipcChannels.profilesConnect, input),
  disconnectProfile: () => ipcRenderer.invoke(ipcChannels.profilesDisconnect),
  getCatalog: () => ipcRenderer.invoke(ipcChannels.catalogGet),
  refreshCatalog: () => ipcRenderer.invoke(ipcChannels.catalogRefresh),
  getSeriesEpisodes: (seriesId) => ipcRenderer.invoke(ipcChannels.seriesEpisodes, seriesId),
  toggleFavourite: (input) => ipcRenderer.invoke(ipcChannels.favouritesToggle, input),
  startPlayback: (input) => ipcRenderer.invoke(ipcChannels.playerStart, input),
  sendPlayerCommand: (command) => ipcRenderer.invoke(ipcChannels.playerCommand, command),
  getSettings: () => ipcRenderer.invoke(ipcChannels.settingsGet),
  saveSettings: (settings) => ipcRenderer.invoke(ipcChannels.settingsSave, settings),
  getDiagnostics: () => ipcRenderer.invoke(ipcChannels.diagnosticsGet),
  onRefreshProgress: (callback) => {
    const listener = (_event, progress) => callback(progress);
    ipcRenderer.on(ipcChannels.catalogRefresh, listener);
    return () => ipcRenderer.off(ipcChannels.catalogRefresh, listener);
  },
  onPlayerState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on(ipcChannels.playerState, listener);
    return () => ipcRenderer.off(ipcChannels.playerState, listener);
  },
};

contextBridge.exposeInMainWorld('titon', bridge);
