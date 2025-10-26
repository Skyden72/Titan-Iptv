
import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { TvIcon, FilmIcon, VideoCameraIcon, ArrowLeftOnRectangleIcon } from './icons';

const TopNav: React.FC = () => {
  const disconnect = useAppStore((state) => state.disconnect);
  const navigate = useNavigate();

  const handleDisconnect = () => {
    disconnect();
    navigate('/connect');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-x-3 px-4 py-3 text-sm font-semibold rounded-md transition-colors duration-200 ${
      isActive
        ? 'bg-gray-800 text-white'
        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
    }`;

  return (
    <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-700/50 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center gap-x-8">
          <div className="flex items-center gap-x-2 text-xl font-bold text-white">
            <TvIcon className="h-7 w-7 text-brand-cyan" />
            <span className="hidden sm:inline">Zenith Player</span>
          </div>
          <nav className="flex items-center gap-x-2">
            <NavLink to="/live-tv" className={navLinkClass}>
              <VideoCameraIcon className="h-5 w-5" />
              <span className="hidden md:inline">Live TV</span>
            </NavLink>
            <NavLink to="/movies" className={navLinkClass}>
              <FilmIcon className="h-5 w-5" />
              <span className="hidden md:inline">Movies</span>
            </NavLink>
            <NavLink to="/series" className={navLinkClass}>
              <TvIcon className="h-5 w-5" />
              <span className="hidden md:inline">Series</span>
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center">
          <button
            onClick={handleDisconnect}
            className="flex items-center gap-x-2 px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 rounded-md hover:bg-red-600/80 hover:text-white transition-colors duration-200"
            title="Disconnect"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Disconnect</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopNav;
