import { describe, expect, it } from 'vitest';
import { normalizeLive, normalizeMovies, normalizeSeries, normalizeSeriesDetails } from '../../electron/xtream/normalize';

const credentials = { serverUrl: 'http://example.test:8080', username: 'user', password: 'pass' };

describe('xtream normalization', () => {
  it('normalizes live streams', () => {
    const result = normalizeLive(credentials, [{ stream_id: 10, name: 'News 4K', stream_icon: 'logo.png', category_id: '1', epg_channel_id: 'news', num: 7 }]);
    expect(result[0]).toMatchObject({ id: 'live:10', name: 'News 4K', streamId: 10, sortOrder: 7, streamUrl: 'http://example.test:8080/live/user/pass/10.ts' });
  });

  it('normalizes movies with container extensions', () => {
    const result = normalizeMovies(credentials, [{ stream_id: 11, name: 'Film', stream_icon: 'poster.jpg', category_id: '2', container_extension: 'mp4', rating: '7.2', plot: 'Plot', releaseDate: '2024-01-01' }]);
    expect(result[0]).toMatchObject({ id: 'movie:11', title: 'Film', containerExtension: 'mp4', releaseYear: '2024' });
  });

  it('normalizes series and episodes', () => {
    const series = normalizeSeries([{ series_id: 20, name: 'Show', cover: 'cover.jpg', category_id: '3', rating: '8', plot: 'Story', releaseDate: '2023-02-01' }]);
    const episodes = normalizeSeriesDetails(credentials, 'series:20', { episodes: { '1': [{ id: '30', episode_num: 2, title: 'Second', container_extension: 'mkv', info: { duration_secs: 1800, plot: 'Episode plot' } }] } });
    expect(series[0]).toMatchObject({ id: 'series:20', seriesId: 20, releaseYear: '2023' });
    expect(episodes[0]).toMatchObject({ id: 'episode:30', seriesId: 'series:20', seasonNumber: 1, episodeNumber: 2, streamUrl: 'http://example.test:8080/series/user/pass/30.mkv' });
  });
});
