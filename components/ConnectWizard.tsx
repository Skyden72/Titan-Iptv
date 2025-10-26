import React, { useState, FormEvent, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { ConnectionDetails, ConnectionType } from '../types';
import Loader from './Loader';
import { TvIcon } from './icons';

const ConnectWizard: React.FC = () => {
  const { connect, isLoading, error, isConnected } = useAppStore((state) => ({
    connect: state.connect,
    isLoading: state.isLoading,
    error: state.error,
    isConnected: state.isConnected,
  }));
  
  const navigate = useNavigate();
  const didNavigate = useRef(false);

  // After a successful connection, navigate away from the connect screen.
  // This effect runs only once thanks to the ref guard.
  useEffect(() => {
    if (isConnected && !didNavigate.current) {
      didNavigate.current = true;
      navigate('/live-tv', { replace: true });
    }
  }, [isConnected, navigate]);


  const [connectionType, setConnectionType] = useState<ConnectionType>('xtream');
  
  // Shared state
  const [name, setName] = useState('');
  
  // Xtream state
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // M3U state
  const [m3uUrl, setM3uUrl] = useState('');
  const [epgUrl, setEpgUrl] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    let details: ConnectionDetails;
    if (connectionType === 'xtream') {
      details = { type: 'xtream', name, serverUrl, username, password };
    } else {
      details = { type: 'm3u', name, m3uUrl, epgUrl };
    }
    
    connect(details);
  };
  
  const renderXtreamForm = () => (
    <>
      <div className="mb-4">
        <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-300 mb-1">Server URL</label>
        <input type="text" id="serverUrl" value={serverUrl} onChange={e => setServerUrl(e.target.value)} className="form-input" placeholder="http://server.com:8080" required />
      </div>
      <div className="mb-4">
        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1">Username</label>
        <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="form-input" required />
      </div>
      <div className="mb-4">
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Password</label>
        <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required />
      </div>
    </>
  );

  const renderM3uForm = () => (
    <>
      <div className="mb-4">
        <label htmlFor="m3uUrl" className="block text-sm font-medium text-gray-300 mb-1">M3U Playlist URL</label>
        <input type="text" id="m3uUrl" value={m3uUrl} onChange={e => setM3uUrl(e.target.value)} className="form-input" placeholder="http://server.com/playlist.m3u" required />
      </div>
      <div className="mb-4">
        <label htmlFor="epgUrl" className="block text-sm font-medium text-gray-300 mb-1">EPG URL (Optional)</label>
        <input type="text" id="epgUrl" value={epgUrl} onChange={e => setEpgUrl(e.target.value)} className="form-input" placeholder="http://server.com/epg.xml" />
      </div>
    </>
  );

  return (
    <div className="w-full max-w-md bg-gray-800/50 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700">
      <div className="px-8 py-6">
        <div className="text-center mb-6">
          <div className="flex justify-center items-center gap-x-2 mb-2">
            <TvIcon className="h-8 w-8 text-brand-cyan" />
            <h1 className="text-2xl font-bold text-white">Zenith Player</h1>
          </div>
          <p className="text-gray-400">Connect to your IPTV service</p>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-700/50 rounded-lg mb-6">
          <button onClick={() => setConnectionType('xtream')} className={`wizard-tab ${connectionType === 'xtream' ? 'wizard-tab-active' : ''}`}>Xtream</button>
          <button onClick={() => setConnectionType('m3u')} className={`wizard-tab ${connectionType === 'm3u' ? 'wizard-tab-active' : ''}`}>M3U Playlist</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Connection Name</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="form-input" placeholder="My IPTV Service" required />
          </div>

          {connectionType === 'xtream' ? renderXtreamForm() : renderM3uForm()}
          
          {error && <p className="text-red-400 text-sm my-4 text-center">{error}</p>}
          
          <button type="submit" disabled={isLoading} className="w-full bg-brand-cyan hover:bg-brand-cyan/80 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center">
            {isLoading ? <Loader /> : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ConnectWizard;