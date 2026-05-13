"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wallet } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";

/** SVG icon for Bitcoin / RGB++ network */
function BtcIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.5 7.5h3c1.38 0 2.5.9 2.5 2s-1.12 2-2.5 2H9.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 11.5h3.5c1.38 0 2.5.9 2.5 2s-1.12 2-2.5 2H9.5v-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M11 6v2M13 6v2M11 15.5v2M13 15.5v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/** SVG icon for CKB network */
function CkbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L3 7v10l9 5 9-5V7l-9-5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 12L3 7M12 12l9-5M12 12v10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function PortfolioOverview() {
  const { isConnected, openConnector } = useApp();
  const { udtAssets, sporeAssets, loading } = useAssets();

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your RGB++ assets across Bitcoin and CKB networks.
          </p>
          <button
            onClick={openConnector}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
          >
            <Wallet className="size-4" />
            Connect Wallet
          </button>
        </div>
      </Card>
    );
  }

  const btcUdts = udtAssets.filter((a) => a.location === "btc");
  const ckbUdts = udtAssets.filter((a) => a.location === "ckb");
  const btcSpores = sporeAssets.filter((a) => a.location === "btc");
  const ckbSpores = sporeAssets.filter((a) => a.location === "ckb");

  // Deduplicate token names per network
  const btcTokenNames = new Set(btcUdts.map((a) => a.symbol));
  const ckbTokenNames = new Set(ckbUdts.map((a) => a.symbol));

  const networks = [
    {
      label: "RGB++ Bound",
      icon: BtcIcon,
      tokens: btcTokenNames.size,
      dobs: btcSpores.length,
      accentClass: "text-warning",
      bgClass: "bg-warning/10",
      sublabel: btcTokenNames.size === 0 && btcSpores.length === 0
        ? "No Assets"
        : [
          btcTokenNames.size > 0 ? `${btcTokenNames.size} Token${btcTokenNames.size > 1 ? "s" : ""}` : null,
          btcSpores.length > 0 ? `${btcSpores.length} DOB${btcSpores.length > 1 ? "s" : ""}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
    {
      label: "CKB Native",
      icon: CkbIcon,
      tokens: ckbTokenNames.size,
      dobs: ckbSpores.length,
      accentClass: "text-chart-2",
      bgClass: "bg-chart-2/10",
      sublabel: ckbTokenNames.size === 0 && ckbSpores.length === 0
        ? "No Assets"
        : [
          ckbTokenNames.size > 0 ? `${ckbTokenNames.size} Token${ckbTokenNames.size > 1 ? "s" : ""}` : null,
          ckbSpores.length > 0 ? `${ckbSpores.length} DOB${ckbSpores.length > 1 ? "s" : ""}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {networks.map((net) => {
        const total = net.tokens + net.dobs;
        return (
          <Card key={net.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{net.label}</p>
                  <p className="text-3xl font-bold flex items-center gap-2">
                    {loading && (
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                    )}
                    {loading ? "…" : `${total} Asset${total !== 1 ? "s" : ""}`}
                  </p>
                  {!loading && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {net.tokens > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-xs font-medium text-foreground">
                          {net.tokens} Token{net.tokens > 1 ? "s" : ""}
                        </span>
                      )}
                      {net.dobs > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-secondary text-xs font-medium text-foreground">
                          {net.dobs} DOB{net.dobs > 1 ? "s" : ""}
                        </span>
                      )}
                      {net.tokens === 0 && net.dobs === 0 && (
                        <span className="text-xs text-muted-foreground">No Assets</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`size-11 rounded-xl ${net.bgClass} flex items-center justify-center`}>
                  <net.icon className={`size-6 ${net.accentClass}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
