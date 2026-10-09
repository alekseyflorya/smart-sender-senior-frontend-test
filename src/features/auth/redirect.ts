import { z } from 'zod';
import { paths } from '../../app/paths';
import type { AnonymousReason } from './sessionStore';

export interface RedirectState {
  from: string;
}

// location.state is `unknown`: it survives reloads and could hold anything.
const redirectStateSchema = z.object({ from: z.string().startsWith('/') });

// After an explicit sign-out the user starts over from the list; after a
// reload or an expiry they come back to the same page, search included.
export function createRedirectState(
  reason: AnonymousReason,
  location: { pathname: string; search: string },
): RedirectState | undefined {
  if (reason === 'signedOut') return undefined;
  return { from: location.pathname + location.search };
}

export function getRedirectTarget(state: unknown): string {
  const parsed = redirectStateSchema.safeParse(state);
  return parsed.success ? parsed.data.from : paths.webhooks;
}
