import { XMLParser } from 'fast-xml-parser';
import type { EpgProgramme } from '../../types/app.js';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
});

function arrayify<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseXmlTvDate(input: string): string {
  const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2}) ([+-])(\d{2})(\d{2})$/);
  if (!match) return new Date(input).toISOString();
  const [, year, month, day, hour, minute, second, sign, offsetHour, offsetMinute] = match;
  const utc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
  const offsetMs = (Number(offsetHour) * 60 + Number(offsetMinute)) * 60 * 1000 * (sign === '+' ? 1 : -1);
  return new Date(utc - offsetMs).toISOString();
}

function readText(value: any): string {
  if (typeof value === 'string') return value;
  if (typeof value?.['#text'] === 'string') return value['#text'];
  return '';
}

type ParseXmlTvOptions = {
  from?: Date;
  to?: Date;
};

export function parseXmlTv(xml: string, channelMap: Map<string, string>, options: ParseXmlTvOptions = {}): EpgProgramme[] {
  const parsed = parser.parse(xml);
  const programmes = arrayify<any>(parsed?.tv?.programme);
  return programmes.flatMap((programme) => {
    const channelId = channelMap.get(String(programme.channel));
    if (!channelId || !programme.start || !programme.stop) return [];
    const startAt = parseXmlTvDate(String(programme.start));
    const endAt = parseXmlTvDate(String(programme.stop));
    if (options.from && new Date(endAt) <= options.from) return [];
    if (options.to && new Date(startAt) >= options.to) return [];
    return [{
      id: `${channelId}:${programme.start}`,
      channelId,
      startAt,
      endAt,
      title: readText(programme.title) || 'Untitled',
      description: readText(programme.desc) || undefined,
    }];
  });
}
