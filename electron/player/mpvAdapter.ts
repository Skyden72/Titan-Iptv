import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createConnection, type Socket } from 'node:net';
import { promisify } from 'node:util';
import type { PlayerCommand } from '../../shared/ipc.js';
import type { PlaybackRequest, PlayerState, PlayerSurfaceBounds, TrackInfo } from '../../types/app.js';
import type { PlayerEngine } from './playerTypes.js';

const execFileAsync = promisify(execFile);

type IpcSocket = Pick<Socket, 'write' | 'on' | 'end' | 'destroy'>;

type HostWindowInput = {
  pid: number;
  parentWindowId: string;
  bounds: PlayerSurfaceBounds;
};

type Deps = {
  spawnProcess?: typeof spawn;
  createIpcConnection?: (path: string) => Promise<IpcSocket>;
  ipcPathFactory?: () => string;
  hostMpvWindow?: (input: HostWindowInput) => Promise<void>;
};

const idleState: PlayerState = {
  status: 'idle',
  positionSeconds: 0,
  volume: 100,
  muted: false,
  fullscreen: false,
  audioTracks: [],
  subtitleTracks: [],
};

function redactCredentialedText(text: string): string {
  return text.replace(/\/(live|movie|series)\/([^/]+)\/([^/]+)\//, '/$1/$2/[redacted]/');
}

export class MpvAdapter implements PlayerEngine {
  private process: ChildProcessWithoutNullStreams | null = null;
  private ipcSocket: IpcSocket | null = null;
  private ipcPath: string | null = null;
  private surfaceBounds: PlayerSurfaceBounds | null = null;
  private state: PlayerState = idleState;
  private listeners = new Set<(state: PlayerState) => void>();
  private requestId = 1;

  constructor(private readonly mpvPath: string | undefined, private readonly deps: Deps = {}) {}

  setSurfaceBounds(bounds: PlayerSurfaceBounds | null): void {
    this.surfaceBounds = bounds;
    if (bounds && this.process) this.send(['set_property', 'geometry', this.geometry(bounds)]);
    if (bounds && this.process) this.hostSurface().catch((error) => this.update({ ...this.state, status: 'failed', error: error.message }));
  }

  async start(request: PlaybackRequest): Promise<PlayerState> {
    if (!this.mpvPath) {
      return this.update({ ...idleState, status: 'failed', error: 'mpv.exe is unavailable. Open Diagnostics for setup steps.' });
    }
    if (!this.process) this.spawnMpv();
    this.update({ ...this.state, status: 'connecting', title: request.title, itemId: request.itemId, error: undefined });
    await this.hostSurface().catch((error) => this.update({ ...this.state, error: error.message }));
    await this.ensureIpc();
    this.send(['loadfile', request.streamUrl, 'replace']);
    this.send(['observe_property', 1, 'time-pos']);
    this.send(['observe_property', 2, 'duration']);
    this.send(['observe_property', 3, 'pause']);
    this.send(['observe_property', 4, 'track-list']);
    this.send(['observe_property', 5, 'video-params']);
    this.send(['observe_property', 6, 'audio-params']);
    return this.state;
  }

  async command(command: PlayerCommand): Promise<PlayerState> {
    if (command.type === 'playPause') this.send(['cycle', 'pause']);
    if (command.type === 'stop') return this.stop();
    if (command.type === 'seek') this.send(['seek', command.seconds, command.mode === 'absolute' ? 'absolute' : 'relative']);
    if (command.type === 'setVolume') {
      this.send(['set_property', 'volume', command.volume]);
      this.update({ ...this.state, volume: command.volume });
    }
    if (command.type === 'mute') {
      this.send(['set_property', 'mute', command.muted]);
      this.update({ ...this.state, muted: command.muted });
    }
    if (command.type === 'fullscreen') {
      this.send(['set_property', 'fullscreen', command.fullscreen]);
      this.update({ ...this.state, fullscreen: command.fullscreen });
    }
    if (command.type === 'selectAudioTrack') this.send(['set_property', 'aid', command.id]);
    if (command.type === 'selectSubtitleTrack') this.send(['set_property', 'sid', command.id ?? 'no']);
    return this.state;
  }

  async stop(): Promise<PlayerState> {
    this.send(['stop']);
    return this.update({ ...idleState, volume: this.state.volume, muted: this.state.muted });
  }

  currentState(): PlayerState {
    return this.state;
  }

  onState(callback: (state: PlayerState) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private spawnMpv() {
    const spawnProcess = this.deps.spawnProcess ?? spawn;
    this.ipcPath = this.deps.ipcPathFactory?.() ?? `\\\\.\\pipe\\titon-mpv-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const surfaceArgs = this.surfaceBounds ? [`--geometry=${this.geometry(this.surfaceBounds)}`] : [];
    this.process = spawnProcess(this.mpvPath!, [
      '--no-config',
      '--idle=yes',
      '--force-window=immediate',
      '--border=no',
      '--osc=no',
      '--osd-level=0',
      '--input-default-bindings=no',
      '--title=Titon IPTV Player Video',
      ...surfaceArgs,
      `--input-ipc-server=${this.ipcPath}`,
      '--input-terminal=no',
      '--term-playing-msg=',
      '--msg-level=all=v',
      '--audio-channels=stereo',
      '--hwdec=no',
      '--vf=lavfi=[scale=w=min(1920\\,iw):h=min(1080\\,ih):force_original_aspect_ratio=decrease,format=pix_fmts=yuv420p]',
      '--vo=gpu-next',
      '--gpu-api=d3d11',
      '--gpu-context=d3d11',
      '--vd-lavc-dr=no',
    ], { stdio: 'pipe', windowsHide: false }) as ChildProcessWithoutNullStreams;

    this.process.stdout.on('data', (chunk) => this.handleOutput(String(chunk)));
    this.process.stderr.on('data', (chunk) => {
      const safe = redactCredentialedText(String(chunk)).trim().slice(0, 500);
      if (/error|failed/i.test(safe)) this.update({ ...this.state, status: 'failed', error: safe });
    });
    this.process.on('exit', () => {
      this.process = null;
      this.ipcSocket?.destroy();
      this.ipcSocket = null;
      this.update({ ...this.state, status: this.state.status === 'idle' ? 'idle' : 'ended' });
    });
  }

  private send(command: unknown[]) {
    this.ipcSocket?.write(`${JSON.stringify({ command, request_id: this.requestId++ })}\n`);
  }

  private geometry(bounds: PlayerSurfaceBounds): string {
    return `${Math.max(16, Math.round(bounds.width))}x${Math.max(16, Math.round(bounds.height))}+${Math.round(bounds.x)}+${Math.round(bounds.y)}`;
  }

  private async hostSurface() {
    if (!this.process?.pid || !this.surfaceBounds?.parentWindowId) return;
    const host = this.deps.hostMpvWindow ?? ((input: HostWindowInput) => this.hostMpvWindow(input));
    await host({ pid: this.process.pid, parentWindowId: this.surfaceBounds.parentWindowId, bounds: this.surfaceBounds });
  }

  private async hostMpvWindow(input: HostWindowInput): Promise<void> {
    const bounds = input.bounds;
    const targetPid = Math.trunc(input.pid);
    const parentWindowId = Math.trunc(Number(input.parentWindowId));
    if (!Number.isFinite(targetPid) || !Number.isFinite(parentWindowId)) {
      throw new Error('Invalid native window handle for mpv embedding.');
    }
    const x = Math.round(bounds.x);
    const y = Math.round(bounds.y);
    const width = Math.max(16, Math.round(bounds.width));
    const height = Math.max(16, Math.round(bounds.height));
    const script = `
$targetPid = [uint32]${targetPid}
$parent = [IntPtr]([int64]${parentWindowId})
$x = [int]${x}
$y = [int]${y}
$w = [int]${width}
$h = [int]${height}
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class TitonWin32 {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  public delegate bool EnumChildProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWndParent, EnumChildProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern IntPtr GetParent(IntPtr hWnd);
  [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);
  [DllImport("user32.dll", EntryPoint="GetWindowLongPtr", SetLastError=true)] public static extern IntPtr GetWindowLongPtr64(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", EntryPoint="SetWindowLongPtr", SetLastError=true)] public static extern IntPtr SetWindowLongPtr64(IntPtr hWnd, int nIndex, IntPtr dwNewLong);
  [DllImport("user32.dll", EntryPoint="GetWindowLong", SetLastError=true)] public static extern int GetWindowLong32(IntPtr hWnd, int nIndex);
  [DllImport("user32.dll", EntryPoint="SetWindowLong", SetLastError=true)] public static extern int SetWindowLong32(IntPtr hWnd, int nIndex, int dwNewLong);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool bRepaint);
  [DllImport("user32.dll", SetLastError=true)] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  public static IntPtr GetStyle(IntPtr hWnd, int nIndex) {
    return IntPtr.Size == 8 ? GetWindowLongPtr64(hWnd, nIndex) : new IntPtr(GetWindowLong32(hWnd, nIndex));
  }
  public static void SetStyle(IntPtr hWnd, int nIndex, IntPtr style) {
    if (IntPtr.Size == 8) SetWindowLongPtr64(hWnd, nIndex, style); else SetWindowLong32(hWnd, nIndex, style.ToInt32());
  }
}
"@
$script:found = [IntPtr]::Zero
$deadline = [DateTime]::UtcNow.AddSeconds(5)
while ($script:found -eq [IntPtr]::Zero -and [DateTime]::UtcNow -lt $deadline) {
  [TitonWin32]::EnumChildWindows($parent, {
    param($hWnd, $lParam)
    [uint32]$windowPid = 0
    [void][TitonWin32]::GetWindowThreadProcessId($hWnd, [ref]$windowPid)
    if ($windowPid -eq $targetPid -and [TitonWin32]::IsWindowVisible($hWnd)) {
      $script:found = $hWnd
      return $false
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:found -ne [IntPtr]::Zero) { break }
  [TitonWin32]::EnumWindows({
    param($hWnd, $lParam)
    [uint32]$windowPid = 0
    [void][TitonWin32]::GetWindowThreadProcessId($hWnd, [ref]$windowPid)
    if ($windowPid -eq $targetPid -and [TitonWin32]::IsWindowVisible($hWnd)) {
      $script:found = $hWnd
      return $false
    }
    return $true
  }, [IntPtr]::Zero) | Out-Null
  if ($script:found -eq [IntPtr]::Zero) { Start-Sleep -Milliseconds 100 }
}
if ($script:found -eq [IntPtr]::Zero) { throw "Could not find mpv window for PID $targetPid" }
$GWL_STYLE = -16
$WS_CHILD = [int64]0x40000000
$WS_VISIBLE = [int64]0x10000000
$WS_CAPTION = [int64]0x00C00000
$WS_THICKFRAME = [int64]0x00040000
$WS_POPUP = [int64]0x80000000
$SWP_NOZORDER = [uint32]0x0004
$SWP_FRAMECHANGED = [uint32]0x0020
$style = [TitonWin32]::GetStyle($script:found, $GWL_STYLE).ToInt64()
$remove = $WS_CAPTION -bor $WS_THICKFRAME -bor $WS_POPUP
$next = ($style -bor $WS_CHILD -bor $WS_VISIBLE) -band (-bnot $remove)
[TitonWin32]::SetStyle($script:found, $GWL_STYLE, [IntPtr]$next)
[void][TitonWin32]::SetParent($script:found, $parent)
[void][TitonWin32]::SetWindowPos($script:found, [IntPtr]::Zero, $x, $y, $w, $h, $SWP_NOZORDER -bor $SWP_FRAMECHANGED)
[void][TitonWin32]::MoveWindow($script:found, $x, $y, $w, $h, $true)
[void][TitonWin32]::ShowWindow($script:found, 5)
`;
    await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-Command',
      script,
    ], { windowsHide: true, timeout: 8000 });
  }

  private async ensureIpc() {
    if (this.ipcSocket) return;
    if (!this.ipcPath) throw new Error('mpv IPC path was not initialized.');
    const connect = this.deps.createIpcConnection ?? ((path: string) => this.connectIpcPipe(path));
    this.ipcSocket = await connect(this.ipcPath);
    this.ipcSocket.on('data', (chunk) => this.handleOutput(String(chunk)));
    this.ipcSocket.on('error', (error: Error) => this.update({ ...this.state, status: 'failed', error: error.message }));
    this.ipcSocket.on('close', () => {
      this.ipcSocket = null;
    });
  }

  private async connectIpcPipe(path: string): Promise<IpcSocket> {
    const attempts = 50;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await new Promise<IpcSocket>((resolve, reject) => {
          const socket = createConnection(path);
          socket.once('connect', () => resolve(socket));
          socket.once('error', reject);
        });
      } catch (error) {
        if (attempt === attempts) throw error;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    throw new Error('Unable to connect to mpv IPC pipe.');
  }

  private handleOutput(output: string) {
    for (const line of output.split(/\r?\n/).filter(Boolean)) {
      try {
        const message = JSON.parse(line);
        if (message.event === 'file-loaded') this.update({ ...this.state, status: 'playing' });
        if (message.event === 'pause') this.update({ ...this.state, status: 'paused' });
        if (message.event === 'unpause') this.update({ ...this.state, status: 'playing' });
        if (message.event === 'end-file') this.update({ ...this.state, status: 'ended' });
        if (message.event === 'property-change') this.applyProperty(message.name, message.data);
      } catch {
        if (/buffer/i.test(line)) this.update({ ...this.state, status: 'buffering' });
      }
    }
  }

  private applyProperty(name: string, data: any) {
    if (name === 'time-pos') this.update({ ...this.state, positionSeconds: Number(data ?? 0) });
    if (name === 'duration') this.update({ ...this.state, durationSeconds: Number(data ?? 0) });
    if (name === 'pause') this.update({ ...this.state, status: data ? 'paused' : 'playing' });
    if (name === 'track-list') {
      const tracks = Array.isArray(data) ? data : [];
      const mapTrack = (track: any): TrackInfo => ({ id: Number(track.id), type: track.type, title: track.title, lang: track.lang, selected: Boolean(track.selected) });
      this.update({
        ...this.state,
        audioTracks: tracks.filter((track) => track.type === 'audio').map(mapTrack),
        subtitleTracks: tracks.filter((track) => track.type === 'sub').map(mapTrack),
      });
    }
    if (name === 'video-params') this.update({ ...this.state, videoParams: { width: data?.w, height: data?.h, codec: data?.pixelformat, fps: data?.fps } });
    if (name === 'audio-params') this.update({ ...this.state, audioParams: { codec: data?.format, channels: data?.['channel-count'] ? `${data['channel-count']}ch` : data?.channels, samplerate: data?.samplerate } });
  }

  private update(next: PlayerState): PlayerState {
    this.state = next;
    for (const listener of this.listeners) listener(next);
    return next;
  }
}
