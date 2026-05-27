"use client";

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { ccc } from '@ckb-ccc/connector-react';
import { NETWORK, NETWORK_LABEL, btcNetworkOfAddress } from '@/lib/services/network';

interface Notification {
  id: string;
  level: 'info' | 'warn' | 'error';
  title: string;
  message: string;
  timestamp: number;
  actionLabel?: string;
  actionHref?: string;
}

interface AppContextValue {
  /** CCC Wallet state */
  signer: ccc.Signer | undefined;
  client: ccc.Client;
  wallet: ccc.Wallet | undefined;
  isConnected: boolean;
  walletAddress: string | null;
  btcAddress: string | null;
  openConnector: () => void;
  disconnect: () => void;

  /** Notifications */
  notifications: Notification[];
  notify: (level: 'info' | 'warn' | 'error', title: string, message: string, options?: { actionLabel?: string; actionHref?: string }) => void;
  dismissNotification: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [btcAddress, setBtcAddress] = useState<string | null>(null);

  // CCC hooks
  const {
    wallet,
    signerInfo,
    open: openConnector,
    client,
    disconnect: cccDisconnect,
  } = ccc.useCcc();

  const signer = signerInfo?.signer;
  const isConnected = !!signer;

  // Resolve addresses when signer changes
  useEffect(() => {
    if (!signer) {
      setWalletAddress(null);
      setBtcAddress(null);
      return;
    }

    // CKB address via recommended address (full ckb format)
    signer.getRecommendedAddress().then((addr) => {
      setWalletAddress(addr);
    }).catch(() => {
      // Fallback to internal address
      signer.getInternalAddress().then((addr) => {
        setWalletAddress(addr);
      }).catch(() => {});
    });

    // BTC address via internal address (only if BTC-like)
    signer.getInternalAddress().then((addr) => {
      if (addr.startsWith('tb1') || addr.startsWith('bc1') || addr.startsWith('1') || addr.startsWith('3') || addr.startsWith('m') || addr.startsWith('n') || addr.startsWith('2')) {
        setBtcAddress(addr);
      }
    }).catch(() => {});
  }, [signer]);

  const disconnect = useCallback(() => {
    cccDisconnect();
    setWalletAddress(null);
    setBtcAddress(null);
  }, [cccDisconnect]);

  const notify = useCallback(
    (level: 'info' | 'warn' | 'error', title: string, message: string, options?: { actionLabel?: string; actionHref?: string }) => {
      const id = Math.random().toString(36).substring(2, 10);
      setNotifications((prev) => [{ id, level, title, message, timestamp: Date.now(), ...options }, ...prev].slice(0, 10));
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 5000);
    },
    [],
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Warn (don't silently follow) when the wallet is on a different BTC network
  // than the app targets — avoids accidentally operating on real mainnet funds.
  useEffect(() => {
    if (!btcAddress) return;
    const walletNet = btcNetworkOfAddress(btcAddress);
    if (walletNet !== 'unknown' && walletNet !== NETWORK) {
      const walletLabel = walletNet === 'mainnet' ? 'Bitcoin Mainnet' : 'Bitcoin Testnet';
      notify(
        'warn',
        'Wrong wallet network',
        `This app runs on ${NETWORK_LABEL}, but your wallet is on ${walletLabel}. Switch your wallet's network to continue.`,
      );
    }
  }, [btcAddress, notify]);

  return (
    <AppContext.Provider
      value={{
        signer,
        client,
        wallet,
        isConnected,
        walletAddress,
        btcAddress,
        openConnector,
        disconnect,
        notifications,
        notify,
        dismissNotification,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
