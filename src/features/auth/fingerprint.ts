const FINGERPRINT_STORAGE_KEY = 'device-fingerprint';
const FINGERPRINT_BYTES = 16;
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

let fingerprint: string | null = null;

function generateFingerprint(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(FINGERPRINT_BYTES));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  );
}

// A corrupted value is ignored rather than trusted: otherwise every auth
// request would carry it and sign-in would stay broken for good.
function readStoredFingerprint(): string | null {
  try {
    const value = localStorage.getItem(FINGERPRINT_STORAGE_KEY);
    return value !== null && FINGERPRINT_PATTERN.test(value) ? value : null;
  } catch {
    return null;
  }
}

function storeFingerprint(value: string): void {
  try {
    localStorage.setItem(FINGERPRINT_STORAGE_KEY, value);
  } catch {
    // Storage is blocked: the in-memory value still keeps the id stable for this tab.
  }
}

function createFingerprint(): string {
  const value = generateFingerprint();
  storeFingerprint(value);
  return value;
}

/** A stable device id: 32 hex characters, generated once and kept in localStorage. */
export function getFingerprint(): string {
  fingerprint ??= readStoredFingerprint() ?? createFingerprint();
  return fingerprint;
}
