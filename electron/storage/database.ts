import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

type StatementResult = { changes?: number; lastInsertRowid?: number | bigint };

export type AppStatement = {
  run(...params: unknown[]): StatementResult;
  get(...params: unknown[]): unknown;
  all(...params: unknown[]): unknown[];
};

export type AppDatabase = {
  prepare(sql: string): AppStatement;
  exec(sql: string): void;
  pragma(sql: string): unknown;
  transaction<T extends (...args: any[]) => void>(fn: T): T;
};

const schema = `
create table if not exists schema_migrations (
  version integer primary key,
  applied_at text not null
);
create table if not exists profiles (
  id text primary key,
  name text not null,
  server_url text not null,
  username text not null,
  password text not null,
  created_at text not null,
  updated_at text not null,
  last_refresh_at text,
  account_status text
);
create table if not exists categories (
  id text not null,
  kind text not null,
  name text not null,
  sort_order integer not null default 0,
  primary key (kind, id)
);
create table if not exists live_channels (
  id text primary key,
  category_id text not null,
  name text not null,
  logo_url text,
  stream_id integer not null,
  stream_url text not null,
  epg_channel_id text,
  sort_order integer not null default 0
);
create table if not exists movies (
  id text primary key,
  category_id text not null,
  title text not null,
  poster_url text,
  stream_id integer not null,
  stream_url text not null,
  container_extension text not null,
  rating text,
  release_year text,
  plot text,
  duration_seconds integer
);
create table if not exists series (
  id text primary key,
  category_id text not null,
  title text not null,
  poster_url text,
  series_id integer not null,
  rating text,
  release_year text,
  plot text
);
create table if not exists episodes (
  id text primary key,
  series_id text not null,
  season_number integer not null,
  episode_number integer not null,
  title text not null,
  stream_id integer not null,
  stream_url text not null,
  container_extension text not null,
  duration_seconds integer,
  plot text
);
create table if not exists epg_programmes (
  id text primary key,
  channel_id text not null,
  start_at text not null,
  end_at text not null,
  title text not null,
  description text
);
create table if not exists favourites (
  kind text not null,
  item_id text not null,
  created_at text not null,
  primary key (kind, item_id)
);
create table if not exists watch_progress (
  kind text not null,
  item_id text not null,
  position_seconds integer not null,
  duration_seconds integer,
  updated_at text not null,
  primary key (kind, item_id)
);
create table if not exists history (
  kind text not null,
  item_id text not null,
  title text not null,
  played_at text not null
);
create table if not exists settings (
  key text primary key,
  value_json text not null
);
insert or ignore into schema_migrations (version, applied_at) values (1, datetime('now'));
`;

export function resolveDatabasePath(userDataPath: string): string {
  const dir = path.join(userDataPath, 'data');
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'titon.sqlite');
}

export function createDatabase(filename: string): AppDatabase {
  const db = openDatabase(filename);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(schema);
  return db;
}

function openDatabase(filename: string): AppDatabase {
  try {
    return new Database(filename) as AppDatabase;
  } catch (error) {
    const message = String(error);
    const canFallback = message.includes('Could not locate the bindings file') || message.includes('NODE_MODULE_VERSION') || message.includes('compiled against a different Node.js version');
    if (!canFallback) {
      throw error;
    }
    return createNodeSqliteDatabase(filename);
  }
}

function createNodeSqliteDatabase(filename: string): AppDatabase {
  process.env.NODE_NO_WARNINGS ??= '1';
  const require = createRequire(import.meta.url);
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (name: string) => any };
  const db = new DatabaseSync(filename);

  return {
    prepare(sql: string): AppStatement {
      const statement = db.prepare(sql);
      return {
        run: (...params: unknown[]) => statement.run(...params),
        get: (...params: unknown[]) => statement.get(...params),
        all: (...params: unknown[]) => statement.all(...params),
      };
    },
    exec(sql: string) {
      db.exec(sql);
    },
    pragma(sql: string) {
      db.exec(`pragma ${sql}`);
    },
    transaction<T extends (...args: any[]) => void>(fn: T): T {
      return ((...args: Parameters<T>) => {
        db.exec('begin');
        try {
          fn(...args);
          db.exec('commit');
        } catch (error) {
          db.exec('rollback');
          throw error;
        }
      }) as T;
    },
  };
}
