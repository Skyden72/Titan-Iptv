# mpv Runtime

Place the Windows mpv runtime files here for bundled builds.

Expected bundled path after packaging:

`resources/mpv/mpv.exe`

During development the app also checks `PATH` for `mpv.exe`. Playback is mpv-first; if mpv is missing, Diagnostics reports the setup action instead of falling back to Chromium video.
