/**
 * RGB++ Assets API Client
 *
 * Connects to the RGB++ indexer at https://api-testnet.rgbpp.com
 * Ref: https://api-testnet.rgbpp.com/docs/static/index.html
 */

const BASE_URL = 'https://api-testnet.rgbpp.com';

// ─── Types ──────────────────────────────────────────────────

export interface CkbScript {
  codeHash: string;
  args: string;
  hashType: 'type' | 'data' | 'data1' | 'data2';
}

export interface CellOutput {
  capacity: string;
  lock: CkbScript;
  type?: CkbScript | null;
}

export interface RgbppCell {
  cellOutput: CellOutput;
  data: string;
  outPoint?: { txHash: string; index: string } | null;
  blockHash?: string;
  blockNumber?: string;
  txIndex?: string;
  typeHash?: string;
}

/** xUDT balance info from /rgbpp/v1/address/{addr}/balance */
export interface XudtBalance {
  symbol: string;
  name: string;
  decimal: number;
  total_supply?: string;
  issuer?: string;
  circulating_supply?: string;
  token_info_cell_type_hash?: string;
  type_hash: string;
  type_script: CkbScript;
  total_amount: string;
  available_amount: string;
  pending_amount: string;
}

export interface AddressBalance {
  address: string;
  xudt: XudtBalance[];
}

/** Asset type info from /rgbpp/v1/assets/type */
export interface XudtTypeInfo {
  type: 'xudt';
  symbol: string;
  name: string;
  decimal: number;
  total_supply?: string;
  issuer?: string;
  circulating_supply?: string;
  token_info_cell_type_hash?: string;
  type_hash: string;
  type_script: CkbScript;
}

export interface SporeTypeInfo {
  type: 'spore';
  contentType: string;
  cluster?: {
    id: string;
    name: string;
    description: string;
  };
}

export type AssetTypeInfo = XudtTypeInfo | SporeTypeInfo | null;

/** Transaction job status from /rgbpp/v1/transaction/{btc_txid}/job */
export type JobState = 'completed' | 'failed' | 'delayed' | 'active' | 'waiting';

export interface TransactionJob {
  state: JobState;
  attempts: number;
  failedReason?: string;
  lastError?: {
    attempt: number;
    error: string;
    timestamp: number;
  };
}

/** BTC balance from /bitcoin/v1/address/{addr}/balance */
export interface BtcBalance {
  address: string;
  total_satoshi: number;
  pending_satoshi: number;
  available_satoshi: number;
  dust_satoshi: number;
  rgbpp_satoshi: number;
  utxo_count: number;
}

// ─── API Functions ──────────────────────────────────────────

async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Get RGB++ assets (cells) bound to a BTC address.
 * GET /rgbpp/v1/address/{btc_address}/assets
 */
export async function getAddressAssets(btcAddress: string): Promise<RgbppCell[]> {
  return fetchApi<RgbppCell[]>(`/rgbpp/v1/address/${btcAddress}/assets`);
}

/**
 * Get RGB++ xUDT balance for a BTC address.
 * GET /rgbpp/v1/address/{btc_address}/balance
 */
export async function getAddressBalance(btcAddress: string): Promise<AddressBalance> {
  return fetchApi<AddressBalance>(`/rgbpp/v1/address/${btcAddress}/balance`);
}

/**
 * Get RGB++ asset type info by type script.
 * GET /rgbpp/v1/assets/type?type_script=...
 */
export async function getAssetTypeInfo(typeScript: CkbScript): Promise<AssetTypeInfo> {
  const encoded = encodeURIComponent(JSON.stringify(typeScript));
  return fetchApi<AssetTypeInfo>(`/rgbpp/v1/assets/type?type_script=${encoded}`);
}

/**
 * Get RGB++ assets by BTC txid.
 * GET /rgbpp/v1/assets/{btc_txid}
 */
export async function getAssetsByTxid(btcTxid: string): Promise<RgbppCell[]> {
  return fetchApi<RgbppCell[]>(`/rgbpp/v1/assets/${btcTxid}`);
}

/**
 * Get RGB++ transaction job status.
 * GET /rgbpp/v1/transaction/{btc_txid}/job
 */
export async function getTransactionJob(btcTxid: string): Promise<TransactionJob> {
  return fetchApi<TransactionJob>(`/rgbpp/v1/transaction/${btcTxid}/job`);
}

/**
 * Get CKB tx hash by BTC txid.
 * GET /rgbpp/v1/transaction/{btc_txid}
 */
export async function getCkbTxByBtcTxid(btcTxid: string): Promise<{ txhash: string }> {
  return fetchApi<{ txhash: string }>(`/rgbpp/v1/transaction/${btcTxid}`);
}

/**
 * Get BTC address balance.
 * GET /bitcoin/v1/address/{address}/balance
 */
export async function getBtcBalance(address: string): Promise<BtcBalance> {
  return fetchApi<BtcBalance>(`/bitcoin/v1/address/${address}/balance`);
}

/**
 * Get recommended BTC fees.
 * GET /bitcoin/v1/fees/recommended
 */
export async function getRecommendedFees(): Promise<{
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}> {
  return fetchApi(`/bitcoin/v1/fees/recommended`);
}

/**
 * Poll a transaction job until completion or failure.
 */
export async function pollTransactionJob(
  btcTxid: string,
  onUpdate: (job: TransactionJob) => void,
  intervalMs = 5000,
  maxAttempts = 120,
): Promise<TransactionJob> {
  for (let i = 0; i < maxAttempts; i++) {
    const job = await getTransactionJob(btcTxid);
    onUpdate(job);

    if (job.state === 'completed' || job.state === 'failed') {
      return job;
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  throw new Error(`Transaction job polling timed out after ${maxAttempts} attempts`);
}
