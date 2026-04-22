/* ============================================================
   Type Definitions for RGB++ Asset Manager
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

/** BTC receiver for RGB++ operations */
export interface RgbppBtcReceiver {
  address: string;
  amount: bigint;
}

/** Parameters for UDT operations */
export interface UdtLeapToBtcParams {
  udtScriptArgs: string;
  amount: bigint;
}

export interface UdtTransferOnBtcParams {
  udtScriptArgs: string;
  receivers: RgbppBtcReceiver[];
}

export interface UdtLeapToCkbParams {
  udtScriptArgs: string;
  receivers: { address: string; amount: bigint }[];
}

/** Parameters for Spore operations */
export interface SporeLeapToBtcParams {
  sporeTypeArgs: string;
}

export interface SporeTransferOnBtcParams {
  transfers: { btcAddress: string; sporeTypeArgs: string }[];
}

export interface SporeLeapToCkbParams {
  ckbAddress: string;
  sporeTypeArgs: string;
}

/** Navigation view */
export type AppView = 'portfolio' | 'udt' | 'spore' | 'transactions';
