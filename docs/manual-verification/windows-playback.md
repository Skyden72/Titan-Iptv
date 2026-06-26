# Windows Playback Verification

Use a real Xtream Codes test account supplied by the user. Do not commit credentials, stream URLs, screenshots containing credentials, or provider-specific account data.

## Build Verification

- `npm run test` passes.
- `npm run build` passes.
- `npm run build:win` creates installer and portable artifacts under `release/`.
- `dist-electron/main.js` and `dist-electron/preload.js` exist after the build.

## Connection Verification

- Invalid credentials show a clear sanitized error.
- Valid credentials save one local profile.
- Provider refresh loads Live TV, Movies, Series, Episodes, and EPG where available.
- Diagnostics does not display passwords or full credentialed stream URLs.

## Playback Verification

- Live channel playback starts through mpv.
- Movie playback starts through mpv and seek controls work.
- Episode playback starts through mpv and seek controls work.
- Play/pause, stop, volume, mute, fullscreen, previous/next, audio track selector, subtitle selector, and keyboard shortcuts work.
- Player status transitions through connecting, playing, paused, ended, and failed when those states are triggered.
- A 2160p-capable provider stream is not downscaled by the app; confirm stream info shows the provider resolution when hardware supports it.
- A 5.1-capable provider stream exposes surround audio when the Windows audio device supports it; confirm stream info shows multichannel audio when available.

## Library Verification

- Live TV category filtering and search work.
- Movies category filtering and search work.
- Series details show seasons and episodes.
- EPG page shows programme entries when XMLTV is available.
- Favourites work for live channels, movies, series, and episodes.
- Resume/progress appears for movies and episodes after playback progress is saved.

## Failure Verification

- Missing mpv reports setup action in Diagnostics.
- Provider timeout shows retry guidance without exposing credentials.
- Empty categories render empty states.
- Missing logos and posters do not break layouts.
