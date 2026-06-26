import { describe, expect, it } from 'vitest';
import { parseXmlTv } from '../../electron/xtream/epg';

describe('parseXmlTv', () => {
  it('parses programme entries and maps channel ids', () => {
    const xml = `<?xml version="1.0"?>
      <tv>
        <programme start="20260626080000 +0200" stop="20260626090000 +0200" channel="news">
          <title>Morning News</title>
          <desc>Headlines</desc>
        </programme>
      </tv>`;

    expect(parseXmlTv(xml, new Map([['news', 'live:10']]))).toEqual([{
      id: 'live:10:20260626080000 +0200',
      channelId: 'live:10',
      startAt: '2026-06-26T06:00:00.000Z',
      endAt: '2026-06-26T07:00:00.000Z',
      title: 'Morning News',
      description: 'Headlines',
    }]);
  });
});
