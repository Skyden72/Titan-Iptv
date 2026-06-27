import { useEffect } from 'react';
import { usePlayerStore } from '../../store/playerStore';

export function usePlayerShortcuts(enabled: boolean) {
  const command = usePlayerStore((state) => state.command);
  const fullscreen = usePlayerStore((state) => state.state.fullscreen);
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return;
      if (event.code === 'Space') {
        event.preventDefault();
        command({ type: 'playPause' });
      }
      if (event.key === 'ArrowRight') command({ type: 'seek', seconds: 10, mode: 'relative' });
      if (event.key === 'ArrowLeft') command({ type: 'seek', seconds: -10, mode: 'relative' });
      if (event.key === 'ArrowUp') command({ type: 'setVolume', volume: 100 });
      if (event.key === 'ArrowDown') command({ type: 'setVolume', volume: 40 });
      if (event.key.toLowerCase() === 'm') command({ type: 'mute', muted: true });
      if (event.key.toLowerCase() === 'f') command({ type: 'fullscreen', fullscreen: !fullscreen });
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [command, enabled, fullscreen]);
}
