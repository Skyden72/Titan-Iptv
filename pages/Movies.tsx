import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';

const Movies: React.FC = () => {
  const { movies, movieCategories, favourites, toggleFavourite, progress } = useAppStore((state) => state);
  const start = usePlayerStore((state) => state.start);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'movie').map((item) => item.itemId));
  const filtered = useMemo(() => movies.filter((movie) => (categoryId === 'all' || movie.categoryId === categoryId) && movie.title.toLowerCase().includes(query.toLowerCase())), [movies, categoryId, query]);

  return (
    <div className="h-full overflow-y-auto p-5 space-y-4">
      <div className="flex gap-3">
        <input className="form-input max-w-md" placeholder="Search movies" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className="form-input max-w-xs" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">All categories</option>
          {movieCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-7 gap-4">
        {filtered.map((movie) => {
          const saved = progress.find((item) => item.kind === 'movie' && item.itemId === movie.id);
          return (
            <article key={movie.id} className="bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
              <img src={movie.posterUrl || ''} alt="" className="aspect-[2/3] w-full object-cover bg-slate-800" />
              <div className="p-3 space-y-2">
                <h2 className="font-medium text-white line-clamp-2">{movie.title}</h2>
                <p className="text-xs text-slate-400">{movie.releaseYear ?? 'Unknown year'} {saved ? `· Resume ${Math.floor(saved.positionSeconds / 60)}m` : ''}</p>
                <div className="flex gap-2">
                  <button className="icon-button" title="Play" onClick={() => start({ kind: 'movie', itemId: movie.id, title: movie.title, streamUrl: movie.streamUrl })}><Play className="h-4 w-4" /></button>
                  <button className="icon-button" title="Favourite" onClick={() => toggleFavourite({ kind: 'movie', itemId: movie.id, createdAt: new Date().toISOString() })}><Heart className={`h-4 w-4 ${favouriteIds.has(movie.id) ? 'fill-cyan-300 text-cyan-300' : ''}`} /></button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
};

export default Movies;
