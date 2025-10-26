// FIX: Implement the Xtream Codes API client. This file was a placeholder.
// This module provides functions to interact with an Xtream Codes compatible server,
// fetching live streams, VODs, and series information.

import { httpGet } from './http';
import { Channel, Media, SeriesInfo } from '../types';

// Type definitions for the raw Xtream API responses
type XtreamLiveStream = {
  stream_id: number;
  name: string;
  stream_icon: string;
  category_id: string;
  category_name: string;
};

type XtreamVodStream = {
  stream_id: number;
  name: string;
  stream_icon: string;
  rating: string;
  added: string;
  container_extension: string;
};

type XtreamSeries = {
  series_id: number;
  name: string;
  cover: string;
  rating: string;
  releaseDate: string;
};

type XtreamAuthResponse = {
  user_info: {
    auth: 1 | 0;
    status: string;
  };
};

function buildApiUrl(serverUrl: string, path: string, username: string, password: string, action: string) {
  const cleanServerUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${cleanServerUrl}/${cleanPath}?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}&action=${action}`;
}

export async function testXtreamResolved(serverUrl: string, path: string, username: string, password: string): Promise<void> {
    const url = buildApiUrl(serverUrl, path, username, password, ''); // No action, just auth
    const res = await httpGet<XtreamAuthResponse>(url);
    if (!res.ok || !res.json || res.json.user_info?.auth !== 1) {
      throw new Error(`Authentication failed. Status: ${res.json?.user_info?.status || 'Unknown error'}`);
    }
}

export async function getLiveStreams(serverUrl: string, path: string, username: string, password: string): Promise<Channel[]> {
  const url = buildApiUrl(serverUrl, path, username, password, 'get_live_streams');
  const res = await httpGet<XtreamLiveStream[]>(url);

  if (!res.ok || !Array.isArray(res.json)) {
    throw new Error('Failed to fetch live streams or invalid format.');
  }

  return res.json.map(item => ({
    id: String(item.stream_id),
    name: item.name,
    logo: item.stream_icon,
    group: item.category_name,
    streamUrl: `${serverUrl}/live/${username}/${password}/${item.stream_id}.ts`, // .ts is common, could be .m3u8
  }));
}

export async function getVodStreams(serverUrl: string, path: string, username: string, password: string): Promise<Media[]> {
  const url = buildApiUrl(serverUrl, path, username, password, 'get_vod_streams');
  const res = await httpGet<XtreamVodStream[]>(url);

  if (!res.ok || !Array.isArray(res.json)) {
    throw new Error('Failed to fetch VOD streams or invalid format.');
  }

  return res.json.map(item => ({
    id: String(item.stream_id),
    title: item.name,
    poster: item.stream_icon,
    rating: item.rating,
    year: new Date(item.added).getFullYear().toString(),
    streamUrl: `${serverUrl}/movie/${username}/${password}/${item.stream_id}.${item.container_extension}`,
  }));
}

export async function getSeries(serverUrl: string, path: string, username: string, password: string): Promise<SeriesInfo[]> {
  const url = buildApiUrl(serverUrl, path, username, password, 'get_series');
  const res = await httpGet<XtreamSeries[]>(url);
  
  if (!res.ok || !Array.isArray(res.json)) {
    throw new Error('Failed to fetch series or invalid format.');
  }
  
  return res.json.map(item => ({
    id: String(item.series_id),
    title: item.name,
    poster: item.cover,
    rating: item.rating,
    year: item.releaseDate ? new Date(item.releaseDate).getFullYear().toString() : undefined,
  }));
}
