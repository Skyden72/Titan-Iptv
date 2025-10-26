import React from 'react';
import { useRenderCounter } from '../lib/loopShield';
import { DISABLE_PLAYER } from '../lib/env';

interface PlayerProps {
  streamUrl: string;
  title: string;
}

const Player: React.FC<PlayerProps> = ({ streamUrl, title }) => {
  useRenderCounter('Player');

  if (DISABLE_PLAYER) {
    return <div className="w-full h-full flex items-center justify-center bg-black text-white">Player is disabled via environment config.</div>
  }
  
  return (
    <div className="w-full h-full bg-black flex flex-col items-center justify-center text-white relative">
      <video
        className="w-full h-full"
        src={streamUrl}
        controls
        autoPlay
        playsInline
      >
        Your browser does not support the video tag.
      </video>
      <div className="absolute top-0 left-0 w-full p-4 bg-gradient-to-b from-black/70 to-transparent">
        <h2 className="text-xl font-bold">{title}</h2>
      </div>
    </div>
  );
};

export default Player;