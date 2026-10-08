import type { User, Webhook } from '../api/contract';

export const TEST_CREDENTIALS = {
  email: 'demo@example.com',
  password: 'secret123',
} as const;

export const CSRF_TOKEN = 'mock-csrf-token-7f3c9a1e';
export const SESSION_TTL_MS = 30_000;

export const USER: User = {
  id: 1,
  email: TEST_CREDENTIALS.email,
  first_name: 'Demo',
  last_name: 'User',
  name: 'Demo User',
};

/**
 * Server-side session, the mock's stand-in for an HttpOnly cookie:
 * the client never sees it and can only influence it through auth endpoints.
 */
export type MockSession =
  | { status: 'anonymous' }
  | {
      status: 'awaitingIssue';
      deviceSessionToken: string;
      fingerprint: string;
    }
  | { status: 'active'; fingerprint: string; expiresAt: number };

interface MockDb {
  webhooks: Webhook[];
  session: MockSession;
}

const CHANNELS = ['Telegram', 'Viber', 'Instagram'];
// Five "Order …" events give 15 matches for the search "order",
// i.e. two pages, so search and pagination can be shown together.
const EVENTS = [
  'Order created',
  'Order paid',
  'Order shipped',
  'Order delivered',
  'Order cancelled',
  'Payment failed',
  'Subscriber added',
  'Message delivered',
  'Chat closed',
];
const SEED_START_MS = Date.UTC(2026, 0, 1);
const DAY_MS = 24 * 60 * 60 * 1000;

function toSlug(text: string): string {
  return text.toLowerCase().replaceAll(' ', '-');
}

// 3 channels x 9 events = 27 webhooks, generated deterministically
// so pagination and search results are the same on every run.
function createSeedWebhooks(): Webhook[] {
  return CHANNELS.flatMap((channel) =>
    EVENTS.map((event) => ({ channel, event })),
  ).map(({ channel, event }, index) => {
    const id = index + 1;
    return {
      id,
      name: `${channel}: ${event}`,
      url: `https://hooks.example.com/${toSlug(channel)}/${toSlug(event)}`,
      active: id % 3 !== 0,
      created_at: new Date(SEED_START_MS + id * DAY_MS).toISOString(),
    };
  });
}

function createInitialState(): MockDb {
  return { webhooks: createSeedWebhooks(), session: { status: 'anonymous' } };
}

export const db: MockDb = createInitialState();

/** Test helper: restores seed data and drops the session. */
export function resetDb(): void {
  Object.assign(db, createInitialState());
}

/** Test helper: makes the active session expired without waiting 30 seconds. */
export function expireSession(): void {
  if (db.session.status === 'active') {
    db.session = { ...db.session, expiresAt: 0 };
  }
}
