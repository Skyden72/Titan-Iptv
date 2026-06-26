import { describe, expect, it } from 'vitest';
import { createDatabase } from '../../electron/storage/database';

describe('createDatabase', () => {
  it('creates all required tables', () => {
    const db = createDatabase(':memory:');
    const tables = db.prepare("select name from sqlite_master where type = 'table' order by name").all() as { name: string }[];

    expect(tables.map((table) => table.name)).toEqual([
      'categories',
      'epg_programmes',
      'episodes',
      'favourites',
      'history',
      'live_channels',
      'movies',
      'profiles',
      'schema_migrations',
      'series',
      'settings',
      'watch_progress',
    ]);
  });
});
