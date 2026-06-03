"use client";

import { useLayoutEffect, useMemo, type ReactNode } from "react";
import { ccc } from "@ckb-ccc/connector-react";
import { AppProvider } from "@/lib/context/app-context";
import { AssetsProvider } from "@/lib/context/assets-context";
import { PipelineProvider } from "@/lib/context/pipeline-context";
import { useTransactionRecovery } from "@/lib/hooks/useTransactionRecovery";
import { isRgbppCapableWallet } from "@/lib/services/wallet-compat";
import {
  IS_MAINNET,
  CKB_ADDRESS_PREFIX,
  BTC_NETWORK_NAME,
  syncNetworkCookie,
} from "@/lib/services/network";

/**
 * Only surface wallets whose BTC signer can actually sign + broadcast RGB++
 * PSBTs. Filters out non-BTC signers and BTC signers that are stubs
 * (e.g. UTXO Global). See lib/services/wallet-compat.ts.
 */
async function rgbppSignerFilter(
  signerInfo: ccc.SignerInfo,
  wallet: ccc.Wallet,
): Promise<boolean> {
  return (
    signerInfo.signer.type === ccc.SignerType.BTC &&
    isRgbppCapableWallet(wallet.name)
  );
}

/**
 * Runs the transaction recovery hook on mount.
 * Must be rendered inside both AppProvider and PipelineProvider.
 */
function TransactionRecoveryInitializer({ children }: { children: ReactNode }) {
  useTransactionRecovery();
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    syncNetworkCookie();
  }, []);

  const defaultClient = useMemo(
    () => (IS_MAINNET ? new ccc.ClientPublicMainnet() : new ccc.ClientPublicTestnet()),
    [],
  );

  // Push the connected BTC wallet onto the network matching our target.
  // Keyed by CKB addressPrefix because ccc matches prefs against client.addressPrefix.
  const preferredNetworks = useMemo<ccc.NetworkPreference[]>(
    () => [
      {
        addressPrefix: CKB_ADDRESS_PREFIX,
        signerType: ccc.SignerType.BTC,
        network: BTC_NETWORK_NAME,
      },
    ],
    [],
  );

  return (
    <ccc.Provider
      defaultClient={defaultClient}
      preferredNetworks={preferredNetworks}
      signerFilter={rgbppSignerFilter}
    >
      <AppProvider>
        <AssetsProvider>
          <PipelineProvider>
            <TransactionRecoveryInitializer>
              {children}
            </TransactionRecoveryInitializer>
          </PipelineProvider>
        </AssetsProvider>
      </AppProvider>
    </ccc.Provider>
  );
}
