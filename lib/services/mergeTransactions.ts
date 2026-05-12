/**
 * Merge local TransactionPipeline data with remote API activity
 * into a unified transaction list for the Transactions page.
 */
import type { TransactionPipeline, RgbppOperation } from './types';
import type { ActivityTransaction } from './api';

/** Unified transaction representation */
export interface UnifiedTransaction {
  /** Primary key — BTC txid, or `local:<pipelineId>` for pipelines without a BTC tx yet */
  key: string;
  /** BTC txid (empty string if not yet available) */
  btcTxId: string;
  /** CKB tx hash (if available) */
  ckbTxHash?: string;
  /** Where this data comes from */
  source: 'local' | 'remote' | 'both';
  /** Local pipeline (if exists) */
  localPipeline?: TransactionPipeline;
  /** Remote activity data (if exists) */
  remoteActivity?: ActivityTransaction;
  /** Simplified status */
  status: 'pending' | 'active' | 'confirmed' | 'error';
  /** Sorting timestamp (ms) */
  timestamp: number;
  /** Operation label */
  operationType: RgbppOperation | 'rgbpp' | 'unknown';
}

/**
 * Extract the BTC txid from a local pipeline's steps.
 * Looks for the first completed step with chain='btc' and a txHash.
 */
function extractBtcTxId(pipeline: TransactionPipeline): string | undefined {
  for (const step of pipeline.steps) {
    if (step.chain === 'btc' && step.txHash && step.status === 'done') {
      return step.txHash;
    }
  }
  return undefined;
}

/**
 * Extract the CKB tx hash from a local pipeline's steps.
 */
function extractCkbTxHash(pipeline: TransactionPipeline): string | undefined {
  for (const step of pipeline.steps) {
    if (step.chain === 'ckb' && step.txHash && step.status === 'done') {
      return step.txHash;
    }
  }
  return undefined;
}

/**
 * Map pipeline status to unified status.
 */
function mapPipelineStatus(status: TransactionPipeline['status']): UnifiedTransaction['status'] {
  switch (status) {
    case 'completed': return 'confirmed';
    case 'error': return 'error';
    case 'active': return 'active';
    case 'pending': return 'pending';
    default: return 'pending';
  }
}

/**
 * Merge local pipelines with remote activity into a single sorted list.
 *
 * De-duplication is done by BTC txid: if both sources have the same txid,
 * the entry is marked source='both' with data from both sides.
 */
export function mergeTransactions(
  pipelines: TransactionPipeline[],
  activityTxs: ActivityTransaction[],
): UnifiedTransaction[] {
  const result = new Map<string, UnifiedTransaction>();

  // 1. Inject local pipelines
  for (const p of pipelines) {
    const btcTxId = extractBtcTxId(p);
    const ckbTxHash = extractCkbTxHash(p);

    if (btcTxId) {
      result.set(btcTxId, {
        key: btcTxId,
        btcTxId,
        ckbTxHash,
        source: 'local',
        localPipeline: p,
        status: mapPipelineStatus(p.status),
        timestamp: p.createdAt,
        operationType: p.operation,
      });
    } else {
      // Pipeline hasn't produced a BTC tx yet (e.g. building CKB tx for leap-to-btc)
      const localKey = `local:${p.id}`;
      result.set(localKey, {
        key: localKey,
        btcTxId: '',
        ckbTxHash,
        source: 'local',
        localPipeline: p,
        status: mapPipelineStatus(p.status),
        timestamp: p.createdAt,
        operationType: p.operation,
      });
    }
  }

  // 2. Merge remote activity
  for (const tx of activityTxs) {
    const existing = result.get(tx.btcTx.txid);
    if (existing) {
      // Same transaction exists locally — merge
      existing.source = 'both';
      existing.remoteActivity = tx;
      // Fill in CKB tx hash from remote if local didn't have one
      if (!existing.ckbTxHash && tx.isomorphicTx?.ckbTx?.hash) {
        existing.ckbTxHash = tx.isomorphicTx.ckbTx.hash;
      }
      // Use remote confirmed status as ground truth
      if (tx.btcTx.status.confirmed) {
        if (!tx.isRgbpp || tx.isomorphicTx?.status.confirmed) {
          existing.status = 'confirmed';
        }
      }
    } else {
      // Remote-only transaction
      // Try to extract CKB tx hash from remote isomorphicTx
      const remoteCkbHash = tx.isomorphicTx?.ckbTx?.hash;
      result.set(tx.btcTx.txid, {
        key: tx.btcTx.txid,
        btcTxId: tx.btcTx.txid,
        ckbTxHash: remoteCkbHash,
        source: 'remote',
        remoteActivity: tx,
        status: tx.btcTx.status.confirmed ? 'confirmed' : 'pending',
        timestamp: tx.btcTx.status.block_time
          ? tx.btcTx.status.block_time * 1000
          : Date.now(),
        operationType: tx.isRgbpp ? 'rgbpp' : 'unknown',
      });
    }
  }

  // 3. Sort by timestamp descending (newest first)
  return [...result.values()].sort((a, b) => b.timestamp - a.timestamp);
}
