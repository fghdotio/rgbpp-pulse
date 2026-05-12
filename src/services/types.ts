/* ============================================================
   Type Definitions for RGB++ Pulse
   ============================================================ */

/** Supported operations on RGB++ assets */
export type RgbppOperation =
  | 'leap-to-btc'
  | 'transfer-on-btc'
  | 'leap-to-ckb';

/** Asset location */
export type AssetLocation = 'ckb' | 'btc';

/** UDT asset representation */
export interface UdtAsset {
  type: 'udt';
  name: string;
  symbol: string;
  decimals: number;
  balance: bigint;
  typeScriptArgs: string;
  typeScriptCodeHash: string;
  typeScriptHashType: string;
  location: AssetLocation;
  isMock?: boolean;
}

/** Spore asset representation */
export interface SporeAsset {
  type: 'spore';
  id: string;
  contentType: string;
  content: string; // base64 or URL
  clusterId?: string;
  clusterName?: string;
  location: AssetLocation;
  isMock?: boolean;
  /** Decoded DOB traits from dob-decoder-standalone-server */
  dobTraits?: import('./dob').DobTrait[];
  /** Decoded DOB content metadata (dna, block_number, etc.) */
  dobContent?: Record<string, unknown>;
  /** Whether DOB decoding has been attempted */
  dobDecoded?: boolean;
  /** DOB preview image URI (from prev.bg trait) — can be http, btcfs://, ipfs:// */
  dobImageUri?: string;
  /** Rendered SVG string from @ckb-ccc/dob-render */
  dobSvg?: string;
}

/** Union type for all RGB++ assets */
export type RgbppAsset = UdtAsset | SporeAsset;

/** Transaction pipeline step status */
export type StepStatus = 'pending' | 'active' | 'done' | 'error';

/** A single step in the transaction pipeline */
export interface TransactionStep {
  id: string;
  label: string;
  status: StepStatus;
  timestamp?: number;
  txHash?: string;
  chain?: 'ckb' | 'btc';
  error?: string;
  detail?: string;
}

/** Overall transaction pipeline */
export interface TransactionPipeline {
  id: string;
  operation: RgbppOperation;
  assetType: 'udt' | 'spore';
  assetName: string;
  steps: TransactionStep[];
  createdAt: number;
  completedAt?: number;
  status: 'pending' | 'active' | 'completed' | 'error';
}

/**
 * Checkpoint for RGB++ transaction recovery.
 *
 * Persisted to localStorage at critical points (after BTC broadcast,
 * after CKB broadcast) so the transaction can be resumed after a page refresh.
 *
 * Supports all three UDT operations:
 *
 * **leap-to-btc** (operation='leap-to-btc' or undefined for legacy):
 * - lastCompletedStep=1: BTC broadcast done → resume waitForConfirmation + CKB
 * - lastCompletedStep=2: BTC confirmed → redo CKB side from scratch
 * - lastCompletedStep=6: CKB broadcast done → resume waitTransaction
 *
 * **transfer-on-btc** (operation='transfer-on-btc'):
 * - lastCompletedStep=3: BTC broadcast done → deserialize persisted CKB partial tx, inject btcTxId, sign+send
 * - lastCompletedStep=6: CKB broadcast done → resume waitTransaction
 *
 * **leap-to-ckb** (operation='leap-to-ckb'):
 * - lastCompletedStep=4: BTC broadcast done → deserialize persisted CKB partial tx, inject btcTxId, sign+send
 * - lastCompletedStep=7: CKB broadcast done → resume waitTransaction
 */
export interface LeapToBtcCheckpoint {
  pipelineId: string;
  /** Identifies which operation this checkpoint belongs to. Legacy leap-to-btc checkpoints may omit this. */
  operation?: RgbppOperation;
  udtScriptArgs: string;
  amount: string; // bigint serialized as string
  /** Serialized receivers for transfer-on-btc and leap-to-ckb */
  receivers?: { address: string; amount: string }[];
  btcTxId?: string;
  sealOutputIndex?: number;
  ckbTxHash?: string;
  /**
   * Serialized `indexedCkbPartialTx` (via ccc.stringify) from buildPsbt.
   *
   * The BTC TX contains a commitment (hash) to the CKB partial TX structure.
   * On recovery, the exact same CKB partial TX must be used — rebuilding it
   * risks different UTXO selection, which would produce a mismatched commitment
   * and cause the RGB++ on-chain verifier to reject the CKB TX.
   */
  serializedCkbPartialTx?: string;
  /** Index of the last fully completed pipeline step */
  lastCompletedStep: number;
  createdAt: number;
}

/** BTC receiver for RGB++ operations */
export interface RgbppBtcReceiver {
  address: string;
  amount: bigint;
}

/** Parameters for UDT operations */
export interface UdtLeapToBtcParams {
  udtScriptArgs: string;
  amount: bigint;
  /** The CCC signer (must be a BTC signer for leap-to-btc) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface UdtTransferOnBtcParams {
  udtScriptArgs: string;
  receivers: RgbppBtcReceiver[];
  /** The CCC signer (must be a BTC signer for transfer-on-btc) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface UdtLeapToCkbParams {
  udtScriptArgs: string;
  receivers: { address: string; amount: bigint }[];
  /** The CCC signer (must be a BTC signer for leap-to-ckb) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

/** Parameters for Spore operations */
export interface SporeLeapToBtcParams {
  sporeTypeArgs: string;
  /** The CCC signer (must be a BTC signer for leap-to-btc) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface SporeTransferOnBtcParams {
  transfers: { btcAddress: string; sporeTypeArgs: string }[];
  /** The CCC signer (must be a BTC signer for transfer-on-btc) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface SporeLeapToCkbParams {
  ckbAddress: string;
  sporeTypeArgs: string;
  /** The CCC signer (must be a BTC signer for leap-to-ckb) */
  signer?: import('@ckb-ccc/core').ccc.Signer;
  /** The CKB client instance */
  client?: import('@ckb-ccc/core').ccc.Client;
}

/** Navigation view */
export type AppView = 'portfolio' | 'udt' | 'spore' | 'transactions';
