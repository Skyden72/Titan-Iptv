import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tv } from 'lucide-react';
import Loader from './Loader';
import { useAppStore } from '../store/useAppStore';

const ConnectWizard: React.FC = () => {
  const navigate = useNavigate();
  const { connect, loading, error, profile, refreshProgress } = useAppStore((state) => ({
    connect: state.connect,
    loading: state.loading,
    error: state.error,
    profile: state.profile,
    refreshProgress: state.refreshProgress,
  }));
  const [name, setName] = useState('Home IPTV');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (profile) navigate('/live-tv', { replace: true });
  }, [profile, navigate]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    connect({ name, serverUrl, username, password });
  }

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
      <form onSubmit={handleSubmit} className="p-7 space-y-5">
        <div className="flex items-center gap-3">
          <Tv className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-semibold text-white">Titon IPTV Player</h1>
            <p className="text-sm text-slate-400">Connect an Xtream Codes profile</p>
          </div>
        </div>
        <label className="block">
          <span className="text-sm text-slate-300">Profile name</span>
          <input className="form-input mt-1" value={name} onChange={(event) => setName(event.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Server URL</span>
          <input className="form-input mt-1" value={serverUrl} onChange={(event) => setServerUrl(event.target.value)} placeholder="http://server.example:8080" required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Username</span>
          <input className="form-input mt-1" value={username} onChange={(event) => setUsername(event.target.value)} required />
        </label>
        <label className="block">
          <span className="text-sm text-slate-300">Password</span>
          <input className="form-input mt-1" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        {refreshProgress && <p className="text-sm text-cyan-200">{refreshProgress.message}</p>}
        {error && <p className="text-sm text-red-300">{error}</p>}
        <button className="w-full h-11 rounded-md bg-cyan-500 text-slate-950 font-semibold disabled:bg-slate-600" disabled={loading}>
          {loading ? <Loader /> : 'Connect and Refresh'}
        </button>
      </form>
    </div>
  );
};

export default ConnectWizard;
