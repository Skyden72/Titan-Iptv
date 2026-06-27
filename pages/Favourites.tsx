import { Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import Player from '../components/Player';
import type { PlaybackRequest } from '../types/app';

const Favourites: React.FC = () => {
  const { favourites, liveChannels, movies, series, episodes } = useAppStore((state) => state);
  const openPlayer = usePlayerStore((state) => state.open);
  const currentRequest = usePlayerStore((state) => state.currentRequest);
  const fullscreen = usePlayerStore((state) => state.state.fullscreen);

  const items = favourites.map((favourite) => {
    if (favourite.kind === 'live') return { favourite, item: liveChannels.find((channel) => channel.id === favourite.itemId), title: liveChannels.find((channel) => channel.id === favourite.itemId)?.name };
    if (favourite.kind === 'movie') return { favourite, item: movies.find((movie) => movie.id === favourite.itemId), title: movies.find((movie) => movie.id === favourite.itemId)?.title };
    if (favourite.kind === 'series') return { favourite, item: series.find((show) => show.id === favourite.itemId), title: series.find((show) => show.id === favourite.itemId)?.title };
    return { favourite, item: episodes.find((episode) => episode.id === favourite.itemId), title: episodes.find((episode) => episode.id === favourite.itemId)?.title };
  }).filter((entry) => entry.item);

  function play(request: PlaybackRequest) {
    openPlayer(request);
  }

  return (
    <div className="h-full grid grid-cols-[24rem_minmax(0,1fr)] bg-slate-950">
      <aside className="min-h-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-xl font-semibold text-white">Favourites</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {items.map(({ favourite, item, title }) => {
          const playable = item && 'streamUrl' in item ? item : null;
          const playbackKind = favourite.kind === 'live' || favourite.kind === 'movie' || favourite.kind === 'episode' ? favourite.kind : null;
          const request = playable && playbackKind ? { kind: playbackKind, itemId: favourite.itemId, title: title ?? 'Favourite', streamUrl: playable.streamUrl } : null;
          return (
            <button key={`${favourite.kind}:${favourite.itemId}`} className="w-full h-16 rounded-md bg-slate-900 border border-slate-800 px-4 flex items-center gap-3 text-left hover:bg-slate-800" onClick={() => request && play(request)}>
              <div className="flex-1">
                <div className="text-white">{title}</div>
                <div className="text-xs text-slate-400">{favourite.kind}</div>
              </div>
              {request && (
                <span className="icon-button" title="Play">
                  <Play className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
        {items.length === 0 && <p className="text-slate-500">No favourites yet.</p>}
        </div>
      </aside>
      <section className="min-h-0 bg-slate-950 p-4 flex flex-col gap-4 overflow-hidden">
        <div className="aspect-video max-h-[52vh] min-h-[18rem] overflow-hidden rounded-md border border-slate-800 bg-black">
          {fullscreen ? <div className="h-full w-full bg-black" /> : <Player request={currentRequest} />}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="font-semibold text-white">{currentRequest?.title ?? 'No favourite playing'}</h2>
          <p className="mt-2 text-sm text-slate-500">Choose a favourite on the left to play it here.</p>
        </div>
      </section>
      </div>
  );
};

export default Favourites;
