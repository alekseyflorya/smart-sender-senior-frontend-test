import { QueryClient } from '@tanstack/react-query';
import { isApiError } from '../api/errors';

const MAX_QUERY_RETRIES = 2;

// A 4xx will not change on retry, and 401 is already handled by the http
// client. Only network failures and 5xx are worth another attempt.
function shouldRetry(failureCount: number, error: Error): boolean {
  if (isApiError(error) && error.status < 500) return false;
  return failureCount < MAX_QUERY_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: shouldRetry } },
});
