import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from './TopNav';

const AppLayout: React.FC = () => {
  // The logic to redirect if not connected has been moved to the <RequireProfile>
  // guard component in the router, which is a more robust pattern.
  return (
    <div className="flex flex-col h-full">
      <TopNav />
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;