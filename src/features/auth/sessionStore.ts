import { useSyncExternalStore } from 'react';
import type { User } from '../../api/contract';

export type AnonymousReason = 'none' | 'expired' | 'signedOut';

export type Session =
  | { status: 'checking' }
  | { status: 'authenticated'; user: User }
  | { status: 'anonymous'; reason: AnonymousReason };

// A plain module store rather than React state: the API layer's
// onSessionExpired callback has to update it from outside any component.
let session: Session = { status: 'checking' };
const listeners = new Set<() => void>();

export function getSession(): Session {
  return session;
}

export function setSession(next: Session): void {
  session = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSession(): Session {
  return useSyncExternalStore(subscribe, getSession);
}
