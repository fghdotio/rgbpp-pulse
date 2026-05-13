"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeSigningLock,
  getSigningLockState,
} from "@/lib/services/signing-lock";

/**
 * React hook that returns `true` when the global wallet signing lock is held.
 *
 * Use this to disable transaction buttons / prevent opening new transaction
 * dialogs while a wallet approval popup is already active.
 *
 * This relies on `useSyncExternalStore` for tear-free reads, so it works
 * correctly with React 18 concurrent features.
 */
export function useSigningLock(): boolean {
  return useSyncExternalStore(subscribeSigningLock, getSigningLockState, () => false);
}
