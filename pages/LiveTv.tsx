import { Heart, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import type { LiveChannel } from '../types/app';
import Player from '../components/Player';

const channelRowHeight = 64;
const overscanRows = 8;

const LiveTv: React.FC = () => {
  const { liveChannels, liveCategories, epg, favourites, toggleFavourite } = useAppStore((state) => state);
  const openPlayer = usePlayerStore((state) => state.open);
  const currentRequest = usePlayerStore((state) => state.currentRequest);
  const fullscreen = usePlayerStore((state) => state.state.fullscreen);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [selected, setSelected] = useState<LiveChannel | null>(liveChannels[0] ?? null);
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const favouriteIds = useMemo(() => new Set(favourites.filter((item) => item.kind === 'live').map((item) => item.itemId)), [favourites]);

  const filtered = useMemo(() => liveChannels.filter((channel) =>
    (categoryId === 'all' || (categoryId === 'favourites' ? favouriteIds.has(channel.id) : channel.categoryId === categoryId)) &&
    channel.name.toLowerCase().includes(query.toLowerCase())
  ), [liveChannels, categoryId, favouriteIds, query]);

  const visibleCount = Math.ceil((listHeight || 640) / channelRowHeight) + overscanRows * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / channelRowHeight) - overscanRows);
  const endIndex = Math.min(filtered.length, startIndex + visibleCount);
  const visibleChannels = filtered.slice(startIndex, endIndex);
  const schedule = useMemo(() => selected ? epg.filter((programme) => programme.channelId === selected.id) : [], [epg, selected]);
  const now = Date.now();
  const currentProgramme = schedule.find((programme) => new Date(programme.startAt).getTime() <= now && new Date(programme.endAt).getTime() > now);
  const guideProgrammes = schedule.filter((programme) => new Date(programme.endAt).getTime() > now).slice(0, 12);
  const upcomingProgrammes = guideProgrammes.filter((programme) => programme.id !== currentProgramme?.id).slice(0, 5);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    const updateHeight = () => setListHeight(list.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(list);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrollTop(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [categoryId, query]);

  function play(channel: LiveChannel) {
    setSelected(channel);
    openPlayer({ kind: 'live', itemId: channel.id, title: channel.name, streamUrl: channel.streamUrl, playlistItemIds: filtered.map((item) => item.id) });
  }

  return (
    <div className="h-full grid grid-cols-[24rem_minmax(0,1fr)] bg-slate-950">
      <aside className="min-h-0 border-r border-slate-800 flex flex-col">
        <div className="p-4 space-y-3">
          <input className="form-input" placeholder="Search channels" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className={`w-full h-11 rounded-md border px-3 flex items-center justify-between text-left ${categoryId === 'favourites' ? 'border-cyan-400 bg-cyan-950/50 text-white' : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'}`} onClick={() => setCategoryId(categoryId === 'favourites' ? 'all' : 'favourites')}>
            <span className="flex items-center gap-2"><Heart className="h-4 w-4 text-cyan-300" /> Favourites</span>
            <span className="text-xs text-slate-400">{favouriteIds.size}</span>
          </button>
          <select className="form-input" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="favourites">Favourites</option>
            <option value="all">All categories</option>
            {liveCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </div>
        <div ref={listRef} className="flex-1 overflow-y-auto" onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}>
          <div className="relative" style={{ height: filtered.length * channelRowHeight }}>
            <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${startIndex * channelRowHeight}px)` }}>
              {visibleChannels.map((channel) => (
                <button key={channel.id} className={`w-full h-16 px-3 flex items-center gap-3 text-left hover:bg-slate-900 ${selected?.id === channel.id ? 'bg-slate-900 border-l-2 border-cyan-400' : ''}`} onClick={() => play(channel)}>
                  <img src={channel.logoUrl || ''} alt="" loading="lazy" className="h-10 w-10 rounded bg-slate-800 object-cover" />
                  <span className="flex-1 truncate">{channel.name}</span>
                  <Play className="h-4 w-4 text-cyan-300" onClick={(event) => { event.stopPropagation(); play(channel); }} />
                  <Heart className={`h-4 w-4 ${favouriteIds.has(channel.id) ? 'fill-cyan-300 text-cyan-300' : 'text-slate-500'}`} onClick={(event) => { event.stopPropagation(); toggleFavourite({ kind: 'live', itemId: channel.id, createdAt: new Date().toISOString() }); }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>
      <section className="min-h-0 bg-slate-950 p-4 flex flex-col gap-4 overflow-hidden">
        <div className="overflow-hidden rounded-md border border-slate-800 bg-slate-950">
          <div className="aspect-video max-h-[52vh] min-h-[18rem] bg-black">
            {fullscreen ? <div className="h-full w-full bg-black" /> : <Player request={currentRequest} />}
          </div>
          <div className="border-t border-slate-800 bg-slate-900/95 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-semibold text-white truncate">{selected?.name ?? 'No channel selected'}</h2>
                {currentProgramme ? (
                  <p className="mt-1 text-sm text-cyan-100 truncate">
                    Now: {currentProgramme.title}
                    <span className="ml-2 text-slate-400">{new Date(currentProgramme.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">{selected ? 'No current EPG programme available.' : 'Choose a channel to see EPG.'}</p>
                )}
              </div>
              {guideProgrammes.length > 0 && <div className="text-xs text-slate-500 shrink-0">{guideProgrammes.length} guide items</div>}
            </div>
            <div className="mt-3 grid grid-cols-1 xl:grid-cols-5 gap-2">
              {upcomingProgrammes.map((programme) => (
                <div key={programme.id} className="min-w-0 rounded bg-slate-950/70 border border-slate-800 px-3 py-2">
                  <div className="text-xs text-slate-500">{new Date(programme.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  <div className="text-sm text-slate-200 truncate">{programme.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-slate-800 bg-slate-900/80 p-4">
          <h2 className="font-semibold text-white">Full channel guide</h2>
          <div className="mt-2 grid grid-cols-1 xl:grid-cols-2 gap-2">
            {guideProgrammes.map((programme) => <div key={programme.id} className="text-sm text-slate-300"><span className="text-slate-500">{new Date(programme.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> {programme.title}</div>)}
            {selected && guideProgrammes.length === 0 && <p className="text-sm text-slate-500">No EPG data available for this channel.</p>}
          </div>
        </div>
      </section>
    </div>
  );
};

export default LiveTv;
