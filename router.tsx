import React from 'react';
import { createHashRouter } from 'react-router-dom';
import Home from './pages/Home';
import LiveTv from './pages/LiveTv';
import Movies from './pages/Movies';
import Series from './pages/Series';
import Epg from './pages/Epg';
import Favourites from './pages/Favourites';
import Settings from './pages/Settings';
import Diagnostics from './pages/Diagnostics';
import AppLayout from './components/AppLayout';
import RequireProfile from './components/RequireProfile';

const router = createHashRouter([
  {
    path: '/connect',
    element: <Home />,
  },
  {
    path: '/',
    element: <RequireProfile><AppLayout /></RequireProfile>,
    children: [
      { index: true, element: <LiveTv /> },
      { path: 'live-tv', element: <LiveTv /> },
      { path: 'movies', element: <Movies /> },
      { path: 'series', element: <Series /> },
      { path: 'epg', element: <Epg /> },
      { path: 'favourites', element: <Favourites /> },
      { path: 'settings', element: <Settings /> },
      { path: 'diagnostics', element: <Diagnostics /> },
    ],
  },
]);

export default router;
