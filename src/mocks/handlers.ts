import { delay, http, HttpResponse } from 'msw';
import { z } from 'zod';
import {
  API_ERROR_TYPES,
  HEADERS,
  type ApiErrorStatus,
  type ErrorBody,
  type FieldErrors,
  type LoginResponse,
  type User,
  type Webhook,
  type WebhookList,
} from '../api/contract';
import { CSRF_TOKEN, db, SESSION_TTL_MS, TEST_CREDENTIALS, USER } from './db';

const DEFAULT_PAGE_SIZE = 10;

const ERROR_MESSAGES: Record<ApiErrorStatus, string> = {
  400: 'Bad request.',
  401: 'Unauthenticated.',
  404: 'Resource not found.',
  419: 'CSRF token mismatch.',
  422: 'The given data was invalid.',
};

// Request bodies are untrusted input, so the mock validates them like a real server would.
function requiredString(field: string, { trim = false } = {}) {
  const message = `The ${field} field is required.`;
  const base = z.string({ error: message });
  // Zod 4 runs trim() and min() in declaration order, so trim must come first
  // for a whitespace-only value to be rejected.
  return (trim ? base.trim() : base).min(1, message);
}

const fingerprintSchema = requiredString('fingerprint').regex(
  /^[0-9a-f]{32}$/,
  'The fingerprint must be 32 hex characters.',
);

const loginSchema = z.object({
  email: requiredString('email'),
  password: requiredString('password'),
  fingerprint: fingerprintSchema,
});

const issueSessionSchema = z.object({
  device_session_token: requiredString('device session token'),
  fingerprint: fingerprintSchema,
});

const fingerprintBodySchema = z.object({ fingerprint: fingerprintSchema });

const webhookInputSchema = z.object({
  name: requiredString('name', { trim: true }),
  url: z.url({ protocol: /^https?$/, error: 'The url must be a valid URL.' }),
});

// Typed as a plain Response on purpose: MSW infers a handler's body type from its
// returns, and a plain Response can sit next to HttpResponse<Webhook> etc.
// The error body shape is still checked by HttpResponse.json<ErrorBody> below.
function errorResponse(
  status: ApiErrorStatus,
  payload?: FieldErrors,
): Response {
  return HttpResponse.json<ErrorBody>(
    {
      error: {
        type: API_ERROR_TYPES[status],
        message: ERROR_MESSAGES[status],
        payload,
      },
    },
    { status },
  );
}

function validationError(error: z.ZodError): Response {
  return errorResponse(422, z.flattenError(error).fieldErrors);
}

function emptyResponse(status: 200 | 204): Response {
  return new HttpResponse(null, { status });
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    // An empty object lets a missing or malformed body surface as
    // per-field "required" errors instead of zod's generic root message.
    return {};
  }
}

function checkCsrf(request: Request): Response | null {
  return request.headers.get(HEADERS.csrfToken) === CSRF_TOKEN
    ? null
    : errorResponse(419);
}

function checkSession(): Response | null {
  const { session } = db;
  const isActive =
    session.status === 'active' && Date.now() < session.expiresAt;
  return isActive ? null : errorResponse(401);
}

function parsePositiveInt(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function findWebhook(id: string): Webhook | undefined {
  return db.webhooks.find((webhook) => String(webhook.id) === id);
}

// Wildcard origins let the same handlers match relative URLs in the browser
// and absolute URLs in Node, where fetch requires them.
export const handlers = [
  http.get('*/csrf', async () => {
    await delay();
    return new HttpResponse(null, {
      status: 204,
      headers: { [HEADERS.csrfToken]: CSRF_TOKEN },
    });
  }),

  http.post('*/auth/login', async ({ request }) => {
    await delay();
    const rejection = checkCsrf(request);
    if (rejection) return rejection;

    // A real app would send a token from a captcha widget; the mock only requires presence.
    if (!request.headers.get(HEADERS.captchaToken)) {
      return errorResponse(422, {
        captcha: ['The captcha token is required.'],
      });
    }

    const result = loginSchema.safeParse(await readJson(request));
    if (!result.success) return validationError(result.error);

    const { email, password, fingerprint } = result.data;
    // Same field and message for a wrong email or password, so the response
    // does not reveal which accounts exist.
    if (
      email !== TEST_CREDENTIALS.email ||
      password !== TEST_CREDENTIALS.password
    ) {
      return errorResponse(422, {
        password: ['These credentials do not match our records.'],
      });
    }

    const deviceSessionToken = crypto.randomUUID();
    db.session = { status: 'awaitingIssue', deviceSessionToken, fingerprint };
    return HttpResponse.json<LoginResponse>({
      device_session_token: deviceSessionToken,
    });
  }),

  http.post('*/auth/token/issue', async ({ request }) => {
    await delay();
    const rejection = checkCsrf(request);
    if (rejection) return rejection;

    const result = issueSessionSchema.safeParse(await readJson(request));
    if (!result.success) return validationError(result.error);

    const { session } = db;
    const { device_session_token, fingerprint } = result.data;
    const isValidToken =
      session.status === 'awaitingIssue' &&
      session.deviceSessionToken === device_session_token &&
      session.fingerprint === fingerprint;
    if (!isValidToken) {
      return errorResponse(422, {
        device_session_token: ['The device session token is invalid.'],
      });
    }

    db.session = {
      status: 'active',
      fingerprint,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    return emptyResponse(200);
  }),

  http.post('*/auth/token/rotate', async ({ request }) => {
    await delay();
    const rejection = checkCsrf(request);
    if (rejection) return rejection;

    const result = fingerprintBodySchema.safeParse(await readJson(request));
    const { session } = db;
    const canRotate =
      result.success &&
      session.status === 'active' &&
      session.fingerprint === result.data.fingerprint;
    if (!canRotate) return errorResponse(400);

    // Deliberately allowed after expiry: rotating an expired session
    // is exactly how the client recovers from a 401.
    db.session = { ...session, expiresAt: Date.now() + SESSION_TTL_MS };
    return emptyResponse(200);
  }),

  http.post('*/auth/token/revoke', async ({ request }) => {
    await delay();
    const rejection = checkCsrf(request);
    if (rejection) return rejection;

    // Idempotent: logging out always succeeds, whatever the session state.
    db.session = { status: 'anonymous' };
    return emptyResponse(204);
  }),

  http.get('*/v1/me', async () => {
    await delay();
    return checkSession() ?? HttpResponse.json<User>(USER);
  }),

  http.get('*/v1/webhooks', async ({ request }) => {
    await delay();
    const rejection = checkSession();
    if (rejection) return rejection;

    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get('page'), 1);
    const limit = parsePositiveInt(
      searchParams.get('limit'),
      DEFAULT_PAGE_SIZE,
    );
    const search = (searchParams.get('search') ?? '').trim().toLowerCase();

    const matches = db.webhooks.filter((webhook) =>
      webhook.name.toLowerCase().includes(search),
    );
    const start = (page - 1) * limit;
    // A page beyond the last one yields empty data; the client decides how to recover.
    return HttpResponse.json<WebhookList>({
      data: matches.slice(start, start + limit),
      paging: {
        pages: {
          current: page,
          last: Math.max(1, Math.ceil(matches.length / limit)),
        },
        results: { total: matches.length, limitation: limit },
      },
    });
  }),

  http.get<{ id: string }>('*/v1/webhooks/:id', async ({ params }) => {
    await delay();
    const rejection = checkSession();
    if (rejection) return rejection;

    const webhook = findWebhook(params.id);
    return webhook ? HttpResponse.json<Webhook>(webhook) : errorResponse(404);
  }),

  http.put<{ id: string }>('*/v1/webhooks/:id', async ({ request, params }) => {
    await delay();
    const rejection = checkCsrf(request) ?? checkSession();
    if (rejection) return rejection;

    const webhook = findWebhook(params.id);
    if (!webhook) return errorResponse(404);

    const result = webhookInputSchema.safeParse(await readJson(request));
    if (!result.success) return validationError(result.error);

    Object.assign(webhook, result.data);
    return HttpResponse.json<Webhook>(webhook);
  }),
];
