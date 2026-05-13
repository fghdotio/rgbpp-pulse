/**
 * Global Wallet Signing Lock
 *
 * Browser wallet extensions (OKX, UniSat, JoyID) can only handle one
 * approval popup at a time. Concurrent signing requests cause:
 *   "Another approval request is already pending" (-32603)
 *
 * This module provides:
 * 1. A promise-chain mutex that serializes all wallet signing operations.
 * 2. An observable `isLocked` state for the UI to subscribe to, so that
 *    action buttons and transaction dialogs can be disabled while signing.
 */

// ─── Subscribers (React hook integration) ─────────────────────
type Listener = (locked: boolean) => void;
const _listeners = new Set<Listener>();
let _locked = false;

function setLocked(locked: boolean) {
  if (_locked === locked) return;
  _locked = locked;
  _listeners.forEach((fn) => fn(locked));
}

/** Subscribe to lock state changes. Returns an unsubscribe function. */
export function subscribeSigningLock(listener: Listener): () => void {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/** Get the current lock state (snapshot). */
export function getSigningLockState(): boolean {
  return _locked;
}

// ─── Promise-chain Mutex ──────────────────────────────────────
let _signingLock: Promise<unknown> = Promise.resolve();
let _queueDepth = 0;

/**
 * Acquire the global signing lock. Returns a release function.
 * While the lock is held, subsequent callers will wait.
 */
function acquireSigningLock(): { ready: Promise<void>; release: () => void } {
  let release: () => void;
  const next = new Promise<void>((resolve) => {
    release = resolve;
  });
  const ready = _signingLock.then(() => {});
  _signingLock = _signingLock.then(() => next);
  _queueDepth++;
  setLocked(true);
  return {
    ready,
    release: () => {
      release!();
      _queueDepth--;
      if (_queueDepth <= 0) {
        _queueDepth = 0;
        setLocked(false);
      }
    },
  };
}

/**
 * Execute `fn` while holding the global signing lock.
 * The lock is automatically released after `fn` settles (resolves or rejects).
 */
export async function withSigningLock<T>(fn: () => Promise<T>): Promise<T> {
  const lock = acquireSigningLock();
  await lock.ready;
  try {
    return await fn();
  } finally {
    lock.release();
  }
}
