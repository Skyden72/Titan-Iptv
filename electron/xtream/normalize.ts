import type { Category, Episode, LiveChannel, Series, VodMovie, XtreamCredentials } from '../../types/app.js';
import { buildStreamUrl } from './urls.js';

export function normalizeCategories(kind: Category['kind'], rows: any[]): Category[] {
  return rows.map((row, index) => ({
    id: String(row.category_id ?? row.id ?? index),
    kind,
    name: String(row.category_name ?? row.name ?? 'Uncategorized'),
    sortOrder: Number(row.sort_order ?? index),
  }));
}

export function normalizeLive(credentials: XtreamCredentials, rows: any[]): LiveChannel[] {
  return rows.map((row, index) => {
    const streamId = Number(row.stream_id);
    return {
      id: `live:${streamId}`,
      categoryId: String(row.category_id ?? ''),
      name: String(row.name ?? `Channel ${streamId}`),
      logoUrl: row.stream_icon || undefined,
      streamId,
      streamUrl: buildStreamUrl(credentials, 'live', streamId, 'ts'),
      epgChannelId: row.epg_channel_id || undefined,
      sortOrder: Number(row.num ?? index),
    };
  });
}

export function normalizeMovies(credentials: XtreamCredentials, rows: any[]): VodMovie[] {
  return rows.map((row) => {
    const streamId = Number(row.stream_id);
    const extension = String(row.container_extension || 'mp4');
    const releaseDate = String(row.releaseDate ?? row.added ?? '');
    return {
      id: `movie:${streamId}`,
      categoryId: String(row.category_id ?? ''),
      title: String(row.name ?? `Movie ${streamId}`),
      posterUrl: row.stream_icon || row.cover || undefined,
      streamId,
      streamUrl: buildStreamUrl(credentials, 'movie', streamId, extension),
      containerExtension: extension,
      rating: row.rating || undefined,
      releaseYear: /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : undefined,
      plot: row.plot || undefined,
      durationSeconds: row.duration_secs ? Number(row.duration_secs) : undefined,
    };
  });
}

export function normalizeSeries(rows: any[]): Series[] {
  return rows.map((row) => {
    const seriesId = Number(row.series_id);
    const releaseDate = String(row.releaseDate ?? '');
    return {
      id: `series:${seriesId}`,
      categoryId: String(row.category_id ?? ''),
      title: String(row.name ?? `Series ${seriesId}`),
      posterUrl: row.cover || row.stream_icon || undefined,
      seriesId,
      rating: row.rating || undefined,
      releaseYear: /^\d{4}/.test(releaseDate) ? releaseDate.slice(0, 4) : undefined,
      plot: row.plot || undefined,
    };
  });
}

export function normalizeSeriesDetails(credentials: XtreamCredentials, seriesId: string, details: any): Episode[] {
  const episodesBySeason = details?.episodes ?? {};
  const episodes: Episode[] = [];
  for (const [seasonKey, seasonEpisodes] of Object.entries(episodesBySeason)) {
    for (const row of seasonEpisodes as any[]) {
      const streamId = Number(row.id);
      const extension = String(row.container_extension || 'mp4');
      episodes.push({
        id: `episode:${streamId}`,
        seriesId,
        seasonNumber: Number(seasonKey),
        episodeNumber: Number(row.episode_num ?? row.episodeNum ?? episodes.length + 1),
        title: String(row.title ?? `Episode ${streamId}`),
        streamId,
        streamUrl: buildStreamUrl(credentials, 'episode', streamId, extension),
        containerExtension: extension,
        durationSeconds: row.info?.duration_secs ? Number(row.info.duration_secs) : undefined,
        plot: row.info?.plot || undefined,
      });
    }
  }
  return episodes.sort((a, b) => a.seasonNumber - b.seasonNumber || a.episodeNumber - b.episodeNumber);
}
