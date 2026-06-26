import { useEffect, useState } from 'react';
import type { DiagnosticSnapshot } from '../types/app';

const Diagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticSnapshot | null>(null);

  useEffect(() => {
    window.titon.getDiagnostics().then(setDiagnostics);
  }, []);

  if (!diagnostics) return <div className="p-5 text-slate-500">Loading diagnostics</div>;

  return (
    <div className="h-full overflow-y-auto p-5 max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold text-white">Diagnostics</h1>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4 grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-slate-500">App</span><div>{diagnostics.appVersion}</div></div>
        <div><span className="text-slate-500">Electron</span><div>{diagnostics.electronVersion}</div></div>
        <div><span className="text-slate-500">Platform</span><div>{diagnostics.platform}</div></div>
        <div><span className="text-slate-500">mpv</span><div>{diagnostics.mpvAvailable ? diagnostics.mpvPath : 'Not found'}</div></div>
        <div className="col-span-2"><span className="text-slate-500">Database</span><div className="break-all">{diagnostics.databasePath}</div></div>
      </section>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4">
        <h2 className="font-medium text-white">Catalog</h2>
        <pre className="mt-2 text-sm text-slate-300">{JSON.stringify(diagnostics.catalogCounts, null, 2)}</pre>
      </section>
      <section className="rounded-md bg-slate-900 border border-slate-800 p-4">
        <h2 className="font-medium text-white">Recent Errors</h2>
        {diagnostics.recentErrors.length === 0 ? <p className="text-sm text-slate-500">No recent errors</p> : diagnostics.recentErrors.map((error) => <p key={error} className="text-sm text-red-200">{error}</p>)}
      </section>
    </div>
  );
};

export default Diagnostics;
