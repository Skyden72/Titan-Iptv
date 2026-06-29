import type { EpgProgramme } from '../../types/app';

export type GuideWindow = {
  start: Date;
  end: Date;
  ticks: Date[];
  now: Date;
  durationMs: number;
};

export type ProgrammeBlock = {
  leftPercent: number;
  widthPercent: number;
};

const guideDurationMs = 2 * 60 * 60 * 1000;

export function buildGuideWindow(now = new Date()): GuideWindow {
  const start = new Date(now);
  start.setSeconds(0, 0);
  const localMinutes = start.getMinutes();
  start.setMinutes(localMinutes < 30 ? 0 : 30);

  const end = new Date(start);
  end.setHours(end.getHours() + 2);

  const ticks = Array.from({ length: 5 }, (_, index) => {
    const tick = new Date(start);
    tick.setMinutes(start.getMinutes() + index * 30);
    return tick;
  });

  return { start, end, ticks, now, durationMs: guideDurationMs };
}

export function getProgrammeBlock(programme: EpgProgramme, window: GuideWindow): ProgrammeBlock | null {
  const startMs = new Date(programme.startAt).getTime();
  const endMs = new Date(programme.endAt).getTime();
  const visibleStart = Math.max(startMs, window.start.getTime());
  const visibleEnd = Math.min(endMs, window.end.getTime());

  if (visibleEnd <= window.start.getTime() || visibleStart >= window.end.getTime() || visibleEnd <= visibleStart) {
    return null;
  }

  return {
    leftPercent: ((visibleStart - window.start.getTime()) / window.durationMs) * 100,
    widthPercent: ((visibleEnd - visibleStart) / window.durationMs) * 100,
  };
}

export function findCurrentProgramme(programmes: EpgProgramme[], now = new Date()): EpgProgramme | undefined {
  const nowMs = now.getTime();
  return programmes.find((programme) => {
    const startMs = new Date(programme.startAt).getTime();
    const endMs = new Date(programme.endAt).getTime();
    return startMs <= nowMs && endMs > nowMs;
  });
}

export function getProgrammeProgress(programme: EpgProgramme, now = new Date()) {
  const startMs = new Date(programme.startAt).getTime();
  const endMs = new Date(programme.endAt).getTime();
  const durationMs = Math.max(1, endMs - startMs);
  const elapsedMs = Math.min(durationMs, Math.max(0, now.getTime() - startMs));
  const remainingMs = Math.max(0, endMs - now.getTime());

  return {
    percent: Math.round((elapsedMs / durationMs) * 100),
    remainingMinutes: Math.ceil(remainingMs / 60000),
  };
}

export function formatGuideTime(value: Date | string): string {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatGuideDate(value: Date): string {
  return value.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short' });
}
