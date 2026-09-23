const RELOAD_KEY = 'fplq:chunk-reload-at';
const RELOAD_COOLDOWN_MS = 60_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(
    error.message
  );
}

export function recoverChunkLoadError(error: unknown): boolean {
  if (!isChunkLoadError(error) || !navigator.onLine) return false;

  try {
    const now = Date.now();
    const previous = Number(window.sessionStorage.getItem(RELOAD_KEY));
    // Persist across navigation so a missing asset cannot cause a reload loop.
    if (previous > 0 && now - previous < RELOAD_COOLDOWN_MS) return false;
    window.sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    // Without a persistent guard, leave recovery to the visible reload button.
    return false;
  }

  window.location.reload();
  return true;
}
