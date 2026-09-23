import { useEffect } from 'react';
import { useRouteError } from 'react-router';
import { isChunkLoadError, recoverChunkLoadError } from '../lib/chunk-recovery';

export default function RouteErrorPage() {
  const error = useRouteError();
  const chunkError = isChunkLoadError(error);

  useEffect(() => {
    recoverChunkLoadError(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-6 py-[calc(env(safe-area-inset-top)+2rem)] text-center">
      <h1 className="text-xl font-bold text-fg">
        {chunkError ? 'This page could not load' : 'Something went wrong'}
      </h1>
      <p className="text-sm text-muted">
        {chunkError
          ? 'The app may have updated, or your connection was interrupted. Check your connection and reload to try again.'
          : 'Reload the page to try again, or return to Live.'}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="min-h-11 rounded-xl bg-accent px-5 py-3 font-semibold text-white dark:text-black active:opacity-70"
      >
        Reload page
      </button>
      <a href="/" className="inline-flex min-h-11 items-center justify-center text-sm text-muted">
        Back to Live
      </a>
    </main>
  );
}
