import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const RequireProfile: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const isConnected = useAppStore(s => s.isConnected);
  const did = useRef(false);

  useEffect(() => {
    // This effect runs once to check for a profile. If none exists, it redirects.
    if (did.current) return;
    if (!isConnected) {
      did.current = true;
      navigate('/connect', { replace: true });
    }
  }, [isConnected, navigate]);
  
  // Always render children. The effect handles the redirect, preventing this component
  // from causing a re-render by returning null, which is a more stable pattern.
  return <>{children}</>;
};

export default RequireProfile;
