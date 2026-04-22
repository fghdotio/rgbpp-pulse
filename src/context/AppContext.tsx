import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { AppView } from '../services/types';

interface Notification {
  id: string;
  level: 'info' | 'warn' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

interface AppContextValue {
  /** Current navigation view */
  currentView: AppView;
  setView: (view: AppView) => void;

  /** Wallet state (simplified — real CCC connector handles the heavy lifting) */
  walletAddress: string | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;

  /** Notifications */
  notifications: Notification[];
  notify: (level: 'info' | 'warn' | 'error', title: string, message: string) => void;
  dismissNotification: (id: string) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentView, setView] = useState<AppView>('portfolio');
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const isConnected = walletAddress !== null;

  const connect = useCallback(() => {
    // Demo: simulate wallet connection
    setWalletAddress('ckt1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq');
  }, []);

  const disconnect = useCallback(() => {
    setWalletAddress(null);
    setView('portfolio');
  }, []);

  const notify = useCallback(
    (level: 'info' | 'warn' | 'error', title: string, message: string) => {
      const id = Math.random().toString(36).substring(2, 10);
      setNotifications((prev) => [{ id, level, title, message, timestamp: Date.now() }, ...prev].slice(0, 10));

      // Auto-dismiss after 6 seconds
      setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }, 6000);
    },
    [],
  );

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentView,
        setView,
        walletAddress,
        isConnected,
        connect,
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
