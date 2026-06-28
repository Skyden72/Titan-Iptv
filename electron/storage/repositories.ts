import type { AppDatabase } from './database.js';
import type {
  AppSettings,
  CatalogSnapshot,
  Category,
  Episode,
  EpgProgramme,
  Favourite,
  LiveChannel,
  Profile,
  Series,
  VodMovie,
  WatchProgress,
} from '../../types/app.js';

type CatalogReplaceInput = {
  liveCategories: Category[];
  movieCategories: Category[];
  seriesCategories: Category[];
  liveChannels: LiveChannel[];
  movies: VodMovie[];
  series: Series[];
  episodes: Episode[];
  epg: EpgProgramme[];
};

type EpgSyncOptions = {
  from?: Date;
  to?: Date;
};

const defaultSettings: AppSettings = {
  hardwareAcceleration: true,
  subtitlesEnabled: true,
  cacheTtlHours: 12,
};

function readJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function profileFromRow(row: any): (Profile & { password: string }) | null {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    serverUrl: row.server_url,
    username: row.username,
    password: row.password,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastRefreshAt: row.last_refresh_at ?? undefined,
    accountStatus: row.account_status ?? undefined,
  };
}

export function createRepositories(db: AppDatabase) {
  const profiles = {
    save(profile: Profile, password: string) {
      db.prepare(`
        insert into profiles (id, name, server_url, username, password, created_at, updated_at, last_refresh_at, account_status)
        values (@id, @name, @serverUrl, @username, @password, @createdAt, @updatedAt, @lastRefreshAt, @accountStatus)
        on conflict(id) do update set
          name = excluded.name,
          server_url = excluded.server_url,
          username = excluded.username,
          password = excluded.password,
          updated_at = excluded.updated_at,
          last_refresh_at = excluded.last_refresh_at,
          account_status = excluded.account_status
      `).run({
        ...profile,
        password,
        lastRefreshAt: profile.lastRefreshAt ?? null,
        accountStatus: profile.accountStatus ?? null,
      });
    },
    current(): (Profile & { password: string }) | null {
      return profileFromRow(db.prepare('select * from profiles order by updated_at desc limit 1').get());
    },
    clear() {
      db.prepare('delete from profiles').run();
    },
  };

  const catalog = {
    replace(input: CatalogReplaceInput) {
      const tx = db.transaction(() => {
        db.prepare('delete from categories').run();
        db.prepare('delete from live_channels').run();
        db.prepare('delete from movies').run();
        db.prepare('delete from series').run();
        db.prepare('delete from episodes').run();

        const categoryStmt = db.prepare('insert into categories (id, kind, name, sort_order) values (@id, @kind, @name, @sortOrder)');
        for (const category of [...input.liveCategories, ...input.movieCategories, ...input.seriesCategories]) categoryStmt.run(category);

        const liveStmt = db.prepare('insert into live_channels (id, category_id, name, logo_url, stream_id, stream_url, epg_channel_id, sort_order) values (@id, @categoryId, @name, @logoUrl, @streamId, @streamUrl, @epgChannelId, @sortOrder)');
        for (const channel of input.liveChannels) {
          liveStmt.run({ ...channel, logoUrl: channel.logoUrl ?? null, epgChannelId: channel.epgChannelId ?? null });
        }

        const movieStmt = db.prepare('insert into movies (id, category_id, title, poster_url, stream_id, stream_url, container_extension, rating, release_year, plot, duration_seconds) values (@id, @categoryId, @title, @posterUrl, @streamId, @streamUrl, @containerExtension, @rating, @releaseYear, @plot, @durationSeconds)');
        for (const movie of input.movies) {
          movieStmt.run({
            ...movie,
            posterUrl: movie.posterUrl ?? null,
            rating: movie.rating ?? null,
            releaseYear: movie.releaseYear ?? null,
            plot: movie.plot ?? null,
            durationSeconds: movie.durationSeconds ?? null,
          });
        }

        const seriesStmt = db.prepare('insert into series (id, category_id, title, poster_url, series_id, rating, release_year, plot) values (@id, @categoryId, @title, @posterUrl, @seriesId, @rating, @releaseYear, @plot)');
        for (const item of input.series) {
          seriesStmt.run({
            ...item,
            posterUrl: item.posterUrl ?? null,
            rating: item.rating ?? null,
            releaseYear: item.releaseYear ?? null,
            plot: item.plot ?? null,
          });
        }

        const episodeStmt = db.prepare('insert into episodes (id, series_id, season_number, episode_number, title, stream_id, stream_url, container_extension, duration_seconds, plot) values (@id, @seriesId, @seasonNumber, @episodeNumber, @title, @streamId, @streamUrl, @containerExtension, @durationSeconds, @plot)');
        for (const episode of input.episodes) {
          episodeStmt.run({
            ...episode,
            durationSeconds: episode.durationSeconds ?? null,
            plot: episode.plot ?? null,
          });
        }

        db.prepare('delete from epg_programmes where channel_id not in (select id from live_channels)').run();
        upsertEpg(input.epg);
      });
      tx();
    },
    upsertEpg(programmes: EpgProgramme[], options: EpgSyncOptions = {}) {
      const tx = db.transaction(() => {
        if (options.from) db.prepare('delete from epg_programmes where end_at <= ?').run(options.from.toISOString());
        if (options.to) db.prepare('delete from epg_programmes where start_at >= ?').run(options.to.toISOString());
        upsertEpg(programmes);
      });
      tx();
    },
    snapshot(): CatalogSnapshot {
      const current = profiles.current();
      const categories = db.prepare('select id, kind, name, sort_order as sortOrder from categories order by kind, sort_order, name').all() as Category[];
      const settingsRow = db.prepare("select value_json from settings where key = 'app'").get() as { value_json?: string } | undefined;
      const profile = current
        ? {
            id: current.id,
            name: current.name,
            serverUrl: current.serverUrl,
            username: current.username,
            createdAt: current.createdAt,
            updatedAt: current.updatedAt,
            lastRefreshAt: current.lastRefreshAt,
            accountStatus: current.accountStatus,
          }
        : null;

      return {
        profile,
        liveCategories: categories.filter((category) => category.kind === 'live'),
        movieCategories: categories.filter((category) => category.kind === 'movie'),
        seriesCategories: categories.filter((category) => category.kind === 'series'),
        liveChannels: db.prepare('select id, category_id as categoryId, name, logo_url as logoUrl, stream_id as streamId, stream_url as streamUrl, epg_channel_id as epgChannelId, sort_order as sortOrder from live_channels order by sort_order, name').all() as LiveChannel[],
        movies: db.prepare('select id, category_id as categoryId, title, poster_url as posterUrl, stream_id as streamId, stream_url as streamUrl, container_extension as containerExtension, rating, release_year as releaseYear, plot, duration_seconds as durationSeconds from movies order by title').all() as VodMovie[],
        series: db.prepare('select id, category_id as categoryId, title, poster_url as posterUrl, series_id as seriesId, rating, release_year as releaseYear, plot from series order by title').all() as Series[],
        episodes: db.prepare('select id, series_id as seriesId, season_number as seasonNumber, episode_number as episodeNumber, title, stream_id as streamId, stream_url as streamUrl, container_extension as containerExtension, duration_seconds as durationSeconds, plot from episodes order by series_id, season_number, episode_number').all() as Episode[],
        epg: db.prepare('select id, channel_id as channelId, start_at as startAt, end_at as endAt, title, description from epg_programmes order by start_at').all() as EpgProgramme[],
        favourites: db.prepare('select kind, item_id as itemId, created_at as createdAt from favourites order by created_at desc').all() as Favourite[],
        progress: db.prepare('select kind, item_id as itemId, position_seconds as positionSeconds, duration_seconds as durationSeconds, updated_at as updatedAt from watch_progress').all() as WatchProgress[],
        settings: readJson(settingsRow?.value_json, defaultSettings),
      };
    },
  };

  function upsertEpg(programmes: EpgProgramme[]) {
    const epgStmt = db.prepare(`
      insert into epg_programmes (id, channel_id, start_at, end_at, title, description)
      values (@id, @channelId, @startAt, @endAt, @title, @description)
      on conflict(id) do update set
        channel_id = excluded.channel_id,
        start_at = excluded.start_at,
        end_at = excluded.end_at,
        title = excluded.title,
        description = excluded.description
      where
        epg_programmes.channel_id is not excluded.channel_id or
        epg_programmes.start_at is not excluded.start_at or
        epg_programmes.end_at is not excluded.end_at or
        epg_programmes.title is not excluded.title or
        epg_programmes.description is not excluded.description
    `);
    for (const programme of programmes) {
      epgStmt.run({ ...programme, description: programme.description ?? null });
    }
  }

  const favourites = {
    toggle(favourite: Favourite): Favourite[] {
      const existing = db.prepare('select 1 from favourites where kind = ? and item_id = ?').get(favourite.kind, favourite.itemId);
      if (existing) {
        db.prepare('delete from favourites where kind = ? and item_id = ?').run(favourite.kind, favourite.itemId);
      } else {
        db.prepare('insert into favourites (kind, item_id, created_at) values (?, ?, ?)').run(favourite.kind, favourite.itemId, favourite.createdAt);
      }
      return db.prepare('select kind, item_id as itemId, created_at as createdAt from favourites order by created_at desc').all() as Favourite[];
    },
  };

  const progress = {
    save(input: WatchProgress) {
      db.prepare(`
        insert into watch_progress (kind, item_id, position_seconds, duration_seconds, updated_at)
        values (@kind, @itemId, @positionSeconds, @durationSeconds, @updatedAt)
        on conflict(kind, item_id) do update set
          position_seconds = excluded.position_seconds,
          duration_seconds = excluded.duration_seconds,
          updated_at = excluded.updated_at
      `).run({ ...input, durationSeconds: input.durationSeconds ?? null });
    },
  };

  const settings = {
    save(input: AppSettings): AppSettings {
      db.prepare("insert into settings (key, value_json) values ('app', ?) on conflict(key) do update set value_json = excluded.value_json").run(JSON.stringify(input));
      return input;
    },
  };

  return { profiles, catalog, favourites, progress, settings };
}
