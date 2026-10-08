import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { getResponse, http } from 'msw';
import { expireSession, resetDb, TEST_CREDENTIALS } from '../mocks/db';
import { handlers } from '../mocks/handlers';
import { server } from '../mocks/node';
import { HEADERS, REQUESTED_WITH_VALUE } from './contract';
import { createApi } from './endpoints';
import { isApiError } from './errors';

// Node's fetch needs absolute URLs; the mock handlers match any origin.
const BASE_URL = 'http://localhost';
const FINGERPRINT = '0123456789abcdef0123456789abcdef';
const ROTATE_PATH = '/auth/token/rotate';

interface RecordedExchange {
  method: string;
  path: string;
  status: number;
  requestedWith: string | null;
}

// Observes traffic from the outside, the way a server would see it,
// instead of inspecting the client's internals.
function recordExchanges(): RecordedExchange[] {
  const exchanges: RecordedExchange[] = [];
  server.events.on('response:mocked', ({ request, response }) => {
    exchanges.push({
      method: request.method,
      path: new URL(request.url).pathname,
      status: response.status,
      requestedWith: request.headers.get(HEADERS.requestedWith),
    });
  });
  return exchanges;
}

function rotationsIn(exchanges: RecordedExchange[]): RecordedExchange[] {
  return exchanges.filter(
    ({ method, path }) => method === 'POST' && path === ROTATE_PATH,
  );
}

/** A promise the test resolves by hand, to control when a response is delivered. */
function createGate() {
  let open: () => void = () => undefined;
  // The executor runs synchronously, so `open` is the real resolver by the return below.
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { opened, open };
}

function createTestApi() {
  const onSessionExpired = vi.fn();
  const api = createApi({
    baseUrl: BASE_URL,
    getFingerprint: () => FINGERPRINT,
    onSessionExpired,
  });
  return { api, onSessionExpired };
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
  server.events.removeAllListeners();
  resetDb();
});

afterAll(() => {
  server.close();
});

describe('session rotation', () => {
  it('shares one rotate between parallel 401 responses and retries both requests', async () => {
    const { api, onSessionExpired } = createTestApi();
    const exchanges = recordExchanges();
    await api.signIn(TEST_CREDENTIALS);
    expireSession();

    const [user, webhooks] = await Promise.all([
      api.getMe(),
      api.listWebhooks({ page: 1, limit: 10 }),
    ]);

    // Both requests really hit the expired session...
    const unauthorizedPaths = exchanges
      .filter(({ status }) => status === 401)
      .map(({ path }) => path);
    expect(unauthorizedPaths.toSorted()).toEqual(['/v1/me', '/v1/webhooks']);
    // ...yet only one rotate went out, and both retries succeeded.
    const rotations = rotationsIn(exchanges);
    expect(rotations).toHaveLength(1);
    expect(rotations[0]?.status).toBe(200);
    expect(user.email).toBe(TEST_CREDENTIALS.email);
    expect(webhooks.data).toHaveLength(10);
    expect(onSessionExpired).not.toHaveBeenCalled();
    expect(
      exchanges.every(
        ({ requestedWith }) => requestedWith === REQUESTED_WITH_VALUE,
      ),
    ).toBe(true);
  });

  it('ends the local session once when the shared rotate fails', async () => {
    const { api, onSessionExpired } = createTestApi();
    await api.signIn(TEST_CREDENTIALS);
    await api.signOut();
    const exchanges = recordExchanges();

    const results = await Promise.allSettled([api.getMe(), api.getWebhook(1)]);

    const failureStatuses = results.map((result) =>
      result.status === 'rejected' && isApiError(result.reason)
        ? result.reason.status
        : result.status,
    );
    expect(failureStatuses).toEqual([401, 401]);
    expect(rotationsIn(exchanges).map(({ status }) => status)).toEqual([400]);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('retries a 401 that arrives after the rotate has finished, without a second rotate', async () => {
    // Scenario: both requests are sent while the session is expired, but the
    // network delivers the webhooks 401 late, after /v1/me has already rotated
    // and retried. That request was sent with the old session, so it must
    // simply retry; starting a new rotate would be wasted (or, against a real
    // server with one-time refresh tokens, harmful).
    const { api, onSessionExpired } = createTestApi();
    await api.signIn(TEST_CREDENTIALS);
    expireSession();

    const lateDelivery = createGate();
    server.use(
      http.get(
        '*/v1/webhooks',
        async ({ request }) => {
          // The server answers immediately (401, session expired)...
          const response = await getResponse(handlers, request);
          // ...but the response reaches the client only when the test opens the gate.
          await lateDelivery.opened;
          return response;
        },
        { once: true },
      ),
    );
    const exchanges = recordExchanges();

    const webhooksRequest = api.listWebhooks({ page: 1, limit: 10 });
    const user = await api.getMe(); // 401 → rotate → successful retry
    lateDelivery.open();
    const webhooks = await webhooksRequest;

    expect(user.email).toBe(TEST_CREDENTIALS.email);
    expect(webhooks.data).toHaveLength(10);
    expect(rotationsIn(exchanges)).toHaveLength(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});
