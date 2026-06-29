import { Heart } from 'lucide-react';
import type { EpgProgramme, LiveChannel } from '../../types/app';
import { formatGuideTime, getProgrammeProgress } from './timeWindow';

type LiveNowPanelProps = {
  channel: LiveChannel | null;
  programme?: EpgProgramme;
  isFavourite: boolean;
  now: Date;
  onToggleFavourite: () => void;
};

const LiveNowPanel: React.FC<LiveNowPanelProps> = ({ channel, programme, isFavourite, now, onToggleFavourite }) => {
  const progress = programme ? getProgrammeProgress(programme, now) : null;

  return (
    <section className="min-w-0 rounded-md border border-slate-800 bg-slate-900/85 p-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-2xl font-semibold">{programme?.title ?? channel?.name ?? 'Choose a channel'}</h2>
          {programme ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <span>
                {formatGuideTime(programme.startAt)} - {formatGuideTime(programme.endAt)}
              </span>
              <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-700">
                <span className="block h-full rounded-full bg-cyan-300" style={{ width: `${progress?.percent ?? 0}%` }} />
              </span>
              <span>{progress?.remainingMinutes ?? 0} min</span>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">{channel ? 'No current programme available.' : 'Select a channel to start browsing.'}</p>
          )}
        </div>
        <button
          type="button"
          className="icon-button shrink-0"
          aria-label={isFavourite ? 'Remove favourite' : 'Add favourite'}
          aria-pressed={isFavourite}
          title={isFavourite ? 'Remove favourite' : 'Add favourite'}
          onClick={onToggleFavourite}
          disabled={!channel}
        >
          <Heart className={`h-5 w-5 ${isFavourite ? 'fill-cyan-300 text-cyan-300' : 'text-slate-400'}`} />
        </button>
      </div>
      {programme?.description && <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-300">{programme.description}</p>}
      {channel && <p className="mt-5 text-right text-sm font-semibold text-slate-200">{channel.name}</p>}
    </section>
  );
};

export default LiveNowPanel;
