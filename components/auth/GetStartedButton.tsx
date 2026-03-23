'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/actions/auth';

export default function GetStartedButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleClick() {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithGoogle('/app');
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else {
        setError(result.error ?? 'Failed to start sign-in');
        setLoading(false);
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-3 text-red-400 text-sm text-center mb-4">
          {error}
        </div>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 select-none bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30 h-14 px-6 text-lg gap-2 w-full disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : null}
        {loading ? 'Connecting…' : 'Get Started'}
      </button>
    </>
  );
}
