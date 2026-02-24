import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'blue' | 'purple' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
}

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: BadgeProps) {
  const variants = {
    default: 'bg-zinc-800 text-zinc-300',
    green: 'bg-green-400/10 text-green-400',
    red: 'bg-red-400/10 text-red-400',
    yellow: 'bg-yellow-400/10 text-yellow-400',
    blue: 'bg-blue-400/10 text-blue-400',
    purple: 'bg-violet-400/10 text-violet-400',
    gray: 'bg-zinc-700/50 text-zinc-400',
  };

  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </span>
  );
}
