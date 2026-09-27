/**
 * localStorage access that never throws. Storage can be unavailable in private
 * windows or when site data is blocked; the app must work without it.
 */
const PREFIX = 'ajax-lab:';

export function readStored(key: string): string | null {
  try {
    return window.localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

export function writeStored(key: string, value: string): void {
  try {
    window.localStorage.setItem(PREFIX + key, value);
  } catch {
    // Persistence is a convenience; ignore failures.
  }
}
