import { fetch } from 'undici';
import type { RefreshProgress, XtreamCredentials } from '../../types/app.js';
import { parseXmlTv } from './epg.js';
import { normalizeCategories, normalizeLive, normalizeMovies, normalizeSeries, normalizeSeriesDetails } from './normalize.js';
import { buildPlayerApiUrl, buildXmlTvUrl, redactCredentialedUrl } from './urls.js';

export class XtreamError extends Error {
  constructor(message: string, public readonly safeUrl?: string) {
    super(message);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new XtreamError(`Provider returned HTTP ${response.status} for ${redactCredentialedUrl(url)}`);
  return response.json() as Promise<T>;
}

async function getText(url: string): Promise<string> {
  const response = await fetch(url, { headers: { accept: 'application/xml,text/xml,*/*' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new XtreamError(`Provider returned HTTP ${response.status} for ${redactCredentialedUrl(url)}`);
  return response.text();
}

export class XtreamClient {
  constructor(private readonly credentials: XtreamCredentials) {}

  async authenticate() {
    const auth = await getJson<any>(buildPlayerApiUrl(this.credentials));
    if (auth?.user_info?.auth !== 1) {
      throw new XtreamError(`Authentication failed: ${auth?.user_info?.status ?? 'Unknown status'}`);
    }
    return auth;
  }

  async refresh(onProgress: (progress: RefreshProgress) => void) {
    onProgress({ phase: 'auth', message: 'Checking account', completed: 0, total: 7 });
    const auth = await this.authenticate();

    onProgress({ phase: 'categories', message: 'Loading categories', completed: 1, total: 7 });
    const [liveCategoriesRaw, movieCategoriesRaw, seriesCategoriesRaw] = await Promise.all([
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_live_categories' })),
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_vod_categories' })),
      getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series_categories' })),
    ]);

    onProgress({ phase: 'live', message: 'Loading live channels', completed: 2, total: 7 });
    const liveRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_live_streams' }));

    onProgress({ phase: 'movies', message: 'Loading movies', completed: 3, total: 7 });
    const moviesRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_vod_streams' }));

    onProgress({ phase: 'series', message: 'Loading series', completed: 4, total: 7 });
    const seriesRaw = await getJson<any[]>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series' }));
    const series = normalizeSeries(seriesRaw);
    const episodes = (await Promise.all(series.map((item) =>
      getJson<any>(buildPlayerApiUrl({ ...this.credentials, action: 'get_series_info', extra: { series_id: item.seriesId } }))
        .then((details) => normalizeSeriesDetails(this.credentials, item.id, details))
        .catch(() => [])
    ))).flat();

    onProgress({ phase: 'epg', message: 'Loading EPG', completed: 5, total: 7 });
    const liveChannels = normalizeLive(this.credentials, liveRaw);
    const epgChannelMap = new Map(liveChannels.flatMap((channel) => channel.epgChannelId ? [[channel.epgChannelId, channel.id] as const] : []));
    const epg = await getText(buildXmlTvUrl(this.credentials)).then((xml) => parseXmlTv(xml, epgChannelMap)).catch(() => []);

    onProgress({ phase: 'saving', message: 'Saving provider data', completed: 6, total: 7 });
    return {
      accountStatus: auth?.user_info?.status as string | undefined,
      liveCategories: normalizeCategories('live', liveCategoriesRaw),
      movieCategories: normalizeCategories('movie', movieCategoriesRaw),
      seriesCategories: normalizeCategories('series', seriesCategoriesRaw),
      liveChannels,
      movies: normalizeMovies(this.credentials, moviesRaw),
      series,
      episodes,
      epg,
    };
  }
}
