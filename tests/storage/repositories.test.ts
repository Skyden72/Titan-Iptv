import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../electron/storage/database';
import { createRepositories } from '../../electron/storage/repositories';

describe('repositories', () => {
  it('saves profiles, catalog items, favourites, progress, and settings', () => {
    const repos = createRepositories(createDatabase(':memory:'));

    repos.profiles.save({
      id: 'profile-1',
      name: 'Home',
      serverUrl: 'http://example.test:8080',
      username: 'demo',
      createdAt: '2026-06-26T08:00:00.000Z',
      updatedAt: '2026-06-26T08:00:00.000Z',
      accountStatus: 'Active',
    }, 'secret');

    repos.catalog.replace({
      liveCategories: [{ id: '1', kind: 'live', name: 'News', sortOrder: 1 }],
      movieCategories: [],
      seriesCategories: [],
      liveChannels: [{
        id: 'live:10',
        categoryId: '1',
        name: 'News 4K',
        streamId: 10,
        streamUrl: 'http://example.test/live/demo/secret/10.ts',
        sortOrder: 10,
      }],
      movies: [],
      series: [],
      episodes: [],
      epg: [{
        id: 'live:10:20260626080000 +0200',
        channelId: 'live:10',
        startAt: '2026-06-26T06:00:00.000Z',
        endAt: '2026-06-26T07:00:00.000Z',
        title: 'Morning News',
      }],
    });

    repos.catalog.upsertEpg([{
      id: 'live:10:20260626080000 +0200',
      channelId: 'live:10',
      startAt: '2026-06-26T06:00:00.000Z',
      endAt: '2026-06-26T07:30:00.000Z',
      title: 'Morning News Updated',
    }], {
      from: new Date('2026-06-26T00:00:00.000Z'),
      to: new Date('2026-07-03T00:00:00.000Z'),
    });

    const favourites = repos.favourites.toggle({ kind: 'live', itemId: 'live:10', createdAt: '2026-06-26T08:00:00.000Z' });
    repos.progress.save({ kind: 'movie', itemId: 'movie:11', positionSeconds: 120, durationSeconds: 600, updatedAt: '2026-06-26T08:01:00.000Z' });
    repos.settings.save({ hardwareAcceleration: true, subtitlesEnabled: true, cacheTtlHours: 12 });

    const snapshot = repos.catalog.snapshot();
    expect(snapshot.profile?.name).toBe('Home');
    expect(snapshot.liveChannels[0].name).toBe('News 4K');
    expect(snapshot.epg[0].title).toBe('Morning News Updated');
    expect(snapshot.epg[0].endAt).toBe('2026-06-26T07:30:00.000Z');
    expect(favourites).toHaveLength(1);
    expect(snapshot.progress[0].positionSeconds).toBe(120);
    expect(snapshot.settings.cacheTtlHours).toBe(12);
  });
});
