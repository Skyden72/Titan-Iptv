import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const profile = useAppStore((state) => state.profile);
  if (!profile) return <Navigate to="/connect" replace />;
  return <>{children}</>;
};

export default RequireProfile;
