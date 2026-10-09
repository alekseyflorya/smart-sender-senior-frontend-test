import { createApi } from '../api/endpoints';
import { getFingerprint } from '../features/auth/fingerprint';
import { getSession, setSession } from '../features/auth/sessionStore';
import { queryClient } from './queryClient';

// Only an authenticated session can expire. This single check makes the
// handler idempotent (later calls find the session already anonymous) and
// keeps the startup check from looking like an expiry: while the status is
// still 'checking', restoreSession() decides the outcome.
function handleSessionExpired(): void {
  if (getSession().status !== 'authenticated') return;
  setSession({ status: 'anonymous', reason: 'expired' });
  queryClient.clear();
}

export const api = createApi({
  baseUrl: '',
  getFingerprint,
  onSessionExpired: handleSessionExpired,
});

// With a real HttpOnly cookie the session would survive a reload, so the app
// starts by asking who the user is. Any failure simply means "not signed in".
export async function restoreSession(): Promise<void> {
  try {
    const user = await api.getMe();
    setSession({ status: 'authenticated', user });
  } catch {
    setSession({ status: 'anonymous', reason: 'none' });
  }
}
