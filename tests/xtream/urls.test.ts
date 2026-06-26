import { describe, expect, it } from 'vitest';
import { buildPlayerApiUrl, buildStreamUrl, redactCredentialedUrl } from '../../electron/xtream/urls';

describe('xtream urls', () => {
  it('builds player api urls with encoded credentials', () => {
    expect(buildPlayerApiUrl({
      serverUrl: 'http://example.test:8080/',
      username: 'demo user',
      password: 'p@ss',
      action: 'get_live_streams',
    })).toBe('http://example.test:8080/player_api.php?username=demo+user&password=p%40ss&action=get_live_streams');
  });

  it('builds live, movie, and episode stream urls', () => {
    const credentials = { serverUrl: 'http://example.test:8080', username: 'u', password: 'p' };
    expect(buildStreamUrl(credentials, 'live', 10, 'ts')).toBe('http://example.test:8080/live/u/p/10.ts');
    expect(buildStreamUrl(credentials, 'movie', 11, 'mp4')).toBe('http://example.test:8080/movie/u/p/11.mp4');
    expect(buildStreamUrl(credentials, 'episode', 12, 'mkv')).toBe('http://example.test:8080/series/u/p/12.mkv');
  });

  it('redacts passwords in credentialed urls', () => {
    expect(redactCredentialedUrl('http://example.test/live/user/secret/10.ts')).toBe('http://example.test/live/user/[redacted]/10.ts');
  });
});
