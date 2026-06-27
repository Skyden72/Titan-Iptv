import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import Player from './Player';

const AppLayout: React.FC = () => {
  const refreshProgress = useAppStore((state) => state.refreshProgress);
  const currentRequest = usePlayerStore((state) => state.currentRequest);
  const fullscreen = usePlayerStore((state) => state.state.fullscreen);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-slate-950">
      <TopNav />
      {refreshProgress && refreshProgress.phase !== 'complete' && (
        <div className="h-8 bg-cyan-950 text-cyan-100 px-4 flex items-center text-sm">
          {refreshProgress.message}
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
      {fullscreen && currentRequest && (
        <div className="fixed inset-0 z-[100] bg-black">
          <Player request={currentRequest} />
        </div>
      )}
    </div>
  );
};

export default AppLayout;
