import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isChunkLoadError, recoverChunkLoadError } from '../src/lib/chunk-recovery';

const missingChunk = new TypeError(
  'Failed to fetch dynamically imported module: https://example.com/assets/LeaguePage-old.js'
);
let values: Map<string, string>;
let reload: ReturnType<typeof vi.fn>;

beforeEach(() => {
  values = new Map();
  reload = vi.fn();
  vi.stubGlobal('navigator', { onLine: true });
  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    location: { reload },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('stale route chunk recovery', () => {
  it.each([
    missingChunk.message,
    'Importing a module script failed.',
    'error loading dynamically imported module: https://example.com/old.js',
    'Unable to preload CSS for /assets/old.css',
  ])('recognizes browser asset failure: %s', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('reloads once and retains the guard across repeated errors', () => {
    expect(recoverChunkLoadError(missingChunk)).toBe(true);
    expect(recoverChunkLoadError(missingChunk)).toBe(false);
    expect(recoverChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('permits recovery for a later deployment after the cooldown', () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(100_000);
    recoverChunkLoadError(missingChunk);
    now.mockReturnValue(160_000);
    expect(recoverChunkLoadError(missingChunk)).toBe(true);
  });

  it('does not reload offline or consume the next online recovery', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(recoverChunkLoadError(missingChunk)).toBe(false);
    expect(values.size).toBe(0);
    expect(reload).not.toHaveBeenCalled();
    vi.stubGlobal('navigator', { onLine: true });
    expect(recoverChunkLoadError(missingChunk)).toBe(true);
  });

  it('does not reload API errors, render errors or arbitrary thrown values', () => {
    for (const error of [new Error('Failed to fetch'), new Error('Render failed'), null, 'error']) {
      expect(recoverChunkLoadError(error)).toBe(false);
    }
    expect(reload).not.toHaveBeenCalled();
  });

  it('leaves a manual retry when browser storage is blocked', () => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new Error('Storage blocked');
      },
    });
    expect(recoverChunkLoadError(missingChunk)).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
