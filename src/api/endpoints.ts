import {
  HEADERS,
  type Credentials,
  type FingerprintRequest,
  type IssueSessionRequest,
  type LoginRequest,
  type LoginResponse,
  type User,
  type Webhook,
  type WebhookInput,
  type WebhookList,
} from './contract';
import { createHttpClient, type HttpClientConfig } from './http';

// The mock accepts any non-empty value; a real app would send the token
// produced by a captcha widget.
const CAPTCHA_STUB_TOKEN = 'captcha-stub-token';

export interface WebhookListParams {
  page: number;
  limit: number;
  search?: string;
}

export function createApi(config: HttpClientConfig) {
  const { request } = createHttpClient(config);

  function getMe(signal?: AbortSignal): Promise<User> {
    return request<User>('/v1/me', { signal });
  }

  /**
   * login → issue → me in one call. The device_session_token lives only in a
   * local variable here, so it never reaches callers, the query cache or storage.
   */
  async function signIn(credentials: Credentials): Promise<User> {
    const fingerprint = config.getFingerprint();

    const loginBody: LoginRequest = { ...credentials, fingerprint };
    const { device_session_token } = await request<LoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: loginBody,
        headers: { [HEADERS.captchaToken]: CAPTCHA_STUB_TOKEN },
        skipAuthRetry: true,
      },
    );

    const issueBody: IssueSessionRequest = {
      device_session_token,
      fingerprint,
    };
    await request<undefined>('/auth/token/issue', {
      method: 'POST',
      body: issueBody,
      skipAuthRetry: true,
    });

    return getMe();
  }

  function signOut(): Promise<void> {
    const body: FingerprintRequest = { fingerprint: config.getFingerprint() };
    return request<undefined>('/auth/token/revoke', {
      method: 'POST',
      body,
      skipAuthRetry: true,
    });
  }

  function listWebhooks(
    { page, limit, search }: WebhookListParams,
    signal?: AbortSignal,
  ): Promise<WebhookList> {
    return request<WebhookList>('/v1/webhooks', {
      query: { page, limit, search },
      signal,
    });
  }

  function getWebhook(id: number, signal?: AbortSignal): Promise<Webhook> {
    return request<Webhook>(`/v1/webhooks/${id}`, { signal });
  }

  function updateWebhook(id: number, input: WebhookInput): Promise<Webhook> {
    return request<Webhook>(`/v1/webhooks/${id}`, {
      method: 'PUT',
      body: input,
    });
  }

  return { signIn, signOut, getMe, listWebhooks, getWebhook, updateWebhook };
}

export type Api = ReturnType<typeof createApi>;
