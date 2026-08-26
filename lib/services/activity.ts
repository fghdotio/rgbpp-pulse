/**
 * Presentation helpers for indexer activity entries.
 *
 * The indexer already says what a transaction did — `kind` is derived from the
 * actual RGB++ state transition — so the app no longer sniffs lock code hashes
 * on inputs and outputs to guess. These functions only translate its vocabulary
 * into the app's.
 */
import type { ActivityEntry, TransitionKind } from './providers';
import type { RgbppOperation } from './types';

/**
 * How an operation reads to the user. `exit` has no user-facing operation: it
 * is a transaction that consumed RGB++ cells and produced none, so nothing in
 * the app's three-operation vocabulary describes it.
 */
export type ActivityOperation = RgbppOperation | 'exit';

const OPERATION_BY_KIND: Record<TransitionKind, ActivityOperation> = {
  // Created RGB++ cells without consuming any: issuance, or a leap from CKB.
  // Either way, the asset arrived on Bitcoin.
  issuance: 'leap-to-btc',
  transfer: 'transfer-on-btc',
  leap_to_ckb: 'leap-to-ckb',
  // The BTC time lock releasing is the tail of a leap to CKB, not its own move.
  btc_time_unlock: 'leap-to-ckb',
  exit: 'exit',
};

export function activityOperation(entry: ActivityEntry): ActivityOperation {
  return OPERATION_BY_KIND[entry.kind];
}

/**
 * Which kind of asset moved, for the badge on a history row.
 *
 * Returns null for a transaction that moved only capacity — there is no asset
 * to name, and a wrong badge is worse than none.
 */
export function activityAssetType(entry: ActivityEntry): 'UDT' | 'DOB' | null {
  const kinds = [...entry.received, ...entry.sent].map((cell) => cell.assetKind);
  if (kinds.includes('spore')) return 'DOB';
  if (kinds.includes('xudt') || kinds.includes('sudt')) return 'UDT';
  return null;
}

/**
 * Milliseconds for sorting and relative-time display.
 *
 * Prefers the Bitcoin block time — that is when the user's transaction actually
 * settled — and falls back to the CKB block timestamp for entries with no
 * resolved Bitcoin side (issuance, most often).
 */
export function activityTimestamp(entry: ActivityEntry): number | null {
  const iso = entry.btc?.blockTime ?? entry.blockTimestamp;
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/** Fee in satoshis, or null when the transaction has not been observed yet. */
export function activityFee(entry: ActivityEntry): number | null {
  const fee = entry.btc?.fee;
  return fee === null || fee === undefined ? null : Number(fee);
}

/**
 * Whether the transaction has settled.
 *
 * An entry only exists because a CKB transition was indexed, and the indexer
 * stays behind the tip by its reorg lag — so anything listed here is confirmed
 * on CKB. `btc.confirmed` is what is still in question.
 */
export function activityConfirmed(entry: ActivityEntry): boolean {
  return entry.btc?.confirmed ?? true;
}
