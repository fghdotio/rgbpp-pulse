/**
 * Checkpoint Persistence for RGB++ Transaction Recovery
 *
 * Stores intermediate state at critical points during long-running
 * RGB++ transactions, enabling recovery after page refresh.
 */
import type { LeapToBtcCheckpoint } from './types';

const CHECKPOINT_PREFIX = 'rgbpp_checkpoint_';
const CHECKPOINT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save a checkpoint to localStorage.
 */
/**
 * JSON replacer that converts BigInt → string so JSON.stringify doesn't throw.
 */
function bigIntReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString() : value;
}

export function saveCheckpoint(checkpoint: LeapToBtcCheckpoint): void {
  try {
    localStorage.setItem(
      `${CHECKPOINT_PREFIX}${checkpoint.pipelineId}`,
      JSON.stringify(checkpoint, bigIntReplacer),
    );
  } catch (err) {
    console.warn('[Checkpoint] Failed to save:', err);
  }
}

/**
 * Load a checkpoint for a specific pipeline.
 * Returns null if expired or not found.
 */
export function loadCheckpoint(pipelineId: string): LeapToBtcCheckpoint | null {
  try {
    const raw = localStorage.getItem(`${CHECKPOINT_PREFIX}${pipelineId}`);
    if (!raw) return null;
    const checkpoint = JSON.parse(raw) as LeapToBtcCheckpoint;
    if (Date.now() - checkpoint.createdAt > CHECKPOINT_TTL_MS) {
      clearCheckpoint(pipelineId);
      return null;
    }
    return checkpoint;
  } catch {
    return null;
  }
}

/**
 * Remove a checkpoint.
 */
export function clearCheckpoint(pipelineId: string): void {
  try {
    localStorage.removeItem(`${CHECKPOINT_PREFIX}${pipelineId}`);
  } catch {
    // ignore
  }
}
