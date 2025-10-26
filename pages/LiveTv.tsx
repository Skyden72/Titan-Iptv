import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Channel } from '../types';
import Player from '../components/Player';
import { DISABLE_EPG } from '../lib/env';
import { useRenderCounter } from '../lib/loopShield';

const LiveTv: React.FC = () => {
  useRenderCounter('LiveTv');
  
  const channels = useAppStore((state) => state.channels);
  const epgData = useAppStore((state) => state.epgData);

  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const initSelected = useRef(false);
  useEffect(() => {
    // This guarded effect runs only once to select the first channel when the list loads,
    // preventing the re-render loop caused by the previous implementation.
    if (initSelected.current) return;
    if (!selectedChannel && channels.length > 0) {
      initSelected.current = true;
      setSelectedChannel(channels[0]);
    }
  }, [channels, selectedChannel]);

  const channelGroups = useMemo(() => {
    const filteredChannels = channels.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const groups: Record<string, Channel[]> = {};
    for (const channel of filteredChannels) {
      const group = channel.group || 'General';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(channel);
    }
    return groups;
  }, [channels, searchQuery]);

  return (
    <div className="h-full flex flex-col md:flex-row bg-gray-900">
      <aside className="w-full md:w-72 lg:w-80 bg-gray-800/50 flex-shrink-0 flex flex-col">
        <div className="p-4">
          <input
            type="text"
            placeholder="Search channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-brand-cyan focus:outline-none transition-all text-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(channelGroups).map(([group, channelsInGroup]) => (
            <div key={group}>
              <h3 className="text-sm font-semibold text-gray-400 uppercase p-4 sticky top-0 bg-gray-800/80 backdrop-blur-sm">{group}</h3>
              <ul>
                {channelsInGroup.map((channel) => (
                  <li key={channel.id}>
                    <button
                      onClick={() => setSelectedChannel(channel)}
                      className={`w-full text-left flex items-center gap-x-3 p-3 transition-colors duration-150 ${
                        selectedChannel?.id === channel.id
                          ? 'bg-brand-cyan/20 text-white border-l-4 border-brand-cyan'
                          : 'text-gray-300 hover:bg-gray-700/50'
                      }`}
                    >
                      <img src={channel.logo} alt={channel.name} className="w-10 h-10 rounded-md object-cover bg-gray-700" />
                      <span className="font-medium">{channel.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex-1 bg-black">
        {selectedChannel ? (
          <div className="w-full h-full flex flex-col">
            <div className="flex-1">
                <Player streamUrl={selectedChannel.streamUrl} title={selectedChannel.name} />
            </div>
            <div className="p-4 bg-gray-800/80 h-32 overflow-y-auto">
              <h3 className="text-lg font-bold text-white mb-2">EPG: {selectedChannel.name}</h3>
              {DISABLE_EPG ? (
                  <p className="text-yellow-500">EPG is disabled via environment config.</p>
              ) : epgData[selectedChannel.id] ? (
                <ul className="space-y-1">
                  {epgData[selectedChannel.id].map(entry => (
                    <li key={entry.start} className="text-gray-400 text-sm">
                      <span className="font-semibold text-gray-200">{entry.start} - {entry.end}</span>: {entry.title}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">No EPG data available.</p>}
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            <p>Select a channel to start watching</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default LiveTv;