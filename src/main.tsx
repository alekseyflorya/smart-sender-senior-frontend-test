import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { worker } from './mocks/browser';
import './index.css';

// There is no real backend, so the mock runs in every mode. A real project
// would gate this behind an env flag and drop it from production builds.
await worker.start({ onUnhandledRequest: 'bypass' });

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
