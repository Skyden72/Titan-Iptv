// FIX: Implement the IPTV service logic. This file was a placeholder.
// This service acts as a facade for different IPTV source types (like Xtream, M3U),
// fetching and parsing data into a unified format for the application to consume.

import { ConnectionDetails, Channel, Media, SeriesInfo, EpgEntry } from '../types';
import * as xtream from '../lib/xtream';
import { httpGet } from '../lib/http';
import { M3uParser } from 'm3u-parser-generator';

interface IptvData {
  channels: Channel[];
  movies: Media[];
  series: SeriesInfo[];
  epg: Record<string, EpgEntry[]>;
}

export class IptvService {
  public async fetchData(details: ConnectionDetails): Promise<IptvData> {
    if (details.type === 'xtream') {
      return this.fetchFromXtream(details);
    }
    if (details.type === 'm3u') {
      return this.fetchFromM3u(details);
    }
    throw new Error('Unsupported connection type');
  }

  private async fetchFromXtream(details: ConnectionDetails): Promise<IptvData> {
    const { serverUrl, username, password, apiPath } = details;
    if (!serverUrl || !username || !password) {
      throw new Error('Missing Xtream connection details');
    }
    const resolvedPath = apiPath || 'player_api.php'; // Fallback to default

    // Authenticate first to ensure credentials are valid with the discovered path
    await xtream.testXtreamResolved(serverUrl, resolvedPath, username, password);

    const [channels, movies, series] = await Promise.all([
      xtream.getLiveStreams(serverUrl, resolvedPath, username, password),
      xtream.getVodStreams(serverUrl, resolvedPath, username, password),
      xtream.getSeries(serverUrl, resolvedPath, username, password)
    ]);

    // Note: A full EPG implementation for Xtream would require another API call.
    // For simplicity, we'll return an empty EPG for now.
    const epg: Record<string, EpgEntry[]> = {};
    
    return { channels, movies, series, epg };
  }
  
  private async fetchFromM3u(details: ConnectionDetails): Promise<IptvData> {
    const { m3uUrl, epgUrl } = details;
    if (!m3uUrl) {
      throw new Error('Missing M3U URL');
    }

    const res = await httpGet(m3uUrl);
    if (!res.ok || !res.text) {
      throw new Error(`Failed to fetch M3U playlist: ${res.error}`);
    }
    
    const parser = new M3uParser();
    parser.parse(res.text);
    const playlist = parser.getPlaylist();

    const channels: Channel[] = playlist.items.map((item, index) => ({
      id: item.attributes['tvg-id'] || `m3u-${index}`,
      name: item.title,
      logo: item.attributes['tvg-logo'] || '',
      group: item.group,
      streamUrl: item.url,
    }));

    const epg = epgUrl ? await this.fetchEpg(epgUrl) : {};
    
    // M3U files typically only contain live channels.
    return { channels, movies: [], series: [], epg };
  }

  private async fetchEpg(epgUrl: string): Promise<Record<string, EpgEntry[]>> {
    // This is a simplified EPG parser. A real implementation would be more robust
    // and likely use a dedicated XML parsing library.
    console.log(`Fetching EPG from ${epgUrl}`);
    // For the sake of this example, we will not implement a full XMLTV parser,
    // as it is complex. Returning an empty object.
    return {};
  }
}
