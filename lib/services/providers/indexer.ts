/**
 * RgbppIndexer backed by rgbpp-indexer.
 *
 * https://github.com/fghdotio/rgbpp-indexer-opus5high
 *
 * This is the one provider that already has its real owner. Everything here maps
 * the indexer's wire shapes onto the app's domain types: snake_case → camelCase,
 * and decimal strings → bigint (a u128 UDT amount does not survive a JSON
 * number, which is why they are strings on the wire in the first place).
 */
import { createHttpClient, toBigInt, toBigIntOr } from './http';
import type {
  ActivityCell,
  ActivityDirection,
  ActivityEntry,
  AddressActivity,
  AssetBalance,
  AssetDelta,
  AssetKind,
  CellStatus,
  CkbOutPoint,
  CkbScript,
  IndexerStatus,
  LockKind,
  RgbppCell,
  RgbppIndexer,
  TransactionResolution,
  TransactionStatus,
  Transition,
  TransitionKind,
} from './types';

// ─── Wire shapes ────────────────────────────────────────────

interface WireScript {
  code_hash: string;
  hash_type: string;
  args: string;
}

interface WireCkbOutPoint {
  tx_hash: string;
  index: number;
}

interface WireBtcOutPoint {
  txid: string;
  vout: number;
}

interface WireCell {
  ckb_out_point: WireCkbOutPoint;
  lock_kind: string;
  btc_out_point: WireBtcOutPoint | null;
  btc_time: { after: number; btc_txid: string; target_lock: WireScript | null } | null;
  type_hash: string | null;
  type_script: WireScript | null;
  asset_kind: string;
  amount: string | null;
  capacity: string;
  data: string;
  status: string;
  created: { block_number: number; tx_index: number };
  consumed: { block_number: number; tx_hash: string } | null;
  btc_observation: {
    status: string;
    spender: string | null;
    height: number | null;
    observed_at: string | null;
    address: string | null;
  } | null;
}

interface WireAddressAssets {
  address: string;
  cells: WireCell[];
}

interface WireAssetBalance {
  asset_kind: string;
  type_hash: string | null;
  cell_count: number;
  total_capacity: string;
  total_amount: string | null;
}

interface WireTransition {
  ckb_tx_hash: string;
  block_number: number;
  tx_index: number;
  block_timestamp: string | null;
  kind: string;
  btc_txid: string | null;
  input_cell_count: number;
  output_cell_count: number;
  commitment_status: string;
}

/** Externally tagged on `state` — see TransitionResolution in the indexer. */
interface WireResolution {
  state: string;
  btc_confirmed?: boolean;
  btc_height?: number | null;
  cells?: WireCkbOutPoint[];
  indexed_to?: number;
  ckb_tx_hash?: string;
  block_number?: number;
}

interface WireTransactionStatus {
  btc_txid: string;
  resolution: WireResolution;
  transitions: WireTransition[];
  cells: WireCell[];
}

interface WireActivityCell {
  ckb_out_point: WireCkbOutPoint;
  btc_out_point: WireBtcOutPoint | null;
  asset_kind: string;
  type_hash: string | null;
  amount: string | null;
  capacity: string;
}

interface WireActivityEntry {
  ckb_tx_hash: string;
  block_number: number;
  tx_index: number;
  block_timestamp: string | null;
  kind: string;
  direction: string;
  btc: {
    txid: string;
    confirmed: boolean;
    block_height: number | null;
    block_hash: string | null;
    block_time: string | null;
    fee: string | null;
  } | null;
  received: WireActivityCell[];
  sent: WireActivityCell[];
  deltas: {
    asset_kind: string;
    type_hash: string | null;
    amount: string | null;
    capacity: string;
    cell_delta: number;
  }[];
  cursor: string;
}

interface WireAddressActivity {
  address: string;
  entries: WireActivityEntry[];
  next_cursor: string | null;
  unresolved_bindings_total: number;
}

interface WireStatus {
  network: string;
  btc_source: string;
  ckb: {
    indexed_to: number;
    chain_tip: number | null;
    reorg_lag: number;
    blocks_behind: number | null;
    last_error: string | null;
  };
}

// ─── Mapping ────────────────────────────────────────────────

const CELL_STATUSES: readonly string[] = ['live', 'pending_ckb', 'spent', 'time_locked'];
const ASSET_KINDS: readonly string[] = [
  'xudt',
  'sudt',
  'spore',
  'spore_cluster',
  'unknown',
  'none',
];
const TRANSITION_KINDS: readonly string[] = [
  'issuance',
  'transfer',
  'leap_to_ckb',
  'btc_time_unlock',
  'exit',
];

function toScript(wire: WireScript | null): CkbScript | null {
  if (!wire) return null;
  return {
    codeHash: wire.code_hash,
    hashType: wire.hash_type as CkbScript['hashType'],
    args: wire.args,
  };
}

function toOutPoint(wire: WireCkbOutPoint): CkbOutPoint {
  return { txHash: wire.tx_hash, index: wire.index };
}

function toAssetKind(value: string): AssetKind {
  return (ASSET_KINDS.includes(value) ? value : 'unknown') as AssetKind;
}

function toCellStatus(value: string): CellStatus {
  // An unrecognised status must not read as a holding, so fall back to spent.
  return (CELL_STATUSES.includes(value) ? value : 'spent') as CellStatus;
}

function toTransitionKind(value: string): TransitionKind {
  return (TRANSITION_KINDS.includes(value) ? value : 'exit') as TransitionKind;
}

/**
 * `ActivityDirection::Self_` serialises as `self_` under serde's snake_case
 * rule, so accept both spellings rather than depending on that detail.
 */
function toDirection(value: string): ActivityDirection {
  if (value === 'in') return 'in';
  if (value === 'out') return 'out';
  return 'self';
}

function toCell(wire: WireCell): RgbppCell {
  return {
    ckbOutPoint: toOutPoint(wire.ckb_out_point),
    lockKind: (wire.lock_kind === 'btc_time' ? 'btc_time' : 'rgbpp') as LockKind,
    btcOutPoint: wire.btc_out_point
      ? { txid: wire.btc_out_point.txid, vout: wire.btc_out_point.vout }
      : null,
    btcTime: wire.btc_time
      ? {
          after: wire.btc_time.after,
          btcTxid: wire.btc_time.btc_txid,
          targetLock: toScript(wire.btc_time.target_lock),
        }
      : null,
    typeHash: wire.type_hash,
    typeScript: toScript(wire.type_script),
    assetKind: toAssetKind(wire.asset_kind),
    amount: toBigInt(wire.amount),
    capacity: toBigIntOr(wire.capacity, BigInt(0)),
    data: wire.data,
    status: toCellStatus(wire.status),
    created: {
      blockNumber: wire.created.block_number,
      txIndex: wire.created.tx_index,
    },
    consumed: wire.consumed
      ? {
          blockNumber: wire.consumed.block_number,
          txHash: wire.consumed.tx_hash,
        }
      : null,
    btcObservation: wire.btc_observation
      ? {
          status: wire.btc_observation.status,
          spender: wire.btc_observation.spender,
          height: wire.btc_observation.height,
          observedAt: wire.btc_observation.observed_at,
          address: wire.btc_observation.address,
        }
      : null,
  };
}

function toBalance(wire: WireAssetBalance): AssetBalance {
  return {
    assetKind: toAssetKind(wire.asset_kind),
    typeHash: wire.type_hash,
    cellCount: wire.cell_count,
    totalCapacity: toBigIntOr(wire.total_capacity, BigInt(0)),
    totalAmount: toBigInt(wire.total_amount),
  };
}

function toTransition(wire: WireTransition): Transition {
  return {
    ckbTxHash: wire.ckb_tx_hash,
    blockNumber: wire.block_number,
    txIndex: wire.tx_index,
    blockTimestamp: wire.block_timestamp,
    kind: toTransitionKind(wire.kind),
    btcTxid: wire.btc_txid,
    inputCellCount: wire.input_cell_count,
    outputCellCount: wire.output_cell_count,
    commitmentStatus: wire.commitment_status,
  };
}

function toResolution(wire: WireResolution): TransactionResolution {
  switch (wire.state) {
    case 'awaiting_ckb':
      return {
        state: 'awaiting_ckb',
        btcConfirmed: wire.btc_confirmed ?? false,
        btcHeight: wire.btc_height ?? null,
      };
    case 'ckb_seen_above_lag':
      return {
        state: 'ckb_seen_above_lag',
        cells: (wire.cells ?? []).map(toOutPoint),
        indexedTo: wire.indexed_to ?? 0,
      };
    case 'indexed':
      return {
        state: 'indexed',
        ckbTxHash: wire.ckb_tx_hash ?? '',
        blockNumber: wire.block_number ?? 0,
      };
    default:
      return { state: 'unknown_btc_tx' };
  }
}

function toActivityCell(wire: WireActivityCell): ActivityCell {
  return {
    ckbOutPoint: toOutPoint(wire.ckb_out_point),
    btcOutPoint: wire.btc_out_point
      ? { txid: wire.btc_out_point.txid, vout: wire.btc_out_point.vout }
      : null,
    assetKind: toAssetKind(wire.asset_kind),
    typeHash: wire.type_hash,
    amount: toBigInt(wire.amount),
    capacity: toBigIntOr(wire.capacity, BigInt(0)),
  };
}

function toDelta(wire: WireActivityEntry['deltas'][number]): AssetDelta {
  return {
    assetKind: toAssetKind(wire.asset_kind),
    typeHash: wire.type_hash,
    amount: toBigInt(wire.amount),
    capacity: toBigIntOr(wire.capacity, BigInt(0)),
    cellDelta: wire.cell_delta,
  };
}

function toActivityEntry(wire: WireActivityEntry): ActivityEntry {
  return {
    ckbTxHash: wire.ckb_tx_hash,
    blockNumber: wire.block_number,
    txIndex: wire.tx_index,
    blockTimestamp: wire.block_timestamp,
    kind: toTransitionKind(wire.kind),
    direction: toDirection(wire.direction),
    btc: wire.btc
      ? {
          txid: wire.btc.txid,
          confirmed: wire.btc.confirmed,
          blockHeight: wire.btc.block_height,
          blockHash: wire.btc.block_hash,
          blockTime: wire.btc.block_time,
          fee: toBigInt(wire.btc.fee),
        }
      : null,
    received: wire.received.map(toActivityCell),
    sent: wire.sent.map(toActivityCell),
    deltas: wire.deltas.map(toDelta),
    cursor: wire.cursor,
  };
}

// ─── Implementation ─────────────────────────────────────────

export function createRgbppIndexer(baseUrl: string): RgbppIndexer {
  const http = createHttpClient(baseUrl);

  return {
    async getAddressCells(btcAddress, options) {
      const res = await http.get<WireAddressAssets>(
        `/v1/rgbpp/assets/by-btc-address/${encodeURIComponent(btcAddress)}`,
        {
          reconcile: options?.reconcile,
          include_spent: options?.includeSpent,
        },
      );
      return (res.cells ?? []).map(toCell);
    },

    async getAddressBalances(btcAddress, options) {
      const res = await http.get<{ assets: WireAssetBalance[] }>(
        `/v1/rgbpp/balance/by-btc-address/${encodeURIComponent(btcAddress)}`,
        {
          reconcile: options?.reconcile,
          include_pending: options?.includePending,
        },
      );
      return (res.assets ?? []).map(toBalance);
    },

    async getCellsByBtcTxid(btcTxid) {
      const res = await http.get<WireCell[]>(`/v1/rgbpp/cells/by-btc-txid/${btcTxid}`);
      return (res ?? []).map(toCell);
    },

    async getTransactionStatus(btcTxid): Promise<TransactionStatus> {
      const res = await http.get<WireTransactionStatus>(
        `/v1/rgbpp/transactions/${btcTxid}`,
      );
      return {
        btcTxid: res.btc_txid,
        resolution: toResolution(res.resolution),
        transitions: (res.transitions ?? []).map(toTransition),
        cells: (res.cells ?? []).map(toCell),
      };
    },

    async getAddressActivity(btcAddress, options): Promise<AddressActivity> {
      const res = await http.get<WireAddressActivity>(
        `/v1/rgbpp/activity/by-btc-address/${encodeURIComponent(btcAddress)}`,
        { cursor: options?.cursor, limit: options?.limit },
      );
      return {
        address: res.address,
        entries: (res.entries ?? []).map(toActivityEntry),
        nextCursor: res.next_cursor ?? null,
        unresolvedBindingsTotal: res.unresolved_bindings_total ?? 0,
      };
    },

    async getStatus(): Promise<IndexerStatus> {
      const res = await http.get<WireStatus>('/status');
      return {
        network: res.network,
        btcSource: res.btc_source,
        indexedTo: res.ckb.indexed_to,
        chainTip: res.ckb.chain_tip,
        blocksBehind: res.ckb.blocks_behind,
        reorgLag: res.ckb.reorg_lag,
        lastError: res.ckb.last_error,
      };
    },
  };
}
