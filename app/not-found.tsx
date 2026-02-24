import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-6 text-center">
      <div className="text-6xl">🎲</div>
      <div>
        <h1 className="text-2xl font-black text-zinc-100">404</h1>
        <p className="text-zinc-400 mt-1">This page doesn&apos;t exist</p>
      </div>
      <Link href="/app">
        <Button>Back to Groups</Button>
      </Link>
    </div>
  );
}
