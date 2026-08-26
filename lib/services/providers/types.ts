/**
 * Provider boundaries for RGB++ data.
 *
 * The app used to talk to one service — btc-assets-api — for everything. That
 * service actually answers three unrelated questions, and they are moving to
 * three different owners:
 *
 *   RgbppIndexer     RGB++ state itself: which cells a BTC address owns, what a
 *                    cross-chain transaction has got to, an address's history.
 *                    Owned by rgbpp-indexer.
 *
 *   RgbppGateway     Everything Bitcoin (`/bitcoin/v1/*`) plus the SPV proof a
 *                    leap-to-CKB unlock needs (`/rgbpp/v1/btc-spv/proof`).
 *                    Will be owned by rgbpp-gateway, which does not exist yet —
 *                    btc-assets-api stands in for it today.
 *
 *   AssetMetadata    Human-facing token/DOB metadata: symbol, name, decimals,
 *                    cluster. No owner yet — btc-assets-api stands in today.
 *
 * Only these interfaces are allowed to leak into the rest of the app. Swapping a
 * stand-in for its real service should mean writing one new implementation file
 * and changing one line in `./index.ts` — nothing above this layer should notice.
 */
import type {
  BtcDataProvider,
  RgbppSpvProofProvider,
} from '@ckb-ccc/rgbpp';

// ─── Shared CKB/BTC shapes ──────────────────────────────────

export interface CkbScript {
  codeHash: string;
  hashType: 'type' | 'data' | 'data1' | 'data2';
  args: string;
}

export interface CkbOutPoint {
  txHash: string;
  index: number;
}

export interface BtcOutPoint {
  txid: string;
  vout: number;
}

// ─── Indexer domain ─────────────────────────────────────────

/**
 * Derived from the CKB fact and the Bitcoin observation together, so it can say
 * things neither chain knows alone.
 *
 * `pending_ckb` is the interesting one: the bound UTXO is spent on Bitcoin but no
 * CKB transition is indexed yet — either uncommitted, or inside the indexer's
 * reorg lag. Treat it as in-flight, not as a holding.
 */
export type CellStatus = 'live' | 'pending_ckb' | 'spent' | 'time_locked';

export type LockKind = 'rgbpp' | 'btc_time';

export type AssetKind =
  | 'xudt'
  | 'sudt'
  | 'spore'
  | 'spore_cluster'
  | 'unknown'
  | 'none';

/** What a CKB transaction did to RGB++ state. */
export type TransitionKind =
  | 'issuance'
  | 'transfer'
  | 'leap_to_ckb'
  | 'btc_time_unlock'
  | 'exit';

export const FUNGIBLE_ASSET_KINDS: readonly AssetKind[] = ['xudt', 'sudt'];

export interface BtcTimeBinding {
  /** Bitcoin confirmations required before the cell unlocks. */
  after: number;
  btcTxid: string;
  targetLock: CkbScript | null;
}

export interface BtcObservation {
  status: string;
  spender: string | null;
  height: number | null;
  observedAt: string | null;
  address: string | null;
}

/**
 * One RGB++ cell as the indexer sees it.
 *
 * Amounts and capacities are decimal strings on the wire because a u128 UDT
 * amount does not survive a JSON number; they arrive here as bigint.
 *
 * Note there is no lock script: the indexer reports `lockKind` and the binding,
 * and the lock is reconstructible from those (see `./data-source.ts`).
 */
export interface RgbppCell {
  ckbOutPoint: CkbOutPoint;
  lockKind: LockKind;
  /** Present for RGB++ locks. BTC time locks reference a transaction, not a UTXO. */
  btcOutPoint: BtcOutPoint | null;
  btcTime: BtcTimeBinding | null;
  typeHash: string | null;
  typeScript: CkbScript | null;
  assetKind: AssetKind;
  /** Absent for non-fungible assets and for plain capacity cells. */
  amount: bigint | null;
  capacity: bigint;
  data: string;
  status: CellStatus;
  created: { blockNumber: number; txIndex: number };
  consumed: { blockNumber: number; txHash: string } | null;
  btcObservation: BtcObservation | null;
}

export interface AssetBalance {
  assetKind: AssetKind;
  typeHash: string | null;
  cellCount: number;
  totalCapacity: bigint;
  /** Absent for non-fungible assets. */
  totalAmount: bigint | null;
}

/** Where an RGB++ transaction has got to, answered across both chains. */
export type TransactionResolution =
  | { state: 'unknown_btc_tx' }
  | { state: 'awaiting_ckb'; btcConfirmed: boolean; btcHeight: number | null }
  | { state: 'ckb_seen_above_lag'; cells: CkbOutPoint[]; indexedTo: number }
  | { state: 'indexed'; ckbTxHash: string; blockNumber: number };

export interface Transition {
  ckbTxHash: string;
  blockNumber: number;
  txIndex: number;
  blockTimestamp: string | null;
  kind: TransitionKind;
  btcTxid: string | null;
  inputCellCount: number;
  outputCellCount: number;
  commitmentStatus: string;
}

export interface TransactionStatus {
  btcTxid: string;
  resolution: TransactionResolution;
  transitions: Transition[];
  cells: RgbppCell[];
}

export interface ActivityBtc {
  txid: string;
  confirmed: boolean;
  blockHeight: number | null;
  blockHash: string | null;
  /** ISO-8601. Absent until the transaction is observed in a block. */
  blockTime: string | null;
  /** Satoshis. Absent when unobserved or when the data source omits it. */
  fee: bigint | null;
}

/** A cell an address gained or lost. */
export interface ActivityCell {
  ckbOutPoint: CkbOutPoint;
  btcOutPoint: BtcOutPoint | null;
  assetKind: AssetKind;
  typeHash: string | null;
  amount: bigint | null;
  capacity: bigint;
}

/** Net change in one asset, from this address's point of view. */
export interface AssetDelta {
  assetKind: AssetKind;
  typeHash: string | null;
  /** Signed. Absent for non-fungible assets. */
  amount: bigint | null;
  capacity: bigint;
  cellDelta: number;
}

export type ActivityDirection = 'in' | 'out' | 'self';

export interface ActivityEntry {
  ckbTxHash: string;
  blockNumber: number;
  txIndex: number;
  blockTimestamp: string | null;
  kind: TransitionKind;
  direction: ActivityDirection;
  /** Absent for issuance, or when the txid could not be derived. */
  btc: ActivityBtc | null;
  received: ActivityCell[];
  sent: ActivityCell[];
  deltas: AssetDelta[];
  /** Pass back as `cursor` to continue after this entry. */
  cursor: string;
}

export interface AddressActivity {
  address: string;
  entries: ActivityEntry[];
  /** Absent when the page reached the end of the history. */
  nextCursor: string | null;
  /**
   * Bindings anywhere in the index whose owning address is still unresolved.
   * Non-zero means backfill is running and any history may be incomplete.
   */
  unresolvedBindingsTotal: number;
}

/**
 * How far behind the indexed range is. An empty asset list means "nothing there"
 * only when the indexer has actually caught up — otherwise it means "not yet".
 */
export interface IndexerStatus {
  network: string;
  btcSource: string;
  indexedTo: number;
  chainTip: number | null;
  /** Blocks between the chain tip and what is queryable. */
  blocksBehind: number | null;
  reorgLag: number;
  lastError: string | null;
}

export interface AddressCellsOptions {
  /** Diff against the live UTXO set before answering. Defaults to on. */
  reconcile?: boolean;
  includeSpent?: boolean;
}

export interface ActivityOptions {
  cursor?: string;
  limit?: number;
}

/**
 * RGB++ state, indexed across both chains.
 *
 * Implemented by rgbpp-indexer. Nothing here is Bitcoin-generic or
 * presentation-facing: those belong to the gateway and to asset metadata.
 */
export interface RgbppIndexer {
  /** RGB++ cells bound to the address's current UTXO set. */
  getAddressCells(
    btcAddress: string,
    options?: AddressCellsOptions,
  ): Promise<RgbppCell[]>;

  /** Per-asset totals for the address, derived on read. */
  getAddressBalances(
    btcAddress: string,
    options?: { reconcile?: boolean; includePending?: boolean },
  ): Promise<AssetBalance[]>;

  /** Every cell bound to any output of one Bitcoin transaction. */
  getCellsByBtcTxid(btcTxid: string): Promise<RgbppCell[]>;

  /**
   * Cross-chain status of one RGB++ transaction. Re-observes the outpoints it
   * touches, and looks past the indexed range — this is the endpoint to poll
   * while a transaction is in flight.
   */
  getTransactionStatus(btcTxid: string): Promise<TransactionStatus>;

  /** RGB++ history for an address, newest first. */
  getAddressActivity(
    btcAddress: string,
    options?: ActivityOptions,
  ): Promise<AddressActivity>;

  getStatus(): Promise<IndexerStatus>;
}

// ─── Gateway domain ─────────────────────────────────────────

export interface BtcChainInfo {
  chain: string;
  blocks: number;
  bestblockhash: string;
  difficulty: number;
  mediantime: number;
}

/**
 * Bitcoin access plus the RGB++ SPV proof.
 *
 * Extends the SDK's own provider interfaces so a gateway can be handed straight
 * to `@ckb-ccc/rgbpp` without an adapter — see `./data-source.ts`.
 *
 * To be owned by rgbpp-gateway. `./gateway.ts` is the btc-assets-api stand-in.
 */
export interface RgbppGateway extends BtcDataProvider, RgbppSpvProofProvider {
  getChainInfo(): Promise<BtcChainInfo>;
}

// ─── Asset metadata domain ──────────────────────────────────

export interface XudtMetadata {
  type: 'xudt';
  symbol: string;
  name: string;
  decimal: number;
  typeHash?: string;
  totalSupply?: string;
  issuer?: string;
}

export interface SporeMetadata {
  type: 'spore';
  contentType: string;
  cluster?: { id: string; name: string; description: string };
}

export type AssetMetadata = XudtMetadata | SporeMetadata | null;

/**
 * Human-facing asset metadata — the part of an asset that is not derivable from
 * chain state. No owner yet; `./metadata.ts` is the btc-assets-api stand-in.
 */
export interface AssetMetadataProvider {
  /** Returns null when the asset is unknown to the provider. */
  getAssetMetadata(typeScript: CkbScript): Promise<AssetMetadata>;
}
