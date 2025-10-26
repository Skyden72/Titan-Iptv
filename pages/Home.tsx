import React from 'react';
import ConnectWizard from '../components/ConnectWizard';

const Home: React.FC = () => {
  // The logic to navigate away if already connected has been moved into the
  // ConnectWizard component to centralize post-connection side effects.
  // This Home component now simply acts as a layout for the wizard.
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <ConnectWizard />
    </div>
  );
};

export default Home;