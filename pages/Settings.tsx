import { useEffect, useState } from 'react';
import type { AppSettings } from '../types/app';

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    window.titon.getSettings().then(setSettings);
  }, []);

  if (!settings) return <div className="p-5 text-slate-500">Loading settings</div>;

  async function save(next: AppSettings) {
    setSettings(next);
    await window.titon.saveSettings(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="h-full overflow-y-auto p-5 max-w-3xl space-y-5">
      <h1 className="text-xl font-semibold text-white">Settings</h1>
      <label className="flex items-center justify-between rounded-md bg-slate-900 border border-slate-800 p-4">
        <span>
          <span className="block text-white">Hardware acceleration</span>
          <span className="text-sm text-slate-400">mpv uses safe automatic hardware decoding to preserve 2160p-capable playback when supported.</span>
        </span>
        <input type="checkbox" checked={settings.hardwareAcceleration} onChange={(event) => save({ ...settings, hardwareAcceleration: event.target.checked })} />
      </label>
      <label className="flex items-center justify-between rounded-md bg-slate-900 border border-slate-800 p-4">
        <span>
          <span className="block text-white">Subtitles enabled</span>
          <span className="text-sm text-slate-400">Subtitle tracks remain selectable in the player when the stream exposes them.</span>
        </span>
        <input type="checkbox" checked={settings.subtitlesEnabled} onChange={(event) => save({ ...settings, subtitlesEnabled: event.target.checked })} />
      </label>
      <label className="block rounded-md bg-slate-900 border border-slate-800 p-4">
        <span className="block text-white">Cache refresh window</span>
        <input className="form-input mt-2 max-w-40" type="number" min={1} max={168} value={settings.cacheTtlHours} onChange={(event) => save({ ...settings, cacheTtlHours: Number(event.target.value) })} />
      </label>
      <label className="block rounded-md bg-slate-900 border border-slate-800 p-4">
        <span className="block text-white">mpv path</span>
        <input className="form-input mt-2" value={settings.mpvPath ?? ''} onChange={(event) => setSettings({ ...settings, mpvPath: event.target.value || undefined })} onBlur={() => save(settings)} />
      </label>
      {saved && <p className="text-sm text-cyan-200">Settings saved</p>}
    </div>
  );
};

export default Settings;
