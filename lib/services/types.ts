/* ============================================================
   Type Definitions for LeapFi
   ============================================================ */

/** Supported operations on RGB++ assets */
export type RgbppOperation =
  | 'leap-to-btc'
  | 'transfer-on-btc'
  | 'leap-to-ckb';

/** Asset location */
export type AssetLocation = 'ckb' | 'btc';

/** DOB chain filter */
export type DobChainFilter = 'btc' | 'ckb';

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
}

/** Spore asset representation */
export interface SporeAsset {
  type: 'spore';
  id: string;
  contentType: string;
  content: string;
  clusterId?: string;
  clusterName?: string;
  location: AssetLocation;
  capacity?: string;
  dobTraits?: DobTrait[];
  dobContent?: Record<string, unknown>;
  dobDecoded?: boolean;
  dobImageUri?: string;
  dobSvg?: string;
}

/** DOB trait from decoder */
export interface DobTrait {
  name: string;
  value: string | number;
  type: 'String' | 'Number';
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

/** Checkpoint for RGB++ transaction recovery */
export interface LeapToBtcCheckpoint {
  pipelineId: string;
  operation?: RgbppOperation;
  udtScriptArgs: string;
  amount: string;
  receivers?: { address: string; amount: string }[];
  btcTxId?: string;
  sealOutputIndex?: number;
  ckbTxHash?: string;
  serializedCkbPartialTx?: string;
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
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface UdtTransferOnBtcParams {
  udtScriptArgs: string;
  receivers: RgbppBtcReceiver[];
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface UdtLeapToCkbParams {
  udtScriptArgs: string;
  receivers: { address: string; amount: bigint }[];
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}

/** Parameters for Spore operations */
export interface SporeLeapToBtcParams {
  sporeTypeArgs: string;
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface SporeTransferOnBtcParams {
  transfers: { btcAddress: string; sporeTypeArgs: string }[];
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}

export interface SporeLeapToCkbParams {
  ckbAddress: string;
  sporeTypeArgs: string;
  signer?: import('@ckb-ccc/core').ccc.Signer;
  client?: import('@ckb-ccc/core').ccc.Client;
}
