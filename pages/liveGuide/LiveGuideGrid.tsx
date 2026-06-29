import { Play } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { EpgProgramme, LiveChannel } from '../../types/app';
import { formatGuideDate, formatGuideTime, getProgrammeBlock, type GuideWindow } from './timeWindow';

type LiveGuideGridProps = {
  channels: LiveChannel[];
  programmesByChannel: Map<string, EpgProgramme[]>;
  selectedChannelId?: string;
  playingChannelId?: string;
  activeProgrammeId?: string;
  guideWindow: GuideWindow;
  rowHeight: number;
  scrollTop: number;
  viewportHeight: number;
  onScrollTopChange: (value: number) => void;
  onTuneChannel: (channel: LiveChannel) => void;
  onProgrammeClick: (channel: LiveChannel, programme: EpgProgramme) => void;
};

const overscanRows = 5;
const channelRailWidth = 330;

const LiveGuideGrid: React.FC<LiveGuideGridProps> = ({
  channels,
  programmesByChannel,
  selectedChannelId,
  playingChannelId,
  activeProgrammeId,
  guideWindow,
  rowHeight,
  scrollTop,
  viewportHeight,
  onScrollTopChange,
  onTuneChannel,
  onProgrammeClick,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const visibleCount = Math.ceil((viewportHeight || 520) / rowHeight) + overscanRows * 2;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanRows);
  const endIndex = Math.min(channels.length, startIndex + visibleCount);
  const visibleChannels = channels.slice(startIndex, endIndex);
  const nowLeft = ((guideWindow.now.getTime() - guideWindow.start.getTime()) / guideWindow.durationMs) * 100;

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || scrollContainer.scrollTop === scrollTop) {
      return;
    }

    scrollContainer.scrollTop = scrollTop;
  }, [scrollTop]);

  return (
    <section className="min-h-0 overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      <div className="grid border-b border-slate-800 bg-slate-900/95" style={{ gridTemplateColumns: `${channelRailWidth}px minmax(0, 1fr)` }}>
        <div className="px-4 py-3 text-sm font-semibold text-cyan-200">
          {formatGuideDate(guideWindow.now)}, {formatGuideTime(guideWindow.now)}
        </div>
        <div className="relative grid py-3 text-sm font-semibold text-slate-200" style={{ gridTemplateColumns: `repeat(${guideWindow.ticks.length - 1}, minmax(0, 1fr))` }}>
          {guideWindow.ticks.slice(0, -1).map((tick) => (
            <div key={tick.toISOString()}>{formatGuideTime(tick)}</div>
          ))}
        </div>
      </div>

      <div ref={scrollContainerRef} className="relative h-full overflow-y-auto" onScroll={(event) => onScrollTopChange(event.currentTarget.scrollTop)}>
        <div className="relative" style={{ height: channels.length * rowHeight }}>
          <div className="absolute inset-x-0 top-0" style={{ transform: `translateY(${startIndex * rowHeight}px)` }}>
            {visibleChannels.map((channel, offset) => {
              const rowIndex = startIndex + offset + 1;
              const programmes = programmesByChannel.get(channel.id) ?? [];
              const isPlayingChannel = channel.id === playingChannelId;
              const isSelectedChannel = channel.id === selectedChannelId;
              const channelInitial = channel.name.trim().charAt(0).toUpperCase() || '?';

              return (
                <div
                  key={channel.id}
                  className={`grid border-b border-slate-900/90 ${isSelectedChannel ? 'bg-cyan-950/20' : 'bg-slate-950'}`}
                  style={{ gridTemplateColumns: `${channelRailWidth}px minmax(0, 1fr)`, height: rowHeight }}
                >
                  <button
                    type="button"
                    className="flex min-w-0 items-center gap-3 px-3 text-left hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    aria-current={isPlayingChannel ? 'true' : undefined}
                    aria-label={`Tune to ${channel.name}`}
                    onClick={() => onTuneChannel(channel)}
                  >
                    <span className={`w-7 text-center text-sm font-semibold ${isPlayingChannel ? 'text-cyan-300' : 'text-slate-400'}`}>{rowIndex}</span>
                    {channel.logoUrl ? (
                      <img src={channel.logoUrl} alt="" loading="lazy" className="h-9 w-9 rounded bg-slate-800 object-cover" />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 items-center justify-center rounded bg-slate-800 text-sm font-semibold text-slate-300"
                      >
                        {channelInitial}
                      </span>
                    )}
                    <span className={`min-w-0 flex-1 truncate font-semibold ${isPlayingChannel ? 'text-cyan-200' : 'text-slate-100'}`}>{channel.name}</span>
                    {isPlayingChannel && <Play className="h-4 w-4 fill-cyan-300 text-cyan-300" />}
                  </button>

                  <div className="relative overflow-hidden">
                    {isPlayingChannel && <div className="absolute inset-y-1 left-0 right-0 rounded bg-cyan-500/5 ring-1 ring-inset ring-cyan-400/30" />}
                    {nowLeft >= 0 && nowLeft <= 100 && (
                      <div className="pointer-events-none absolute top-0 bottom-0 z-10 w-px bg-cyan-300" style={{ left: `${nowLeft}%` }}>
                        <span className="absolute -top-1 -left-1.5 h-3 w-3 rounded-full bg-cyan-300" />
                      </div>
                    )}
                    {programmes.map((programme) => {
                      const block = getProgrammeBlock(programme, guideWindow);
                      if (!block) return null;
                      const active = programme.id === activeProgrammeId && isPlayingChannel;

                      return (
                        <button
                          key={programme.id}
                          type="button"
                          className={`absolute top-1 bottom-1 min-w-16 overflow-hidden rounded-md border px-3 text-left text-sm font-semibold transition hover:border-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                            active ? 'border-white bg-white text-slate-950 shadow-lg' : 'border-slate-700 bg-slate-800/80 text-slate-100'
                          }`}
                          aria-label={`${programme.title}, ${formatGuideTime(programme.startAt)} to ${formatGuideTime(programme.endAt)} on ${channel.name}`}
                          aria-pressed={active}
                          style={{ left: `${block.leftPercent}%`, width: `${block.widthPercent}%` }}
                          onClick={() => onProgrammeClick(channel, programme)}
                          title={programme.title}
                        >
                          <span className="block truncate">{programme.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveGuideGrid;
