# Windows Xtream IPTV Player Design

## Goal

Build a Windows desktop IPTV app for Xtream Codes providers. The first finished version must support Live TV, Movies/VOD, Series, EPG, and Favourites from the start. Playback must target streams up to 2160p and support 5.1 surround audio when the provider stream and local audio device expose it.

## Platform

The app is Windows desktop first. React provides the interface, Electron provides the desktop shell and secure bridge, and mpv provides native playback. Browser-only playback is not a primary target because Chromium media support is not reliable enough for IPTV codec variety, 4K streams, and surround audio.

## Architecture

The app will be rebuilt around four boundaries:

1. Renderer UI: React screens for connection, library browsing, guide, favourites, search, settings, and player controls.
2. Electron main process: secure IPC, Xtream API requests, local storage access, mpv process lifecycle, stream launch commands, and app packaging.
3. IPTV domain layer: typed Xtream client, catalogue normalization, EPG parsing, favourites, playback history, and refresh jobs.
4. Player engine layer: an mpv adapter that starts/stops playback, sends commands, listens for playback state, and exposes a stable interface to the UI.

The player engine boundary must be fallback-ready: the app should not scatter mpv-specific logic through the UI. If a later VLC fallback is needed, it should fit behind the same player adapter shape.

## Playback

The player will use mpv as the first native media engine. The app should support:

- Live, movie, and episode playback through Xtream stream URLs.
- 2160p playback when the provider, network, GPU, display, and codec support it.
- 5.1 audio when the stream includes surround tracks and the Windows audio output supports them.
- Custom controls: play/pause, stop, seek for VOD/episodes, volume, mute, fullscreen, channel up/down, previous/next item, audio track selector, subtitle selector, quality/stream info, buffering/error states, and keyboard shortcuts.
- Clear player status: connecting, buffering, playing, paused, stalled, ended, failed.

The design cannot guarantee every IPTV stream will play at 2160p or 5.1 because that depends on provider format, network bandwidth, local hardware acceleration, GPU drivers, audio device, and codec availability. The requirement is to preserve and expose those capabilities rather than downscaling or mixing them away.

## Xtream Features

The Xtream client will support:

- Connection test and account status through `player_api.php`.
- Live categories and streams.
- VOD categories and streams.
- Series categories, series details, seasons, and episodes.
- XMLTV EPG where available from the provider.
- Stream URL construction for live, movie, and episode playback.
- Provider refresh with progress and clear errors.

Credentials should be stored locally and never written to logs. UI errors must avoid exposing passwords or full credentialed stream URLs.

## App Features

The first version includes:

- Connection/profile screen for Xtream Codes.
- Dashboard or library shell with Live TV, Movies, Series, EPG, Favourites, and Settings.
- Fast search across channels, movies, and series.
- Favourites for channels, movies, series, and episodes.
- Group/category browsing.
- EPG grid and channel detail schedule.
- Resume/watch progress for movies and episodes.
- Basic playback history and last played channel.
- Settings for hardware acceleration, audio output preference where feasible, subtitles, cache refresh, and diagnostics.

M3U support is not part of the first build unless it is already trivial after the Xtream foundation is complete. The first project focus is a complete Xtream app.

## Data Storage

Use a local desktop data store rather than browser-only localStorage. The storage layer should hold:

- Profiles and connection metadata.
- Normalized live channels, movies, series, episodes, categories, and EPG records.
- Favourites.
- Watched progress and resume points.
- Settings.
- Refresh timestamps and provider status.

The storage API should be abstracted so UI code does not depend on the database implementation directly.

## UI Direction

The app should feel like a practical media center rather than a marketing page. It should prioritize fast navigation, readable lists, predictable controls, and strong contrast for use on desktop displays and TVs. The player view should be full-bleed, with controls that appear on interaction and do not obscure the stream longer than necessary.

## Error Handling

The app should handle:

- Invalid credentials.
- Provider offline or timeout.
- Empty categories.
- Missing logos/posters.
- Expired or failing streams.
- Unsupported codecs or failed mpv startup.
- EPG unavailable or malformed.
- Local cache corruption.

Errors should offer clear recovery actions: retry, refresh provider data, reconnect profile, open diagnostics, or try alternate stream format where available.

## Packaging

The project must produce a working Windows desktop build. Packaging must include:

- Electron renderer output.
- Electron main/preload output.
- mpv binary and required runtime files, or a documented first-run dependency installer if bundling is not feasible.
- App icon and installer/portable configuration.

The build scripts must be fixed so development, production build, and Windows packaging are repeatable.

## Testing And Verification

Verification must include:

- Typecheck and production build.
- Unit tests for Xtream URL building, response normalization, EPG parsing, favourites, and storage operations.
- Integration tests for Electron IPC and mpv adapter command translation.
- Manual playback checks with sample Xtream-compatible streams at common formats.
- Specific checks for fullscreen, keyboard shortcuts, audio track selection, subtitle selection, reconnect behavior, and provider refresh.

No task should be considered done only because the UI renders; playback and packaging must be verified directly.

## Implementation Order

1. Create a clean project foundation and fix the build pipeline.
2. Add local storage, app shell, and typed IPC boundaries.
3. Implement the Xtream domain layer and provider refresh.
4. Implement the mpv adapter and basic playback.
5. Build full player controls and playback state.
6. Build Live TV, Movies, Series, EPG, Favourites, Settings, and diagnostics.
7. Complete Windows packaging and verification.

## Out Of Scope For First Version

- Multi-provider sync across devices.
- Cloud accounts.
- Mobile or TV-native apps.
- DRM playback.
- Recording/DVR.
- Automatic illegal stream discovery.
- Guaranteed playback of every provider stream regardless of codec or provider behavior.
