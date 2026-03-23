import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isPast } from 'date-fns';
import type { PredictionStatus, PredictionType, WagerPick } from './types';

/** Merge Tailwind classes without conflicts */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date relative to now (e.g. "5 minutes ago") */
export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Format a date for display */
export function formatDate(date: string | Date, fmt = 'MMM d, h:mm a'): string {
  return format(new Date(date), fmt);
}

/** Check if a date is in the past */
export function isExpired(date: string | Date | null | undefined): boolean {
  if (!date) return false;
  return isPast(new Date(date));
}

/** Check if a prediction is wagerable */
export function isPredictionOpen(
  status: PredictionStatus,
  closeTime: string | null | undefined
): boolean {
  if (status !== 'OPEN') return false;
  if (closeTime && isExpired(closeTime)) return false;
  return true;
}

/** Get a human-readable label for a prediction status */
export function statusLabel(status: PredictionStatus): string {
  const labels: Record<PredictionStatus, string> = {
    OPEN: 'Open',
    LOCKED: 'Locked',
    SETTLED: 'Settled',
    CANCELED: 'Canceled',
  };
  return labels[status];
}

/** Get Tailwind color classes for a status */
export function statusColor(status: PredictionStatus): string {
  const colors: Record<PredictionStatus, string> = {
    OPEN: 'text-green-400 bg-green-400/10',
    LOCKED: 'text-yellow-400 bg-yellow-400/10',
    SETTLED: 'text-blue-400 bg-blue-400/10',
    CANCELED: 'text-zinc-500 bg-zinc-500/10',
  };
  return colors[status];
}

/** Get Tailwind color classes for a wager pick */
export function pickColor(pick: WagerPick | string): string {
  const colors: Record<string, string> = {
    YES: 'text-green-400',
    NO: 'text-red-400',
    OVER: 'text-green-400',
    UNDER: 'text-red-400',
  };
  return colors[pick] ?? 'text-zinc-400';
}

/** Get background color classes for a wager pick button */
export function pickBgColor(pick: WagerPick | string, selected: boolean): string {
  if (!selected) return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
  const colors: Record<string, string> = {
    YES: 'bg-green-500/20 text-green-400 border border-green-500/40',
    NO: 'bg-red-500/20 text-red-400 border border-red-500/40',
    OVER: 'bg-green-500/20 text-green-400 border border-green-500/40',
    UNDER: 'bg-red-500/20 text-red-400 border border-red-500/40',
  };
  return colors[pick] ?? 'bg-violet-500/20 text-violet-400 border border-violet-500/40';
}

/** Format points with commas */
export function formatPoints(points: number): string {
  return points.toLocaleString();
}

/** Calculate win percentage */
export function winRate(wins: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((wins / total) * 100);
}

/** Get picks for a prediction type */
export function getPicks(type: PredictionType): WagerPick[] {
  return type === 'YES_NO' ? ['YES', 'NO'] : ['OVER', 'UNDER'];
}

/** Format an over/under line with optional unit */
export function formatLine(line: number, unit?: string | null): string {
  const formatted = line % 1 === 0 ? `${line}.0` : `${line}`;
  return unit ? `${formatted} ${unit}` : formatted;
}

/** Generate a share URL for a group invite */
export function inviteUrl(inviteCode: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return `${base}/invite/${inviteCode}`;
}

/** Compute pool totals from wagers */
export function computePool(wagers: Array<{ pick: string; amount_points: number }>) {
  const pool = { yes_points: 0, no_points: 0, over_points: 0, under_points: 0, total_points: 0 };
  for (const w of wagers) {
    if (w.pick === 'YES') pool.yes_points += w.amount_points;
    else if (w.pick === 'NO') pool.no_points += w.amount_points;
    else if (w.pick === 'OVER') pool.over_points += w.amount_points;
    else if (w.pick === 'UNDER') pool.under_points += w.amount_points;
    pool.total_points += w.amount_points;
  }
  return pool;
}

/** Estimate payout if you win, given pool data */
export function estimatePayout(
  myStake: number,
  mySidePool: number,
  otherSidePool: number
): number {
  if (mySidePool === 0) return myStake;
  const winnings = Math.floor(otherSidePool * (myStake / mySidePool));
  return myStake + winnings;
}

/** Truncate text with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}

/** Get initials for avatar fallback */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Safe JSON parse with fallback */
export function safeJson<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

/** Phone validation regex: 7–15 digits with optional leading + */
export const PHONE_REGEX = /^\+?\d{7,15}$/;

/** Strip non-digit characters (except leading +) from a phone string */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[^+\d]/g, '');
}
