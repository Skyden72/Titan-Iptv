import { useEffect } from 'react';
import type { PlaybackRequest } from '../types/app';
import { usePlayerStore } from '../store/playerStore';
import PlayerOverlay from './player/PlayerOverlay';
import { usePlayerShortcuts } from './player/usePlayerShortcuts';

type PlayerProps = {
  request: PlaybackRequest | null;
};

const Player: React.FC<PlayerProps> = ({ request }) => {
  const start = usePlayerStore((state) => state.start);
  const playerState = usePlayerStore((state) => state.state);
  const controlsVisible = usePlayerStore((state) => state.controlsVisible);
  const showControls = usePlayerStore((state) => state.showControls);
  const hideControls = usePlayerStore((state) => state.hideControls);

  usePlayerShortcuts(Boolean(request));

  useEffect(() => {
    if (request) start(request);
  }, [request, start]);

  if (!request) {
    return <div className="h-full w-full bg-black flex items-center justify-center text-slate-500">Select something to play</div>;
  }

  return (
    <div className="relative h-full w-full bg-black overflow-hidden" onMouseMove={showControls} onMouseLeave={hideControls}>
      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
        {playerState.status === 'connecting' || playerState.status === 'buffering' ? playerState.status : 'mpv playback window'}
      </div>
      {controlsVisible && <PlayerOverlay />}
    </div>
  );
};

export default Player;
