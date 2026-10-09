import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { restoreSession } from './app/api';
import { App } from './app/App';
import './index.css';

// There is no real backend, so the mock runs in every mode. A real project
// would gate this behind an env flag and drop it from production builds.
// The dynamic import keeps MSW out of the main bundle in a separate chunk.
const { worker } = await import('./mocks/browser');
await worker.start({ onUnhandledRequest: 'bypass' });

// Not awaited: the app renders right away and shows its loading state
// until the session check settles.
void restoreSession();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root is missing in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
