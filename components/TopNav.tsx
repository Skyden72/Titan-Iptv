
import React from 'react';
import { Heart, ListVideo, MonitorPlay, RefreshCcw, Search, Settings, Tv, Video, Wrench } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const links = [
  { to: '/live-tv', label: 'Live TV', icon: MonitorPlay },
  { to: '/movies', label: 'Movies', icon: Video },
  { to: '/series', label: 'Series', icon: Tv },
  { to: '/epg', label: 'EPG', icon: ListVideo },
  { to: '/favourites', label: 'Favourites', icon: Heart },
  { to: '/settings', label: 'Settings', icon: Settings },
  { to: '/diagnostics', label: 'Diagnostics', icon: Wrench },
];

const TopNav: React.FC = () => {
  const refresh = useAppStore((state) => state.refresh);
  const disconnect = useAppStore((state) => state.disconnect);
  const profile = useAppStore((state) => state.profile);
  const navigate = useNavigate();

  const handleDisconnect = async () => {
    await disconnect();
    navigate('/connect');
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Tv className="h-7 w-7 text-cyan-400 shrink-0" />
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">Titon IPTV</div>
          <div className="text-xs text-slate-400 truncate">{profile?.name}</div>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `h-10 px-3 rounded-md flex items-center gap-2 text-sm ${isActive ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/70'}`}>
            <Icon className="h-4 w-4" />
            <span className="hidden xl:inline">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="flex items-center gap-2">
        <button className="icon-button" title="Search" onClick={() => navigate('/live-tv')}>
          <Search className="h-4 w-4" />
        </button>
        <button className="icon-button" title="Refresh provider" onClick={() => refresh()}>
          <RefreshCcw className="h-4 w-4" />
        </button>
        <button className="text-sm text-slate-300 hover:text-white px-3 h-10 rounded-md hover:bg-slate-800" onClick={handleDisconnect}>
          Disconnect
        </button>
      </div>
    </header>
  );
};

export default TopNav;
