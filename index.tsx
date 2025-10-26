import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A global error boundary to get unminified stack traces in development.
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { err?: any }> {
  state = { err: undefined };
  static getDerivedStateFromError(err: any) {
    return { err };
  }
  render() {
    return this.state.err
      ? <pre style={{ color: '#f55', whiteSpace: 'pre-wrap', padding: '20px', backgroundColor: '#111', height: '100vh' }}>{String(this.state.err.stack || this.state.err)}</pre>
      : this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
