import { Maximize2, Minimize2, Pause, Play, SkipBack, SkipForward, Square, Volume2, VolumeX } from 'lucide-react';
import { usePlayerStore } from '../../store/playerStore';

function formatTime(value?: number) {
  if (!value || Number.isNaN(value)) return '00:00';
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

type PlayerOverlayProps = {
  compact?: boolean;
};

const PlayerOverlay: React.FC<PlayerOverlayProps> = ({ compact = false }) => {
  const { state, command } = usePlayerStore((store) => ({ state: store.state, command: store.command }));
  const isPaused = state.status === 'paused';
  const canSeek = Boolean(state.durationSeconds);

  return (
    <div className={`${compact ? 'bg-slate-950/85 p-3' : 'bg-slate-950/95 p-4'} border-t border-slate-800 text-white`}>
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className={`${compact ? 'text-sm' : 'text-lg'} font-semibold truncate`}>{state.title}</div>
          <div className="text-sm text-slate-300">
            {state.status}
            {state.videoParams?.height ? ` · ${state.videoParams.height}p` : ''}
            {state.audioParams?.channels ? ` · ${state.audioParams.channels}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="icon-button" title="Previous" onClick={() => command({ type: 'previous' })}><SkipBack className="h-5 w-5" /></button>
          <button className="icon-button" title={isPaused ? 'Play' : 'Pause'} onClick={() => command({ type: 'playPause' })}>{isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
          <button className="icon-button" title="Stop" onClick={() => command({ type: 'stop' })}><Square className="h-5 w-5" /></button>
          <button className="icon-button" title="Next" onClick={() => command({ type: 'next' })}><SkipForward className="h-5 w-5" /></button>
          <button className="icon-button" title={state.muted ? 'Unmute' : 'Mute'} onClick={() => command({ type: 'mute', muted: !state.muted })}>{state.muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}</button>
          <input aria-label="Volume" type="range" min={0} max={100} value={state.volume} onChange={(event) => command({ type: 'setVolume', volume: Number(event.target.value) })} />
          <button className="icon-button" title={state.fullscreen ? 'Exit fullscreen' : 'Fullscreen'} onClick={() => command({ type: 'fullscreen', fullscreen: !state.fullscreen })}>
            {state.fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {canSeek && (
        <div className="mt-3 flex items-center gap-3 text-sm text-slate-300">
          <span>{formatTime(state.positionSeconds)}</span>
          <input className="flex-1" aria-label="Seek" type="range" min={0} max={state.durationSeconds ?? 0} value={state.positionSeconds} onChange={(event) => command({ type: 'seek', seconds: Number(event.target.value), mode: 'absolute' })} />
          <span>{formatTime(state.durationSeconds)}</span>
        </div>
      )}
      {!compact && (state.audioTracks.length > 0 || state.subtitleTracks.length > 0) && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          {state.audioTracks.length > 0 && (
            <select className="form-input max-w-52 h-9" value={state.audioTracks.find((track) => track.selected)?.id ?? ''} onChange={(event) => command({ type: 'selectAudioTrack', id: Number(event.target.value) })}>
              {state.audioTracks.map((track) => <option key={track.id} value={track.id}>{track.title || track.lang || `Audio ${track.id}`}</option>)}
            </select>
          )}
          {state.subtitleTracks.length > 0 && (
            <select className="form-input max-w-52 h-9" value={state.subtitleTracks.find((track) => track.selected)?.id ?? 'off'} onChange={(event) => command({ type: 'selectSubtitleTrack', id: event.target.value === 'off' ? null : Number(event.target.value) })}>
              <option value="off">Subtitles off</option>
              {state.subtitleTracks.map((track) => <option key={track.id} value={track.id}>{track.title || track.lang || `Subtitle ${track.id}`}</option>)}
            </select>
          )}
        </div>
      )}
      {state.error && <div className="mt-3 text-sm text-red-200">{state.error}</div>}
    </div>
  );
};

export default PlayerOverlay;
