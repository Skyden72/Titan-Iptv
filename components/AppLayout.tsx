import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';
import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/playerStore';
import Player from './Player';

const AppLayout: React.FC = () => {
  const refreshProgress = useAppStore((state) => state.refreshProgress);
  const currentRequest = usePlayerStore((state) => state.currentRequest);

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <TopNav />
      {refreshProgress && refreshProgress.phase !== 'complete' && (
        <div className="h-8 bg-cyan-950 text-cyan-100 px-4 flex items-center text-sm">
          {refreshProgress.message}
        </div>
      )}
      <main className="flex-1 min-h-0 overflow-hidden">
        <Outlet />
      </main>
      {currentRequest && (
        <div className="fixed inset-x-6 bottom-6 top-24 z-50 overflow-hidden rounded-md border border-slate-700 bg-black shadow-2xl">
          <Player request={currentRequest} />
        </div>
      )}
    </div>
  );
};

export default AppLayout;
