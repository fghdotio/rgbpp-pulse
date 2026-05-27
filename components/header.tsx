"use client";

import { Wallet, ChevronDown, LogOut, Copy, Check, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { truncateAddress } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";
import { NetworkSwitcher } from "@/components/network-switcher";
import { IS_MAINNET } from "@/lib/services/network";

export function Header() {
  const { isConnected, walletAddress, btcAddress, openConnector, disconnect } = useApp();
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showWalletMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowWalletMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showWalletMenu]);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const ckbExplorerUrl = walletAddress
    ? `https://${IS_MAINNET ? '' : 'pudge.'}explorer.nervos.org/address/${walletAddress}`
    : undefined;

  const btcExplorerUrl = btcAddress
    ? `https://mempool.space${IS_MAINNET ? '' : '/testnet'}/address/${btcAddress}`
    : undefined;

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card">
      {/* Page Title - will be populated by each page */}
      <div />

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">

        <NetworkSwitcher />

        {/* Wallet Connection */}
        {isConnected ? (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
            >
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="size-3.5 text-primary" />
              </div>
              <span className="text-sm font-medium">Connected</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            {showWalletMenu && (
              <div className="absolute right-0 top-12 w-80 bg-popover border border-border rounded-xl shadow-xl z-50">
                {/* BTC Address */}
                {btcAddress && (
                  <div className="p-3 pb-0">
                    <p className="text-xs text-muted-foreground mb-1.5">BTC Address</p>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                      <a
                        href={btcExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-1 flex-1 min-w-0 hover:text-primary transition-colors"
                        title="View on Mempool"
                      >
                        <span className="text-sm font-mono truncate">
                          {truncateAddress(btcAddress, 10, 8)}
                        </span>
                        <ExternalLink className="size-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                      </a>
                      <button
                        onClick={() => copyToClipboard(btcAddress, "btc")}
                        className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                        title="Copy address"
                      >
                        {copiedField === "btc" ? (
                          <Check className="size-3.5 text-green-500" />
                        ) : (
                          <Copy className="size-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* CKB Address */}
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1.5">CKB Address</p>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                    <a
                      href={ckbExplorerUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-1 flex-1 min-w-0 hover:text-primary transition-colors"
                      title="View on CKB Explorer"
                    >
                      <span className="text-sm font-mono truncate">
                        {truncateAddress(walletAddress || "", 10, 8)}
                      </span>
                      <ExternalLink className="size-3 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    </a>
                    <button
                      onClick={() => copyToClipboard(walletAddress || "", "ckb")}
                      className="shrink-0 p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Copy address"
                    >
                      {copiedField === "ckb" ? (
                        <Check className="size-3.5 text-green-500" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Disconnect */}
                <div className="border-t border-border">
                  <button
                    onClick={() => {
                      disconnect();
                      setShowWalletMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-accent transition-colors rounded-b-xl"
                  >
                    <LogOut className="size-4" />
                    Disconnect
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={openConnector}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <Wallet className="size-4" />
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
