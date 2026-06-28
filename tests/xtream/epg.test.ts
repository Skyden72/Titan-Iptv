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

  it('limits programme entries to the requested guide window', () => {
    const xml = `<?xml version="1.0"?>
      <tv>
        <programme start="20260625080000 +0200" stop="20260625090000 +0200" channel="news"><title>Old</title></programme>
        <programme start="20260626080000 +0200" stop="20260626090000 +0200" channel="news"><title>Current</title></programme>
        <programme start="20260704080000 +0200" stop="20260704090000 +0200" channel="news"><title>Future</title></programme>
      </tv>`;

    const result = parseXmlTv(xml, new Map([['news', 'live:10']]), {
      from: new Date('2026-06-26T00:00:00.000Z'),
      to: new Date('2026-07-03T00:00:00.000Z'),
    });

    expect(result.map((programme) => programme.title)).toEqual(['Current']);
  });

  it('parses large XMLTV files with many text entities without tripping entity expansion limits', () => {
    const title = Array.from({ length: 1100 }, () => 'Sport &amp; News').join(' ');
    const xml = `<?xml version="1.0"?>
      <tv>
        <programme start="20260626080000 +0200" stop="20260626090000 +0200" channel="news">
          <title>${title}</title>
        </programme>
      </tv>`;

    const [programme] = parseXmlTv(xml, new Map([['news', 'live:10']]));

    expect(programme.title).toContain('Sport & News');
  });
});
