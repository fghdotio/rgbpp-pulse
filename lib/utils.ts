import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a balance with decimals
 */
export function formatBalance(balance: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const integerPart = balance / divisor;
  const fractionalPart = balance % divisor;
  
  if (fractionalPart === BigInt(0)) {
    return integerPart.toLocaleString();
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
  const trimmedFractional = fractionalStr.replace(/0+$/, '').slice(0, 4);
  
  return `${integerPart.toLocaleString()}.${trimmedFractional}`;
}

/**
 * Truncate an address or hash for display
 */
export function truncateAddress(address: string, startChars = 6, endChars = 4): string {
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Get the first letter of a token symbol for avatar display.
 */
export function getTokenInitial(symbol?: string, name?: string): string {
  return (symbol || name || "?")[0].toUpperCase();
}

/**
 * Generate a deterministic HSL background color from a token symbol.
 * Returns an object with `bg` (background) and `fg` (foreground text) CSS colors.
 *
 * Uses a simple djb2 hash → hue mapping with curated saturation & lightness
 * so every token gets a unique, visually distinct avatar color.
 */
export function getTokenColor(symbol?: string, name?: string): { bg: string; fg: string } {
  const raw = (symbol || name || "?").toUpperCase();
  // djb2 hash
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) | 0;
  }
  const hue = ((hash % 360) + 360) % 360;
  return {
    bg: `hsl(${hue} 55% 25%)`,
    fg: `hsl(${hue} 70% 75%)`,
  };
}

/**
 * Format a timestamp to relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
}
