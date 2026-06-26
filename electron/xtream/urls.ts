import type { XtreamCredentials } from '../../types/app.js';

type ApiInput = XtreamCredentials & { action?: string; extra?: Record<string, string | number | undefined> };
type StreamKind = 'live' | 'movie' | 'episode';

function cleanServer(serverUrl: string): string {
  return serverUrl.replace(/\/+$/, '');
}

export function buildPlayerApiUrl(input: ApiInput): string {
  const url = new URL(`${cleanServer(input.serverUrl)}/player_api.php`);
  url.searchParams.set('username', input.username);
  url.searchParams.set('password', input.password);
  if (input.action) url.searchParams.set('action', input.action);
  for (const [key, value] of Object.entries(input.extra ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export function buildXmlTvUrl(input: XtreamCredentials): string {
  const url = new URL(`${cleanServer(input.serverUrl)}/xmltv.php`);
  url.searchParams.set('username', input.username);
  url.searchParams.set('password', input.password);
  return url.toString();
}

export function buildStreamUrl(credentials: XtreamCredentials, kind: StreamKind, streamId: number, extension: string): string {
  const folder = kind === 'episode' ? 'series' : kind;
  return `${cleanServer(credentials.serverUrl)}/${folder}/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${streamId}.${extension}`;
}

export function redactCredentialedUrl(url: string): string {
  return url.replace(/\/(live|movie|series)\/([^/]+)\/([^/]+)\//, '/$1/$2/[redacted]/').replace(/password=([^&]+)/, 'password=[redacted]');
}
