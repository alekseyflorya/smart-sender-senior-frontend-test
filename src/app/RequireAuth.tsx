import { Navigate, Outlet, useLocation } from 'react-router';
import type { User } from '../api/contract';
import { createRedirectState } from '../features/auth/redirect';
import { useSession } from '../features/auth/sessionStore';
import { useSignOut } from '../features/auth/useSignOut';
import { Loading } from '../shared/Loading';
import { paths } from './paths';

/** Layout route for everything behind sign-in; reacts to session changes, including expiry. */
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
      return <AuthenticatedLayout user={session.user} />;
    default: {
      const unreachable: never = session;
      return unreachable;
    }
  }
}

function AuthenticatedLayout({ user }: { user: User }) {
  const signOut = useSignOut();

  return (
    <>
      <header className="app-header">
        <span>{user.name}</span>
        <button
          type="button"
          disabled={signOut.isPending}
          onClick={() => {
            signOut.mutate();
          }}
        >
          {signOut.isPending ? 'Signing out…' : 'Sign out'}
        </button>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
