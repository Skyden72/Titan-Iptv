import { useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const Epg: React.FC = () => {
  const { liveChannels, epg } = useAppStore((state) => state);
  const [channelId, setChannelId] = useState(liveChannels[0]?.id ?? '');
  const programmes = useMemo(() => epg.filter((programme) => programme.channelId === channelId), [epg, channelId]);

  return (
    <div className="h-full grid grid-cols-[20rem_1fr]">
      <aside className="border-r border-slate-800 overflow-y-auto">
        {liveChannels.map((channel) => <button key={channel.id} className={`w-full text-left p-3 hover:bg-slate-900 ${channel.id === channelId ? 'bg-slate-900' : ''}`} onClick={() => setChannelId(channel.id)}>{channel.name}</button>)}
      </aside>
      <section className="overflow-y-auto p-5">
        <h1 className="text-xl font-semibold text-white mb-4">Programme Guide</h1>
        <div className="space-y-2">
          {programmes.map((programme) => (
            <article key={programme.id} className="rounded-md bg-slate-900 border border-slate-800 p-3">
              <div className="text-sm text-cyan-200">{new Date(programme.startAt).toLocaleString()} - {new Date(programme.endAt).toLocaleTimeString()}</div>
              <div className="font-medium text-white">{programme.title}</div>
              {programme.description && <p className="text-sm text-slate-400">{programme.description}</p>}
            </article>
          ))}
          {programmes.length === 0 && <p className="text-slate-500">No EPG data available for this channel.</p>}
        </div>
      </section>
    </div>
  );
};

export default Epg;
