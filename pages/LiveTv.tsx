import { Heart, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import type { LiveChannel } from '../types/app';

const LiveTv: React.FC = () => {
  const { liveChannels, liveCategories, epg, favourites, toggleFavourite } = useAppStore((state) => state);
  const openPlayer = usePlayerStore((state) => state.open);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [selected, setSelected] = useState<LiveChannel | null>(liveChannels[0] ?? null);

  const filtered = useMemo(() => liveChannels.filter((channel) =>
    (categoryId === 'all' || channel.categoryId === categoryId) &&
    channel.name.toLowerCase().includes(query.toLowerCase())
  ), [liveChannels, categoryId, query]);

  const schedule = selected ? epg.filter((programme) => programme.channelId === selected.id).slice(0, 12) : [];
  const favouriteIds = new Set(favourites.filter((item) => item.kind === 'live').map((item) => item.itemId));

  function play(channel: LiveChannel) {
    setSelected(channel);
    openPlayer({ kind: 'live', itemId: channel.id, title: channel.name, streamUrl: channel.streamUrl, playlistItemIds: filtered.map((item) => item.id) });
  }

  return (
    <div className="h-full grid grid-cols-[22rem_1fr] bg-slate-950">
      <aside className="min-h-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 space-y-3">
          <input className="form-input" placeholder="Search channels" value={query} onChange={(event) => setQuery(event.target.value)} />
          <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="all">All categories</option>
            {liveCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((channel) => (
            <button key={channel.id} className={`w-full p-3 flex items-center gap-3 text-left hover:bg-slate-900 ${selected?.id === channel.id ? 'bg-slate-900 border-l-2 border-cyan-400' : ''}`} onClick={() => setSelected(channel)}>
              <img src={channel.logoUrl || ''} alt="" className="h-10 w-10 rounded bg-slate-800 object-cover" />
              <span className="flex-1 truncate">{channel.name}</span>
              <Play className="h-4 w-4 text-cyan-300" onClick={(event) => { event.stopPropagation(); play(channel); }} />
              <Heart className={`h-4 w-4 ${favouriteIds.has(channel.id) ? 'fill-cyan-300 text-cyan-300' : 'text-slate-500'}`} onClick={(event) => { event.stopPropagation(); toggleFavourite({ kind: 'live', itemId: channel.id, createdAt: new Date().toISOString() }); }} />
            </button>
          ))}
        </div>
      </aside>
      <section className="min-h-0 bg-slate-950">
        <div className="h-full bg-slate-900/80 p-4 overflow-y-auto">
          <h2 className="font-semibold text-white">{selected?.name ?? 'No channel selected'}</h2>
          <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
            {schedule.map((programme) => <div key={programme.id} className="text-sm text-slate-300"><span className="text-slate-500">{new Date(programme.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {programme.title}</div>)}
            {selected && schedule.length === 0 && <p className="text-sm text-slate-500">No EPG data available for this channel.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveTv;
