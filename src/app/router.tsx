import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { WebhookEditPage } from '../features/webhooks/WebhookEditPage';
import { WebhookListPage } from '../features/webhooks/WebhookListPage';
import { paths } from './paths';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  { path: paths.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      { path: paths.webhooks, element: <WebhookListPage /> },
      { path: paths.webhookPattern, element: <WebhookEditPage /> },
    ],
  },
  { path: '*', element: <Navigate to={paths.webhooks} replace /> },
]);
