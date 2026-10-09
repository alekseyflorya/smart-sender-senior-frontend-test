import { Outlet } from 'react-router';
import type { User } from '../api/contract';
import { useSignOut } from '../features/auth/useSignOut';

/** The frame around signed-in pages: header with the user and sign-out. */
export function AppLayout({ user }: { user: User }) {
  const signOut = useSignOut();

  return (
    <>
      <header className="app-header">
        <span className="app-title">Webhooks</span>
        <div className="app-user">
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
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </>
  );
}
