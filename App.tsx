import React, { useState, useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { useAppStore } from './store/useAppStore';
import Loader from './components/Loader';

// A full-page loader to be shown while the app state is rehydrating.
const GlobalLoader: React.FC = () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-900">
    <Loader />
  </div>
);

function App() {
  // Always start with `false` to guarantee a re-render after hydration is confirmed.
  // This prevents race conditions where components might read stale state on initial render.
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // The `onFinishHydration` listener is the most reliable way to know when the state is ready.
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });

    // We also check `hasHydrated` directly in case the event fired before this component mounted.
    if (useAppStore.persist.hasHydrated()) {
      setIsHydrated(true);
    }

    // Cleanup the subscription on unmount.
    return () => {
      unsub();
    };
  }, []);

  return (
    <div className="h-full bg-gray-900 text-gray-200 antialiased">
      {isHydrated ? <RouterProvider router={router} /> : <GlobalLoader />}
    </div>
  );
}

export default App;