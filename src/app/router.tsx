import { createBrowserRouter, Navigate } from 'react-router';
import { LoginPage } from '../features/auth/LoginPage';
import { paths } from './paths';
import { RequireAuth } from './RequireAuth';

export const router = createBrowserRouter([
  { path: paths.login, element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      // Placeholder until the list lands (stage 5).
      { path: paths.webhooks, element: <h1>Webhooks</h1> },
    ],
  },
  { path: '*', element: <Navigate to={paths.webhooks} replace /> },
]);
