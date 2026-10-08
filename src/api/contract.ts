// The API contract from the task, described once and shared by the HTTP client
// and the MSW mock, so a drift between them fails type-checking.

export const HEADERS = {
  requestedWith: 'X-Requested-With',
  csrfToken: 'X-CSRF-TOKEN',
  captchaToken: 'X-Captcha-Token',
} as const;

export const REQUESTED_WITH_VALUE = 'XMLHttpRequest';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  active: boolean;
  created_at: string;
}

export interface WebhookList {
  data: Webhook[];
  paging: {
    pages: { current: number; last: number };
    results: { total: number; limitation: number };
  };
}

export interface Credentials {
  email: string;
  password: string;
}

export interface LoginRequest extends Credentials {
  fingerprint: string;
}

export interface LoginResponse {
  device_session_token: string;
}

export interface IssueSessionRequest {
  device_session_token: string;
  fingerprint: string;
}

export interface FingerprintRequest {
  fingerprint: string;
}

export interface WebhookInput {
  name: string;
  url: string;
}

export const API_ERROR_TYPES = {
  400: 'BadRequestException',
  401: 'AuthenticationException',
  404: 'NotFoundException',
  419: 'TokenMismatchException',
  422: 'ValidationException',
} as const;

export type ApiErrorStatus = keyof typeof API_ERROR_TYPES;
export type ApiErrorType = (typeof API_ERROR_TYPES)[ApiErrorStatus];

/** Validation messages keyed by field name, e.g. `{ url: ['The url must be a valid URL.'] }`. */
export type FieldErrors = Partial<Record<string, string[]>>;

export interface ErrorBody {
  error: {
    type: ApiErrorType;
    message: string;
    payload?: FieldErrors;
  };
}
