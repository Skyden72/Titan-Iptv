import { contextBridge, ipcRenderer } from 'electron';

// Expose a secure API for the renderer process to make network requests
// through the main process, bypassing CORS.
contextBridge.exposeInMainWorld('electronNet', {
  request: (req: {
    url: string;
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
  }) => ipcRenderer.invoke('net:request', req)
});
