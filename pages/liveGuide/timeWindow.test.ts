import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EpgProgramme } from '../../types/app';
import {
  buildGuideWindow,
  findCurrentProgramme,
  formatGuideDate,
  formatGuideTime,
  getProgrammeBlock,
  getProgrammeProgress,
} from './timeWindow';

const programme = (id: string, startAt: string, endAt: string, title = id): EpgProgramme => ({
  id,
  channelId: 'live:1',
  startAt,
  endAt,
  title,
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('live guide time window helpers', () => {
  it('starts on the previous half hour and spans two hours', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));

    expect(window.start.getMinutes()).toBe(0);
    expect(window.end.getMinutes()).toBe(0);
    expect(window.start.toISOString()).toBe('2026-06-29T03:00:00.000Z');
    expect(window.end.toISOString()).toBe('2026-06-29T05:00:00.000Z');
    expect(window.ticks.map((tick) => tick.toISOString())).toEqual([
      '2026-06-29T03:00:00.000Z',
      '2026-06-29T03:30:00.000Z',
      '2026-06-29T04:00:00.000Z',
      '2026-06-29T04:30:00.000Z',
      '2026-06-29T05:00:00.000Z',
    ]);
  });

  it('clips programme blocks to the visible guide window', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));
    const block = getProgrammeBlock(
      programme('f1', '2026-06-29T02:45:00.000Z', '2026-06-29T04:00:00.000Z'),
      window,
    );

    expect(block).toEqual({ leftPercent: 0, widthPercent: 50 });
  });

  it('returns null for programmes outside the guide window', () => {
    const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));

    expect(getProgrammeBlock(programme('old', '2026-06-29T01:00:00.000Z', '2026-06-29T02:00:00.000Z'), window)).toBeNull();
    expect(getProgrammeBlock(programme('future', '2026-06-29T05:30:00.000Z', '2026-06-29T06:00:00.000Z'), window)).toBeNull();
  });

  it('finds the programme that is currently on air', () => {
    const now = new Date('2026-06-29T03:18:00.000Z');
    const current = findCurrentProgramme([
      programme('old', '2026-06-29T02:00:00.000Z', '2026-06-29T03:00:00.000Z'),
      programme('current', '2026-06-29T03:00:00.000Z', '2026-06-29T04:00:00.000Z'),
    ], now);

    expect(current?.id).toBe('current');
  });

  it('calculates current programme progress and remaining minutes', () => {
    const now = new Date('2026-06-29T03:42:00.000Z');
    const progress = getProgrammeProgress(programme('f1', '2026-06-29T03:00:00.000Z', '2026-06-29T04:00:00.000Z'), now);

    expect(progress.percent).toBe(70);
    expect(progress.remainingMinutes).toBe(18);
  });

  it('formats guide times with a controlled locale output', () => {
    const value = new Date('2026-06-29T03:42:00.000Z');
    vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementation(function () {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(this);
    });

    expect(formatGuideTime(value)).toBe('03:42');
  });

  it('formats guide dates with a controlled locale output', () => {
    const value = new Date('2026-06-29T03:42:00.000Z');
    vi.spyOn(Date.prototype, 'toLocaleDateString').mockImplementation(function () {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      }).format(this);
    });

    expect(formatGuideDate(value)).toBe('Mon 29 Jun');
  });

  it('rounds guide windows on local wall-clock half hours in offset timezones', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'Asia/Kathmandu';

    try {
      const window = buildGuideWindow(new Date('2026-06-29T03:18:00.000Z'));

      expect(window.start.getHours()).toBe(9);
      expect(window.start.getMinutes()).toBe(0);
      expect(window.start.toISOString()).toBe('2026-06-29T03:15:00.000Z');
      expect(window.ticks.map((tick) => tick.getMinutes())).toEqual([0, 30, 0, 30, 0]);
    } finally {
      if (originalTz === undefined) {
        delete process.env.TZ;
      } else {
        process.env.TZ = originalTz;
      }
    }
  });
});
