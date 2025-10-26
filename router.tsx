import React from 'react';
import { createHashRouter } from 'react-router-dom';
import Home from './pages/Home';
import LiveTv from './pages/LiveTv';
import Movies from './pages/Movies';
import Series from './pages/Series';
import AppLayout from './components/AppLayout';
import RequireProfile from './components/RequireProfile';

const router = createHashRouter([
  {
    path: '/',
    // Protect the main layout. If not connected, this guard will redirect to /connect.
    element: <RequireProfile><AppLayout /></RequireProfile>,
    children: [
      // The index route is now handled by RequireProfile, default child is LiveTv.
      { index: true, element: <LiveTv /> },
      {
        path: '/live-tv',
        element: <LiveTv />,
      },
      {
        path: '/movies',
        element: <Movies />,
      },
      {
        path: '/series',
        element: <Series />,
      },
    ],
  },
  {
    path: '/connect',
    element: <Home />,
  },
]);

export default router;