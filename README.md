# Titon IPTV Player

Windows desktop Xtream Codes IPTV player built with Electron, React, and mpv.

## Development

```powershell
npm install
npm run electron:dev
```

## Verification

```powershell
npm test
npm run build
npm run build:win
```

## Playback Runtime

Playback is mpv-first. During development, install `mpv.exe` on PATH or place the Windows mpv runtime under `resources/mpv`.

The app is designed to preserve provider stream capabilities up to 2160p and 5.1 audio when the provider stream, Windows hardware, GPU drivers, audio device, and codec support them.
