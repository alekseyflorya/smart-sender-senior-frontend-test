import { z } from 'zod';
import {
  API_ERROR_TYPES,
  type ApiErrorType,
  type FieldErrors,
} from './contract';

/** Used when an error response does not match the contract's error format. */
export const UNKNOWN_ERROR_TYPE = 'UnknownError';

// Forms read field messages straight from `payload`, so the error body is
// validated at this boundary instead of being trusted.
const errorBodySchema = z.object({
  error: z.object({
    type: z.enum(API_ERROR_TYPES),
    message: z.string(),
    payload: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

interface ApiErrorInit {
  status: number;
  type: ApiErrorType | typeof UNKNOWN_ERROR_TYPE;
  message: string;
  payload?: FieldErrors;
}

/** An HTTP error response. Network failures and aborts are not wrapped. */
export class ApiError extends Error {
  readonly status: number;
  readonly type: ApiErrorType | typeof UNKNOWN_ERROR_TYPE;
  /** Field messages from a 422; empty for other errors, so callers need no null checks. */
  readonly payload: FieldErrors;

  constructor({ status, type, message, payload = {} }: ApiErrorInit) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.payload = payload;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = errorBodySchema.safeParse(body);

  if (!parsed.success) {
    return new ApiError({
      status: response.status,
      type: UNKNOWN_ERROR_TYPE,
      message:
        response.statusText ||
        `Request failed with status ${String(response.status)}`,
    });
  }

  return new ApiError({ status: response.status, ...parsed.data.error });
}
