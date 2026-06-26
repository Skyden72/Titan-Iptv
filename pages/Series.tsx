import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import type { Series as SeriesItem } from '../types/app';

const Series: React.FC = () => {
  const { series, episodes, seriesCategories, favourites, toggleFavourite, progress } = useAppStore((state) => state);
  const openPlayer = usePlayerStore((state) => state.open);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [selected, setSelected] = useState<SeriesItem | null>(series[0] ?? null);
  const filtered = useMemo(() => series.filter((item) => (categoryId === 'all' || item.categoryId === categoryId) && item.title.toLowerCase().includes(query.toLowerCase())), [series, categoryId, query]);
  const selectedEpisodes = selected ? episodes.filter((episode) => episode.seriesId === selected.id) : [];
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'series').map((item) => item.itemId));

  return (
    <div className="h-full grid grid-cols-[24rem_1fr] bg-slate-950">
      <aside className="border-r border-slate-800 overflow-y-auto p-4 space-y-3">
        <input className="form-input" placeholder="Search series" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {seriesCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        {filtered.map((item) => (
          <button key={item.id} className={`w-full text-left p-3 rounded-md hover:bg-slate-900 ${selected?.id === item.id ? 'bg-slate-900' : ''}`} onClick={() => setSelected(item)}>
            <div className="font-medium text-white">{item.title}</div>
            <div className="text-xs text-slate-400">{item.releaseYear ?? ''}</div>
          </button>
        ))}
      </aside>
      <section className="overflow-y-auto p-5">
        {selected ? (
          <div className="space-y-5">
            <div className="flex gap-5">
              <img src={selected.posterUrl || ''} alt="" className="w-40 aspect-[2/3] object-cover rounded-lg bg-slate-800" />
              <div>
                <h1 className="text-2xl font-semibold text-white">{selected.title}</h1>
                <p className="text-slate-400 mt-2 max-w-2xl">{selected.plot}</p>
                <button className="mt-4 icon-button" title="Favourite series" onClick={() => toggleFavourite({ kind: 'series', itemId: selected.id, createdAt: new Date().toISOString() })}><Heart className={`h-5 w-5 ${favouriteIds.has(selected.id) ? 'fill-cyan-300 text-cyan-300' : ''}`} /></button>
              </div>
            </div>
            <div className="space-y-2">
              {selectedEpisodes.map((episode) => {
                const saved = progress.find((item) => item.kind === 'episode' && item.itemId === episode.id);
                return (
                  <div key={episode.id} className="h-14 rounded-md bg-slate-900 border border-slate-800 px-3 flex items-center gap-3">
                    <button className="icon-button" title="Play episode" onClick={() => openPlayer({ kind: 'episode', itemId: episode.id, title: `${selected.title} - ${episode.title}`, streamUrl: episode.streamUrl })}><Play className="h-4 w-4" /></button>
                    <div className="flex-1">
                      <div className="text-white">S{episode.seasonNumber} E{episode.episodeNumber}: {episode.title}</div>
                      {saved && <div className="text-xs text-slate-400">Resume at {Math.floor(saved.positionSeconds / 60)}m</div>}
                    </div>
                    <button className="icon-button" title="Favourite episode" onClick={() => toggleFavourite({ kind: 'episode', itemId: episode.id, createdAt: new Date().toISOString() })}><Heart className="h-4 w-4" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : <div className="text-slate-500">Select a series</div>}
      </section>
    </div>
  );
};

export default Series;
