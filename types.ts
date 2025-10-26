// FIX: Add a global declaration for the `electronNet` API exposed by the preload script.
// This resolves the TypeScript error 'Property 'electronNet' does not exist on type 'Window''.
declare global {
  interface Window {
    electronNet?: {
      request: (req: {
        url: string;
        method?: string;
        headers?: Record<string, string>;
        body?: string;
        timeoutMs?: number;
      }) => Promise<{
        ok: boolean;
        status: number;
        headers?: Record<string, string>;
        bodyBase64?: string;
        error?: string;
      }>;
    };
  }
}

export type ConnectionType = 'xtream' | 'm3u';

export interface ConnectionDetails {
  type: ConnectionType;
  name: string;
  serverUrl?: string;
  username?: string;
  password?: string;
  m3uUrl?: string;
  epgUrl?: string;
  apiPath?: string;
}

export interface Channel {
  id: string;
  name: string;
  logo: string;
  group: string;
  streamUrl: string;
}

export interface Media {
  id: string;
  title: string;
  poster: string;
  year?: string;
  rating?: string;
  streamUrl: string;
}

export interface SeriesInfo {
  id: string;
  title: string;
  poster: string;
  year?: string;
  rating?: string;
}

export interface EpgEntry {
  start: string;
  end: string;
  title: string;
  description?: string;
}

// Ensure the file is treated as a module.
export {};
