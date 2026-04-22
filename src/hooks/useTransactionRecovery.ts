/**
 * Transaction Recovery Hook
 *
 * On page load, checks localStorage for pipelines stuck in "active" status.
 * If a pipeline is waiting for CKB confirmation and has a txHash from the
 * broadcast step, resumes polling via client.waitTransaction().
 *
 * For pipelines stuck at earlier steps (signing, composing), marks them
 * as interrupted since those operations cannot be resumed.
 */
import { useEffect, useRef } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useApp } from '../context/AppContext';
import type { TransactionPipeline } from '../services/types';

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
 * Check if a pipeline is stuck waiting for CKB confirmation.
 */
function isWaitingForCkbConfirmation(pipeline: TransactionPipeline): boolean {
  const activeStep = pipeline.steps.find((s) => s.status === 'active');
  if (!activeStep) return false;
  return activeStep.label.toLowerCase().includes('waiting') && activeStep.label.toLowerCase().includes('ckb');
}

/**
 * Check if a pipeline is stuck at an unrecoverable step.
 */
function isStuckAtUnrecoverableStep(pipeline: TransactionPipeline): boolean {
  if (pipeline.status !== 'active') return false;
  const activeStep = pipeline.steps.find((s) => s.status === 'active');
  if (!activeStep) return false;
  // If it's not waiting for confirmation, it's an unrecoverable interruption
  return !isWaitingForCkbConfirmation(pipeline);
}

export function useTransactionRecovery() {
  const { pipelines, upsertPipeline } = useTransactions();
  const { client } = useApp();
  const recoveredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!client) return;

    const activePipelines = pipelines.filter((p) => p.status === 'active');
    if (activePipelines.length === 0) return;

    for (const pipeline of activePipelines) {
      // Skip if already being recovered
      if (recoveredRef.current.has(pipeline.id)) continue;

      if (isWaitingForCkbConfirmation(pipeline)) {
        const txHash = findCkbBroadcastTxHash(pipeline);
        if (!txHash) {
          // No txHash found — can't recover
          markAsInterrupted(pipeline, 'Missing transaction hash for recovery');
          continue;
        }

        // Mark as recovering so we don't retry
        recoveredRef.current.add(pipeline.id);
        console.log(`[Recovery] Resuming CKB confirmation for pipeline ${pipeline.id}, txHash: ${txHash}`);

        // Resume polling
        resumeCkbConfirmation(pipeline, txHash);
      } else if (isStuckAtUnrecoverableStep(pipeline)) {
        markAsInterrupted(pipeline, 'Transaction interrupted by page refresh');
      }
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
        // Update step label to show we're resuming
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

        // Poll for confirmation
        await client!.waitTransaction(txHash);

        // Mark as done
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
  }, [client]); // Only run when client becomes available
}
