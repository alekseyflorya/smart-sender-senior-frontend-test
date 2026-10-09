import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

// There is no real backend, so the mock runs in every mode. A real project
// would gate this behind an env flag and drop it from production builds.
// The dynamic import keeps MSW out of the main bundle in a separate chunk.
const { worker } = await import('./mocks/browser');
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
