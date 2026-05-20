"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Wallet, Coins, Image as ImageIcon } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useAssets } from "@/lib/context/assets-context";
import Link from "next/link";
import { useMemo } from "react";

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

/** Compact token summary for preview */
interface TokenSummary {
  name: string;
  symbol: string;
  decimals: number;
  totalBalance: bigint;
}

function summarizeTokens(
  udtAssets: { name: string; symbol: string; decimals: number; balance: bigint; location: "ckb" | "btc" }[]
): TokenSummary[] {
  const map = new Map<string, TokenSummary>();
  for (const a of udtAssets) {
    const key = `${a.symbol}:${a.decimals}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalBalance += a.balance;
    } else {
      map.set(key, {
        name: a.name,
        symbol: a.symbol,
        decimals: a.decimals,
        totalBalance: a.balance,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.totalBalance > a.totalBalance) return 1;
    if (b.totalBalance < a.totalBalance) return -1;
    return 0;
  });
}

export function PortfolioOverview() {
  const { isConnected, openConnector } = useApp();
  const { udtAssets, sporeAssets, udtLoading, sporeLoading, enrichingDobs } = useAssets();
  const loading = udtLoading || sporeLoading;

  // Only show RGB++ (BTC-bound) assets
  const btcUdtAssets = useMemo(() => udtAssets.filter((a) => a.location === "btc"), [udtAssets]);
  const btcSporeAssets = useMemo(() => sporeAssets.filter((a) => a.location === "btc"), [sporeAssets]);
  const tokens = useMemo(() => summarizeTokens(btcUdtAssets), [btcUdtAssets]);

  const btcTokenNames = new Set(btcUdtAssets.map((a) => a.symbol));
  const totalTokens = btcTokenNames.size;
  const totalDobs = btcSporeAssets.length;
  const total = totalTokens + totalDobs;
  const hasTokens = tokens.length > 0;
  const hasDobs = btcSporeAssets.length > 0;

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground mb-4">
            Connect your wallet to view your RGB++ assets.
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

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0 divide-y divide-border">
        {/* Stats Header with Semi-circular Gauge */}
        <div className="p-5">
          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" /> Loading assets…
            </div>
          ) : total === 0 ? (
            <p className="text-sm text-muted-foreground">No assets found</p>
          ) : (() => {
            const R = 40;
            const CX = 60;
            const CY = 48;
            const CIRC = 2 * Math.PI * R;       // ~251.33
            const HALF = CIRC / 2;               // ~125.66
            const tokenArc = (totalTokens / total) * HALF;
            const dobArc = (totalDobs / total) * HALF;

            return (
              <div className="flex items-center gap-6">
                {/* Semi-circular Gauge */}
                <div className="relative shrink-0" style={{ width: 120, height: 68 }}>
                  <svg viewBox="0 2 120 56" className="w-full h-full overflow-visible">
                    <g transform={`rotate(180, ${CX}, ${CY})`}>
                      {/* Background arc */}
                      <circle
                        cx={CX} cy={CY} r={R}
                        fill="none"
                        stroke="var(--color-muted)"
                        strokeWidth="10"
                        strokeDasharray={`${HALF} ${CIRC}`}
                      />
                      {/* Tokens segment */}
                      {totalTokens > 0 && (
                        <circle
                          cx={CX} cy={CY} r={R}
                          fill="none"
                          stroke="#FF4D4D"
                          strokeWidth="10"
                          strokeDasharray={`${tokenArc} ${CIRC}`}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      )}
                      {/* DOBs segment */}
                      {totalDobs > 0 && (
                        <circle
                          cx={CX} cy={CY} r={R}
                          fill="none"
                          stroke="#00E676"
                          strokeWidth="10"
                          strokeDasharray={`${dobArc} ${CIRC}`}
                          strokeDashoffset={`${-tokenArc}`}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      )}
                    </g>
                    {/* Center total */}
                    <text
                      x={CX} y={CY - 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-foreground"
                      style={{ fontSize: 18, fontWeight: 700 }}
                    >
                      {total}
                    </text>
                    <text
                      x={CX} y={CY + 12}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-muted-foreground"
                      style={{ fontSize: 13 }}
                    >
                      Assets
                    </text>
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-col gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: "#FF4D4D" }} />
                    <span className="text-sm font-medium tabular-nums">{totalTokens}</span>
                    <span className="text-sm text-muted-foreground">{totalTokens === 1 ? "Token" : "Tokens"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full shrink-0" style={{ backgroundColor: "#00E676" }} />
                    <span className="text-sm font-medium tabular-nums">{totalDobs}</span>
                    <span className="text-sm text-muted-foreground">{totalDobs === 1 ? "DOB" : "DOBs"}</span>
                  </div>
                </div>

                {/* BTC Icon */}
                <div className="size-11 rounded-xl bg-warning/10 flex items-center justify-center shrink-0">
                  <BtcIcon className="size-6 text-warning" />
                </div>
              </div>
            );
          })()}
        </div>

        {/* Tokens Row */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Coins className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Tokens</span>
            </div>
            <Link href="/tokens" className="text-xs text-primary hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : hasTokens ? (
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {tokens.slice(0, 4).map((t) => (
                <span key={`${t.symbol}:${t.decimals}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-secondary text-sm font-medium">
                  <span className="size-1.5 rounded-full bg-primary shrink-0" />
                  {t.symbol}
                </span>
              ))}
              {tokens.length > 4 && (
                <span className="text-xs text-muted-foreground self-center">
                  +{tokens.length - 4} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No tokens</p>
          )}
        </div>

        {/* DOBs Row */}
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-semibold">DOBs</span>
            </div>
            <Link href="/dobs" className="text-xs text-primary hover:underline">
              View All →
            </Link>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading…
            </div>
          ) : hasDobs ? (
            <div className="flex items-center gap-2 overflow-x-auto">
              {btcSporeAssets.slice(0, 6).map((dob) => (
                <div
                  key={dob.id}
                  className="size-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border/50"
                  title={dob.clusterName || dob.id.slice(0, 10)}
                >
                  {dob.dobSvg ? (
                    <div
                      className="size-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-cover"
                      dangerouslySetInnerHTML={{ __html: dob.dobSvg }}
                    />
                  ) : dob.dobImageUri ? (
                    <img
                      src={dob.dobImageUri}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : enrichingDobs ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="size-full bg-gradient-to-br from-primary/20 to-chart-2/20 flex items-center justify-center">
                      <ImageIcon className="size-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {btcSporeAssets.length > 6 && (
                <Link
                  href="/dobs"
                  className="size-12 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50"
                >
                  +{btcSporeAssets.length - 6}
                </Link>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No DOBs</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
