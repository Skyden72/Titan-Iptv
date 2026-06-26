import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export type MpvLocation =
  | { available: true; path: string; message: string }
  | { available: false; path?: string; message: string };

export async function locateMpv(appPath: string): Promise<MpvLocation> {
  const bundled = path.join(appPath, 'resources', 'mpv', 'mpv.exe');
  if (fs.existsSync(bundled)) return { available: true, path: bundled, message: 'Bundled mpv found' };

  const fromPath = spawnSync('where.exe', ['mpv.exe'], { encoding: 'utf8' });
  const first = fromPath.stdout.split(/\r?\n/).find(Boolean);
  if (fromPath.status === 0 && first) return { available: true, path: first.trim(), message: 'System mpv found' };

  return {
    available: false,
    message: 'mpv.exe was not found. Place mpv.exe under resources/mpv or install mpv and add it to PATH.',
  };
}
