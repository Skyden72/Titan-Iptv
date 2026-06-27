import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
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
  const hideControlsTimer = useRef<number | null>(null);
  const cursorPosition = useRef<{ x: number; y: number } | null>(null);
  const isFullscreen = playerState.fullscreen;

  usePlayerShortcuts(Boolean(request));

  const scheduleControlsHide = useCallback(() => {
    if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    if (!isFullscreen || !request) return;
    hideControlsTimer.current = window.setTimeout(() => hideControls(), 3000);
  }, [hideControls, isFullscreen, request]);

  const revealControls = useCallback(() => {
    if (!isFullscreen) return;
    showControls();
    scheduleControlsHide();
  }, [isFullscreen, scheduleControlsHide, showControls]);

  useEffect(() => {
    if (!isFullscreen || !request) {
      showControls();
      return;
    }

    showControls();
    scheduleControlsHide();
    return () => {
      if (hideControlsTimer.current) window.clearTimeout(hideControlsTimer.current);
    };
  }, [isFullscreen, request, scheduleControlsHide, showControls]);

  useEffect(() => {
    if (!isFullscreen || !request) return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      const next = await window.titon.getCursorPosition();
      if (cancelled) return;
      const previous = cursorPosition.current;
      cursorPosition.current = next;
      if (previous && (previous.x !== next.x || previous.y !== next.y)) revealControls();
    }, 250);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      cursorPosition.current = null;
    };
  }, [isFullscreen, request, revealControls]);

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
  }, [controlsVisible, isFullscreen, request]);

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
    <div
      className={`${isFullscreen && !controlsVisible ? 'cursor-none' : ''} h-full w-full bg-black grid overflow-hidden transition-[grid-template-rows] duration-300 ease-out ${isFullscreen && !controlsVisible ? 'grid-rows-[minmax(0,1fr)_0px]' : 'grid-rows-[minmax(0,1fr)_auto]'}`}
      onMouseMove={revealControls}
    >
      <div ref={videoSurfaceRef} className="min-h-0 flex items-center justify-center text-slate-500">
        {playerState.status === 'connecting' || playerState.status === 'buffering' ? playerState.status : 'mpv playback window'}
      </div>
      <div className={`${isFullscreen ? 'overflow-hidden transition duration-300 ease-out' : ''} ${isFullscreen && !controlsVisible ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
        <PlayerOverlay />
      </div>
    </div>
  );
};

export default Player;
