import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAppStore } from './store/useAppStore';
import { usePlayerStore } from './store/playerStore';
import Loader from './components/Loader';

function App() {
  const boot = useAppStore((state) => state.boot);
  const booted = useAppStore((state) => state.booted);
  const attachPlayer = usePlayerStore((state) => state.attach);

  useEffect(() => {
    boot();
    return attachPlayer();
  }, [boot, attachPlayer]);

  if (!booted) {
    return <div className="h-full bg-slate-950 text-slate-100 flex items-center justify-center"><Loader /></div>;
  }

  return (
    <div className="h-full bg-slate-950 text-slate-100 antialiased">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
