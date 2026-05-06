/**
 * Transaction Recovery Hook
 *
 * On page load, checks localStorage for pipelines stuck in "active" status.
 *
 * Recovery strategies (in priority order):
 *
 * 1. **Checkpoint-based recovery** (for udtLeapToBtc):
 *    If a checkpoint exists, uses it to resume from the exact interruption point.
 *    - lastCompletedStep=1: resume BTC confirmation wait + CKB side
 *    - lastCompletedStep=2-5: redo CKB side from scratch using persisted utxoSeal
 *    - lastCompletedStep=6: resume CKB confirmation wait
 *
 * 2. **Label-based recovery** (legacy fallback):
 *    If pipeline is waiting for CKB confirmation and has a txHash from the
 *    broadcast step, resumes polling via client.waitTransaction().
 *
 * 3. **Mark as interrupted**:
 *    For pipelines stuck at unrecoverable steps without checkpoints.
 */
import { useEffect, useRef } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useApp } from '../context/AppContext';
import type { TransactionPipeline } from '../services/types';
import { loadCheckpoint } from '../services/checkpoint';
import { resumeUdtLeapToBtc, resumeUdtTransferOnBtc, resumeUdtLeapToCkb } from '../services/rgbpp';
import { isBtcSigner } from '../services/rgbppSetup';

/**
 * Find the txHash from a completed broadcast step in the pipeline.
 * Looks for steps labeled with "Broadcasting" that have chain='ckb' and a txHash.
 */
function findCkbBroadcastTxHash(pipeline: TransactionPipeline): string | undefined {
  for (const step of pipeline.steps) {
    if (
      step.status === 'done' &&
      step.chain === 'ckb' &&
      step.txHash &&
      step.label.toLowerCase().includes('broadcasting')
    ) {
      return step.txHash;
    }
  }
  return undefined;
}

/**
 * Check if a pipeline is stuck waiting for CKB confirmation (label-based).
 */
function isWaitingForCkbConfirmation(pipeline: TransactionPipeline): boolean {
  const activeStep = pipeline.steps.find((s) => s.status === 'active');
  if (!activeStep) return false;
  return activeStep.label.toLowerCase().includes('waiting') && activeStep.label.toLowerCase().includes('ckb');
}

export function useTransactionRecovery() {
  const { pipelines, upsertPipeline } = useTransactions();
  const { client, signer } = useApp();
  const recoveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!client) return;

    const activePipelines = pipelines.filter((p) => p.status === 'active');
    if (activePipelines.length === 0) return;

    // Partition pipelines into those needing sequential recovery (wallet signing)
    // and those that can run concurrently (CKB confirmation waits only).
    const checkpointRecoveries: Array<{
      pipeline: TransactionPipeline;
      checkpoint: ReturnType<typeof loadCheckpoint> & {};
    }> = [];

    for (const pipeline of activePipelines) {
      if (recoveredRef.current.has(pipeline.id)) continue;

      const checkpoint = loadCheckpoint(pipeline.id);
      if (checkpoint) {
        if (!signer || !isBtcSigner(signer)) continue;
        recoveredRef.current.add(pipeline.id);
        checkpointRecoveries.push({ pipeline, checkpoint });
        continue;
      }

      // ── Strategy 2: Label-based CKB confirmation recovery (legacy) ──
      // These only call client.waitTransaction — no signing needed, safe to fire concurrently.
      if (isWaitingForCkbConfirmation(pipeline)) {
        const txHash = findCkbBroadcastTxHash(pipeline);
        if (!txHash) {
          markAsInterrupted(pipeline, 'Missing transaction hash for recovery');
          continue;
        }
        recoveredRef.current.add(pipeline.id);
        console.log(`[Recovery] Resuming CKB confirmation for pipeline ${pipeline.id}, txHash: ${txHash}`);
        resumeCkbConfirmation(pipeline, txHash);
        continue;
      }

      // ── Strategy 3: Mark as interrupted ──
      if (pipeline.status === 'active') {
        const activeStep = pipeline.steps.find((s) => s.status === 'active');
        if (activeStep) {
          markAsInterrupted(pipeline, 'Transaction interrupted by page refresh');
        }
      }
    }

    // Run checkpoint-based recoveries sequentially so the wallet only sees
    // one signing request at a time. Browser wallet extensions (UniSat, OKX, etc.)
    // reject or misbehave when multiple signing popups overlap.
    if (checkpointRecoveries.length > 0 && signer && isBtcSigner(signer)) {
      const btcSigner = signer;
      (async () => {
        for (const { pipeline, checkpoint } of checkpointRecoveries) {
          const operation = checkpoint.operation ?? pipeline.operation;
          console.log(
            `[Recovery] Found checkpoint for pipeline ${pipeline.id}, ` +
            `operation=${operation}, lastCompletedStep=${checkpoint.lastCompletedStep}`,
          );

          try {
            switch (operation) {
              case 'transfer-on-btc':
                await resumeUdtTransferOnBtc(checkpoint, pipeline, btcSigner, client, upsertPipeline);
                break;
              case 'leap-to-ckb':
                await resumeUdtLeapToCkb(checkpoint, pipeline, btcSigner, client, upsertPipeline);
                break;
              default:
                await resumeUdtLeapToBtc(checkpoint, pipeline, btcSigner, client, upsertPipeline);
                break;
            }
          } catch (err) {
            console.error(`[Recovery] Unhandled error for pipeline ${pipeline.id}:`, err);
          }
        }
      })();
    }

    function markAsInterrupted(pipeline: TransactionPipeline, reason: string) {
      if (recoveredRef.current.has(pipeline.id)) return;
      recoveredRef.current.add(pipeline.id);

      const steps = pipeline.steps.map((s) =>
        s.status === 'active'
          ? { ...s, status: 'error' as const, error: reason, timestamp: Date.now() }
          : s,
      );
      upsertPipeline({ ...pipeline, steps, status: 'error' });
    }

    async function resumeCkbConfirmation(pipeline: TransactionPipeline, txHash: string) {
      try {
        const confirmStepIdx = pipeline.steps.findIndex(
          (s) => s.status === 'active' && s.label.toLowerCase().includes('waiting'),
        );
        if (confirmStepIdx < 0) return;

        const steps = [...pipeline.steps];
        steps[confirmStepIdx] = {
          ...steps[confirmStepIdx],
          detail: 'Resuming after page refresh...',
        };
        upsertPipeline({ ...pipeline, steps });

        await client!.waitTransaction(txHash);

        const doneSteps = [...pipeline.steps];
        doneSteps[confirmStepIdx] = {
          ...doneSteps[confirmStepIdx],
          status: 'done',
          txHash,
          chain: 'ckb',
          timestamp: Date.now(),
          detail: undefined,
        };
        upsertPipeline({
          ...pipeline,
          steps: doneSteps,
          status: 'completed',
          completedAt: Date.now(),
        });

        console.log(`[Recovery] Pipeline ${pipeline.id} confirmed successfully`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Recovery] Failed to confirm pipeline ${pipeline.id}:`, errorMsg);

        const errorSteps = [...pipeline.steps];
        const idx = errorSteps.findIndex((s) => s.status === 'active');
        if (idx >= 0) {
          errorSteps[idx] = {
            ...errorSteps[idx],
            status: 'error',
            error: `Recovery failed: ${errorMsg}`,
            timestamp: Date.now(),
          };
        }
        upsertPipeline({ ...pipeline, steps: errorSteps, status: 'error' });
      }
    }
  }, [client, signer]); // Re-run when client or signer becomes available
}
