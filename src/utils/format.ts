/**
 * Truncate a string showing first N and last M characters.
 */
export function formatAddress(address: string, front = 8, back = 6): string {
  if (address.length <= front + back + 3) return address;
  return `${address.slice(0, front)}...${address.slice(-back)}`;
}

/**
 * Format a bigint amount with fixed-point decimals.
 */
export function formatAmount(amount: bigint, decimals = 8): string {
  const str = amount.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, str.length - decimals) || '0';
  const decPart = str.slice(str.length - decimals).replace(/0+$/, '');
  return decPart ? `${addCommas(intPart)}.${decPart}` : addCommas(intPart);
}

function addCommas(n: string): string {
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Format a timestamp to relative time or date string.
 */
export function formatTimestamp(ts: number): string {
  const now = Date.now();
  const diff = now - ts;

  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;

  return new Date(ts).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get CKB explorer URL for a transaction.
 */
export function getCkbExplorerUrl(txHash: string, isTestnet = true): string {
  const base = isTestnet
    ? 'https://testnet.explorer.nervos.org'
    : 'https://explorer.nervos.org';
  return `${base}/transaction/${txHash}`;
}

/**
 * Get CKB explorer URL for an address.
 */
export function getCkbAddressExplorerUrl(address: string, isTestnet = true): string {
  const base = isTestnet
    ? 'https://testnet.explorer.nervos.org'
    : 'https://explorer.nervos.org';
  return `${base}/address/${address}`;
}

/**
 * Get BTC explorer URL for a transaction.
 */
export function getBtcExplorerUrl(txId: string, isTestnet = true): string {
  const base = isTestnet
    ? 'https://mempool.space/testnet'
    : 'https://mempool.space';
  return `${base}/tx/${txId}`;
}

/**
 * Get BTC explorer URL for an address.
 */
export function getBtcAddressExplorerUrl(address: string, isTestnet = true): string {
  const base = isTestnet
    ? 'https://mempool.space/testnet'
    : 'https://mempool.space';
  return `${base}/address/${address}`;
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate a short unique id for tracking.
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
