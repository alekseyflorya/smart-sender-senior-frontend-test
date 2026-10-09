import { Navigate, useLocation } from 'react-router';
import { createRedirectState } from '../features/auth/redirect';
import { useSession } from '../features/auth/sessionStore';
import { Loading } from '../shared/Loading';
import { AppLayout } from './AppLayout';
import { paths } from './paths';

/**
 * Guard for everything behind sign-in: reacts to session changes, including
 * expiry, and hands the signed-in user to the layout.
 */
export function RequireAuth() {
  const session = useSession();
  const location = useLocation();

  switch (session.status) {
    case 'checking':
      return <Loading />;
    case 'anonymous':
      return (
        <Navigate
          to={paths.login}
          replace
          state={createRedirectState(session.reason, location)}
        />
      );
    case 'authenticated':
      return <AppLayout user={session.user} />;
    default: {
      const unreachable: never = session;
      return unreachable;
    }
  }
}
