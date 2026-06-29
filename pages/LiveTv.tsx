import { Heart, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import Player from '../components/Player';
import { usePlayerStore } from '../store/playerStore';
import { useAppStore } from '../store/useAppStore';
import type { EpgProgramme, LiveChannel } from '../types/app';
import LiveGuideGrid from './liveGuide/LiveGuideGrid';
import LiveNowPanel from './liveGuide/LiveNowPanel';
import { buildGuideWindow, findCurrentProgramme } from './liveGuide/timeWindow';

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
  const [guideScrollTop, setGuideScrollTop] = useState(0);
  const [guideHeight, setGuideHeight] = useState(0);
  const [guideNow, setGuideNow] = useState(() => new Date());
  const guideRef = useRef<HTMLDivElement | null>(null);
  const guideWindow = useMemo(() => buildGuideWindow(guideNow), [guideNow]);
  const programmesByChannel = useMemo(() => {
    const index = new Map<string, EpgProgramme[]>();
    for (const programme of epg) {
      const items = index.get(programme.channelId) ?? [];
      items.push(programme);
      index.set(programme.channelId, items);
    }
    for (const items of index.values()) {
      items.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }
    return index;
  }, [epg]);

  const filtered = useMemo(() => liveChannels.filter((channel) =>
    (categoryId === 'all' || (categoryId === 'favourites' ? favouriteIds.has(channel.id) : channel.categoryId === categoryId)) &&
    channel.name.toLowerCase().includes(query.toLowerCase())
  ), [liveChannels, categoryId, favouriteIds, query]);

  const visibleCount = Math.ceil((listHeight || 640) / channelRowHeight) + overscanRows * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / channelRowHeight) - overscanRows);
  const endIndex = Math.min(filtered.length, startIndex + visibleCount);
  const visibleChannels = filtered.slice(startIndex, endIndex);
  const selectedSchedule = useMemo(() => selected ? programmesByChannel.get(selected.id) ?? [] : [], [programmesByChannel, selected]);
  const currentProgramme = findCurrentProgramme(selectedSchedule, guideWindow.now);

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
    const timer = window.setInterval(() => setGuideNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const guide = guideRef.current;
    if (!guide) return;

    const updateHeight = () => setGuideHeight(guide.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(guide);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setScrollTop(0);
    setGuideScrollTop(0);
    listRef.current?.scrollTo({ top: 0 });
  }, [categoryId, query]);

  function play(channel: LiveChannel) {
    setSelected(channel);
    openPlayer({ kind: 'live', itemId: channel.id, title: channel.name, streamUrl: channel.streamUrl, playlistItemIds: filtered.map((item) => item.id) });
  }

  function handleProgrammeClick(channel: LiveChannel, programme: EpgProgramme) {
    const isActive = currentRequest?.kind === 'live' && currentRequest.itemId === channel.id && currentProgramme?.id === programme.id;
    if (isActive) {
      void window.titon.setWindowFullscreen(true).then((fullscreen) => {
        usePlayerStore.setState((current) => ({ state: { ...current.state, fullscreen } }));
      });
      return;
    }
    play(channel);
  }

  function toggleSelectedFavourite() {
    if (!selected) return;
    void toggleFavourite({ kind: 'live', itemId: selected.id, createdAt: new Date().toISOString() });
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
        <div className="grid min-h-[18rem] grid-cols-[minmax(24rem,42rem)_minmax(0,1fr)] gap-4">
          <div className="overflow-hidden rounded-md border border-slate-800 bg-black">
            <div className="aspect-video h-full max-h-[34vh] min-h-[18rem]">
              {fullscreen ? <div className="h-full w-full bg-black" /> : <Player request={currentRequest} compact />}
            </div>
          </div>
          <LiveNowPanel
            channel={selected}
            programme={currentProgramme}
            isFavourite={Boolean(selected && favouriteIds.has(selected.id))}
            now={guideWindow.now}
            onToggleFavourite={toggleSelectedFavourite}
          />
        </div>

        <div ref={guideRef} className="min-h-0 flex-1">
          <LiveGuideGrid
            channels={filtered}
            programmesByChannel={programmesByChannel}
            selectedChannelId={selected?.id}
            playingChannelId={currentRequest?.kind === 'live' ? currentRequest.itemId : undefined}
            activeProgrammeId={currentProgramme?.id}
            guideWindow={guideWindow}
            rowHeight={70}
            scrollTop={guideScrollTop}
            viewportHeight={guideHeight}
            onScrollTopChange={setGuideScrollTop}
            onTuneChannel={play}
            onProgrammeClick={handleProgrammeClick}
          />
        </div>
      </section>
    </div>
  );
};

export default LiveTv;
