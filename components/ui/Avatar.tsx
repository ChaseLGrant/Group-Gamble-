import Image from 'next/image';
import { cn, getInitials } from '@/lib/utils';

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  xs: { px: 24, cls: 'h-6 w-6 text-xs' },
  sm: { px: 32, cls: 'h-8 w-8 text-xs' },
  md: { px: 40, cls: 'h-10 w-10 text-sm' },
  lg: { px: 56, cls: 'h-14 w-14 text-base' },
};

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const { px, cls } = sizeMap[size];

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden flex-shrink-0', cls, className)}>
        <Image
          src={src}
          alt={name}
          width={px}
          height={px}
          className="object-cover"
        />
      </div>
    );
  }

  // Initials fallback with deterministic color based on name
  const colors = [
    'bg-violet-600',
    'bg-blue-600',
    'bg-green-600',
    'bg-amber-600',
    'bg-pink-600',
    'bg-teal-600',
    'bg-indigo-600',
    'bg-orange-600',
  ];
  const colorIndex = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % colors.length;

  return (
    <div
      className={cn(
        'rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white',
        cls,
        colors[colorIndex],
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}
