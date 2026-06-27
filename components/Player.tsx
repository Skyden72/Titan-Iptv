import { useEffect, useLayoutEffect, useRef } from 'react';
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
  const videoSurfaceRef = useRef<HTMLDivElement | null>(null);
  const startedRequestKey = useRef<string | null>(null);

  usePlayerShortcuts(Boolean(request));

  useLayoutEffect(() => {
    const surface = videoSurfaceRef.current;
    if (!request || !surface) {
      window.titon.setPlayerSurface({ x: 0, y: 0, width: 0, height: 0, visible: false });
      return;
    }

    const updateSurface = () => {
      const rect = surface.getBoundingClientRect();
      window.titon.setPlayerSurface({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: true,
      });
    };

    updateSurface();
    const observer = new ResizeObserver(updateSurface);
    observer.observe(surface);
    window.addEventListener('resize', updateSurface);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSurface);
      window.titon.setPlayerSurface({ x: 0, y: 0, width: 0, height: 0, visible: false });
    };
  }, [request]);

  useEffect(() => {
    const surface = videoSurfaceRef.current;
    if (!request || !surface) {
      startedRequestKey.current = null;
      return;
    }

    const requestKey = `${request.kind}:${request.itemId}:${request.streamUrl}`;
    if (startedRequestKey.current === requestKey) return;
    startedRequestKey.current = requestKey;

    const rect = surface.getBoundingClientRect();
    window.titon
      .setPlayerSurface({
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
        visible: true,
      })
      .then(() => start(request));
  }, [request, start]);

  if (!request) {
    return <div className="h-full w-full bg-black flex items-center justify-center text-slate-500">Select something to play</div>;
  }

  return (
    <div className="h-full w-full bg-black grid grid-rows-[1fr_auto] overflow-hidden" onMouseMove={showControls} onMouseLeave={hideControls}>
      <div ref={videoSurfaceRef} className="min-h-0 flex items-center justify-center text-slate-500">
        {playerState.status === 'connecting' || playerState.status === 'buffering' ? playerState.status : 'mpv playback window'}
      </div>
      {controlsVisible && <PlayerOverlay />}
    </div>
  );
};

export default Player;
