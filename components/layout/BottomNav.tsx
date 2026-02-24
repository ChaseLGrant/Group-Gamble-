'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Layers, Trophy, User, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  groupId?: string;
}

export default function BottomNav({ groupId }: BottomNavProps) {
  const pathname = usePathname();

  // When in a group, show group-specific nav
  if (groupId) {
    const groupBase = `/g/${groupId}`;
    const items = [
      { href: '/app', label: 'Groups', icon: Home, exact: false, match: '/app', exactMatch: true },
      { href: groupBase, label: 'Feed', icon: Layers, exact: false, match: groupBase, exactMatch: false },
      { href: `${groupBase}/leaderboard`, label: 'Leaders', icon: Trophy, exact: false, match: `${groupBase}/leaderboard`, exactMatch: false },
      { href: '/settings', label: 'Profile', icon: User, exact: false, match: '/settings', exactMatch: false },
    ];

    return (
      <NavBar>
        {items.map((item) => {
          const isActive = item.exactMatch
            ? pathname === item.match
            : pathname.startsWith(item.match);
          return <NavLink key={item.label} {...item} isActive={isActive} />;
        })}
      </NavBar>
    );
  }

  // Default: app-level nav (groups + profile)
  const defaultItems = [
    { href: '/app', label: 'Groups', icon: Home, match: '/app', exactMatch: true },
    { href: '/settings', label: 'Profile', icon: User, match: '/settings', exactMatch: false },
  ];

  return (
    <NavBar>
      {defaultItems.map((item) => {
        const isActive = item.exactMatch
          ? pathname === item.match
          : pathname.startsWith(item.match);
        return <NavLink key={item.label} {...item} isActive={isActive} />;
      })}
    </NavBar>
  );
}

function NavBar({ children }: { children: React.ReactNode }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto">
      <div className="bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800 bottom-nav">
        <div className="flex items-center justify-around px-2 pt-2">
          {children}
        </div>
      </div>
    </nav>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  isActive,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: boolean;
  match?: string;
  exactMatch?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex flex-col items-center gap-1 px-4 py-2 rounded-xl min-w-[64px] transition-colors',
        isActive ? 'text-violet-400' : 'text-zinc-500 hover:text-zinc-300'
      )}
    >
      <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
      <span className={cn('text-[10px] font-medium', isActive && 'text-violet-400')}>
        {label}
      </span>
    </Link>
  );
}
