import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from '../api/errors';

/** Where form-level errors live; read them as `errors.root?.server`. */
export const FORM_ERROR_PATH = 'root.server';

const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

/**
 * Puts a failed request into the form: 422 messages next to their fields,
 * everything else (fields the form does not have, other statuses, network
 * failures) as a single form-level error.
 */
export function setServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): void {
  if (!isApiError(error)) {
    setError(FORM_ERROR_PATH, {
      type: 'server',
      message: GENERIC_ERROR_MESSAGE,
    });
    return;
  }

  // The payload is empty for anything but a 422, so this covers other statuses too.
  const entries = Object.entries(error.payload);
  if (entries.length === 0) {
    setError(FORM_ERROR_PATH, { type: 'server', message: error.message });
    return;
  }

  const unmatchedMessages: string[] = [];
  for (const [key, messages] of entries) {
    const message = messages?.[0];
    if (!message) continue;

    const field = fields.find((name) => name === key);
    if (field) {
      setError(field, { type: 'server', message });
    } else {
      unmatchedMessages.push(message);
    }
  }

  if (unmatchedMessages.length > 0) {
    setError(FORM_ERROR_PATH, {
      type: 'server',
      message: unmatchedMessages.join(' '),
    });
  }
}
