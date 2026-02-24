'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  backHref?: string;
  right?: React.ReactNode;
  transparent?: boolean;
  className?: string;
}

export default function Header({
  title,
  subtitle,
  backHref,
  right,
  transparent = false,
  className,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center justify-between px-4 h-14',
        !transparent && 'bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800',
        className
      )}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-1 text-zinc-400 hover:text-zinc-100 -ml-1 pr-2"
          >
            <ChevronLeft size={20} />
            <span className="text-sm">Back</span>
          </Link>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center */}
      <div className="absolute left-1/2 -translate-x-1/2 text-center min-w-0 max-w-[60%]">
        {title && (
          <h1 className="font-bold text-zinc-100 truncate text-[15px]">{title}</h1>
        )}
        {subtitle && (
          <p className="text-xs text-zinc-500 truncate">{subtitle}</p>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 min-w-0 justify-end">
        {right ?? <div className="w-10" />}
      </div>
    </header>
  );
}

/** Simple branded header for the landing page */
export function BrandHeader() {
  return (
    <div className="flex items-center justify-center pt-16 pb-8">
      <div className="text-center">
        {/* Glowing dice icon */}
        <div className="relative inline-block mb-4">
          <div className="absolute inset-0 blur-2xl bg-violet-500/30 rounded-full animate-glow" />
          <span className="relative text-5xl block animate-float">🎲</span>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-gradient-premium animate-shimmer">
          Group Gamble
        </h1>
        <p className="text-zinc-500 text-sm mt-2 tracking-wide uppercase font-medium">
          Play-money predictions with friends
        </p>
      </div>
    </div>
  );
}
