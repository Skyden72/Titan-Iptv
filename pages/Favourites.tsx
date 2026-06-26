import { Play } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';

const Favourites: React.FC = () => {
  const { favourites, liveChannels, movies, series, episodes } = useAppStore((state) => state);
  const openPlayer = usePlayerStore((state) => state.open);

  const items = favourites.map((favourite) => {
    if (favourite.kind === 'live') return { favourite, item: liveChannels.find((channel) => channel.id === favourite.itemId), title: liveChannels.find((channel) => channel.id === favourite.itemId)?.name };
    if (favourite.kind === 'movie') return { favourite, item: movies.find((movie) => movie.id === favourite.itemId), title: movies.find((movie) => movie.id === favourite.itemId)?.title };
    if (favourite.kind === 'series') return { favourite, item: series.find((show) => show.id === favourite.itemId), title: series.find((show) => show.id === favourite.itemId)?.title };
    return { favourite, item: episodes.find((episode) => episode.id === favourite.itemId), title: episodes.find((episode) => episode.id === favourite.itemId)?.title };
  }).filter((entry) => entry.item);

  return (
    <div className="h-full overflow-y-auto p-5">
      <h1 className="text-xl font-semibold text-white mb-4">Favourites</h1>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {items.map(({ favourite, item, title }) => {
          const playable = item && 'streamUrl' in item ? item : null;
          const playbackKind = favourite.kind === 'live' || favourite.kind === 'movie' || favourite.kind === 'episode' ? favourite.kind : null;
          return (
            <article key={`${favourite.kind}:${favourite.itemId}`} className="h-16 rounded-md bg-slate-900 border border-slate-800 px-4 flex items-center gap-3">
              <div className="flex-1">
                <div className="text-white">{title}</div>
                <div className="text-xs text-slate-400">{favourite.kind}</div>
              </div>
              {playable && playbackKind && (
                <button className="icon-button" title="Play" onClick={() => openPlayer({ kind: playbackKind, itemId: favourite.itemId, title: title ?? 'Favourite', streamUrl: playable.streamUrl })}>
                  <Play className="h-4 w-4" />
                </button>
              )}
            </article>
          );
        })}
        {items.length === 0 && <p className="text-slate-500">No favourites yet.</p>}
      </div>
    </div>
  );
};

export default Favourites;
