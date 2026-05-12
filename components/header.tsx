"use client";

import { Wallet, Bell, ChevronDown, LogOut } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { truncateAddress } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Header() {
  const { isConnected, walletAddress, btcAddress, openConnector, disconnect, notifications, dismissNotification } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  return (
    <header className="flex items-center justify-between h-16 px-6 border-b border-border bg-card">
      {/* Page Title - will be populated by each page */}
      <div />

      {/* Right Side Actions */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex items-center justify-center size-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Bell className="size-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 bg-primary rounded-full" />
            )}
          </button>

          {showNotifications && notifications.length > 0 && (
            <div className="absolute right-0 top-12 w-80 bg-popover border border-border rounded-xl shadow-xl z-50">
              <div className="p-3 border-b border-border">
                <h3 className="font-medium text-sm">Notifications</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 hover:bg-accent/50 cursor-pointer"
                    onClick={() => dismissNotification(n.id)}
                  >
                    <div
                      className={cn(
                        "size-2 mt-1.5 rounded-full shrink-0",
                        n.level === "error" && "bg-destructive",
                        n.level === "warn" && "bg-warning",
                        n.level === "info" && "bg-primary"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Wallet Connection */}
        {isConnected ? (
          <div className="relative">
            <button
              onClick={() => setShowWalletMenu(!showWalletMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary hover:bg-accent transition-colors"
            >
              <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center">
                <Wallet className="size-3.5 text-primary" />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-xs text-muted-foreground">Connected</span>
                <span className="text-sm font-medium">
                  {truncateAddress(walletAddress || "", 4, 4)}
                </span>
              </div>
              <ChevronDown className="size-4 text-muted-foreground" />
            </button>

            {showWalletMenu && (
              <div className="absolute right-0 top-12 w-64 bg-popover border border-border rounded-xl shadow-xl z-50">
                <div className="p-3 border-b border-border">
                  <p className="text-xs text-muted-foreground">CKB Address</p>
                  <p className="text-sm font-mono truncate">{walletAddress}</p>
                  {btcAddress && (
                    <>
                      <p className="text-xs text-muted-foreground mt-2">BTC Address</p>
                      <p className="text-sm font-mono truncate">{btcAddress}</p>
                    </>
                  )}
                </div>
                <button
                  onClick={() => {
                    disconnect();
                    setShowWalletMenu(false);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-destructive hover:bg-accent transition-colors"
                >
                  <LogOut className="size-4" />
                  Disconnect
                </button>
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
