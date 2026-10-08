import {
  HEADERS,
  REQUESTED_WITH_VALUE,
  type FingerprintRequest,
} from './contract';
import { toApiError } from './errors';

export interface HttpClientConfig {
  /** '' in the browser (same origin); an absolute origin in Node, where fetch requires one. */
  baseUrl: string;
  /** Passed in so the API layer does not depend on where the fingerprint is stored. */
  getFingerprint: () => string;
  /**
   * Called when the session cannot be restored: rotate failed, or a request
   * got 401 again after its single retry. It can fire more than once for one
   * logical expiry (two retried requests both getting 401, or a late 401
   * arriving after a failed rotate), so the handler must be idempotent.
   */
  onSessionExpired: () => void;
}

type HttpMethod = 'GET' | 'POST' | 'PUT';

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /**
   * Opts out of the 401 → rotate → retry flow. Set for auth endpoints:
   * their 401 is not an expired session, and rotate must never start another rotate.
   */
  skipAuthRetry?: boolean;
}

interface RetryState {
  csrfRetried: boolean;
  authRetried: boolean;
}

const CSRF_PATH = '/csrf';
const ROTATE_PATH = '/auth/token/rotate';
const CSRF_PROTECTED_METHODS: ReadonlySet<HttpMethod> = new Set([
  'POST',
  'PUT',
]);

export function createHttpClient(config: HttpClientConfig) {
  let csrfPromise: Promise<string> | null = null;
  let rotatePromise: Promise<boolean> | null = null;
  // Incremented after every successful rotate. Each request remembers the
  // generation it was sent in: if its 401 arrives after a rotate has already
  // completed, it retries straight away instead of starting a second rotate.
  let sessionGeneration = 0;

  function buildUrl(path: string, query: RequestOptions['query'] = {}): string {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value));
    }
    const search = params.toString();
    return `${config.baseUrl}${path}${search ? `?${search}` : ''}`;
  }

  function buildHeaders(
    method: HttpMethod,
    hasBody: boolean,
    csrfToken: string,
    extra: Record<string, string> = {},
  ): Headers {
    const headers = new Headers(extra);
    headers.set(HEADERS.requestedWith, REQUESTED_WITH_VALUE);
    if (hasBody) headers.set('Content-Type', 'application/json');
    if (CSRF_PROTECTED_METHODS.has(method))
      headers.set(HEADERS.csrfToken, csrfToken);
    return headers;
  }

  // Plain fetch rather than request(): request() itself waits for the CSRF token.
  async function fetchCsrfToken(): Promise<string> {
    const response = await fetch(buildUrl(CSRF_PATH), {
      headers: { [HEADERS.requestedWith]: REQUESTED_WITH_VALUE },
    });
    if (!response.ok) throw await toApiError(response);

    const token = response.headers.get(HEADERS.csrfToken);
    if (!token) {
      throw new Error(
        `${CSRF_PATH} responded without the ${HEADERS.csrfToken} header`,
      );
    }
    return token;
  }

  // The single place that (re)loads the token. All concurrent callers share the
  // promise; a failed load is forgotten so the next request tries again.
  function loadCsrf(): Promise<string> {
    const promise = fetchCsrfToken().catch((error: unknown) => {
      if (csrfPromise === promise) csrfPromise = null;
      throw error;
    });
    csrfPromise = promise;
    return promise;
  }

  function ensureCsrf(): Promise<string> {
    return csrfPromise ?? loadCsrf();
  }

  // Several requests can get 419 with the same stale token. Only the first one
  // reloads it; the others see that the promise has changed and reuse the reload.
  function refreshCsrf(stale: Promise<string>): Promise<string> {
    return csrfPromise && csrfPromise !== stale ? csrfPromise : loadCsrf();
  }

  // All requests that got 401 while a rotate is in flight await the same promise.
  // Rotate is sent without any caller's AbortSignal: it is shared, so one
  // cancelled request must not cancel it for the others.
  function rotateSession(): Promise<boolean> {
    const body: FingerprintRequest = { fingerprint: config.getFingerprint() };
    rotatePromise ??= request<undefined>(ROTATE_PATH, {
      method: 'POST',
      body,
      skipAuthRetry: true,
    })
      .then(
        () => {
          sessionGeneration += 1;
          return true;
        },
        () => {
          config.onSessionExpired();
          return false;
        },
      )
      .finally(() => {
        rotatePromise = null;
      });
    return rotatePromise;
  }

  async function parseBody<T>(response: Response): Promise<T> {
    const text = await response.text();
    const data: unknown = text ? JSON.parse(text) : undefined;
    // The contract is trusted for successful responses; validating every
    // response at runtime is out of scope for an app of this size.
    return data as T;
  }

  async function send<T>(
    path: string,
    options: RequestOptions,
    retry: RetryState,
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      query,
      headers,
      signal,
      skipAuthRetry = false,
    } = options;
    const csrf = ensureCsrf();
    const csrfToken = await csrf;
    const generation = sessionGeneration;

    const response = await fetch(buildUrl(path, query), {
      method,
      signal,
      headers: buildHeaders(method, body !== undefined, csrfToken, headers),
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (response.ok) return parseBody<T>(response);

    if (response.status === 419 && !retry.csrfRetried) {
      await refreshCsrf(csrf);
      return send<T>(path, options, { ...retry, csrfRetried: true });
    }

    if (response.status === 401 && !skipAuthRetry) {
      // Exactly one retry: a second 401 ends the session instead of looping.
      if (retry.authRetried) {
        config.onSessionExpired();
        throw await toApiError(response);
      }

      const rotatedSinceSent = generation !== sessionGeneration;
      const canRetry = rotatedSinceSent || (await rotateSession());
      if (!canRetry) throw await toApiError(response);

      return send<T>(path, options, { ...retry, authRetried: true });
    }

    throw await toApiError(response);
  }

  function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return send<T>(path, options, { csrfRetried: false, authRetried: false });
  }

  return { request };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
