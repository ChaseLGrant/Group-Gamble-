'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
      <div className="text-5xl">⚠️</div>
      <div>
        <h1 className="text-2xl font-black text-zinc-100">Something went wrong</h1>
        <p className="text-zinc-400 mt-2 text-sm max-w-sm">
          The app ran into an unexpected error. This is usually caused by a
          temporary issue — try again in a moment.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => reset()}>Try Again</Button>
        <a href="/">
          <Button variant="secondary">Go Home</Button>
        </a>
      </div>
    </div>
  );
}
