"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useApp } from "@/lib/context/app-context";
import { useEffect, useState, useCallback } from "react";
import { getRecommendedFees, getBtcInfo } from "@/lib/services/api";

interface NetworkInfo {
  btcFeeRate: number | null;
  btcBlockHeight: number | null;
  ckbTipNumber: string | null;
  ckbFeeRate: string | null;
  loading: boolean;
  error: boolean;
}

function useNetworkStatus() {
  const { client } = useApp();
  const [info, setInfo] = useState<NetworkInfo>({
    btcFeeRate: null,
    btcBlockHeight: null,
    ckbTipNumber: null,
    ckbFeeRate: null,
    loading: true,
    error: false,
  });

  const refresh = useCallback(async () => {
    setInfo((prev) => ({ ...prev, loading: true, error: false }));
    try {
      const [fees, btcInfo, ckbTipResult, ckbFeeResult] = await Promise.allSettled([
        getRecommendedFees(),
        getBtcInfo(),
        // CKB tip block via CCC client's getTip()
        client ? client.getTip() : Promise.resolve(null),
        // CKB fee rate via CCC client's getFeeRateStatistics()
        client
          ? client.getFeeRateStatistics().then((r) => {
            if (r?.median != null) {
              return Number(r.median);
            }
            return null;
          })
          : Promise.resolve(null),
      ]);

      setInfo({
        btcFeeRate: fees.status === "fulfilled" ? fees.value.halfHourFee : null,
        btcBlockHeight: btcInfo.status === "fulfilled" ? btcInfo.value.blocks : null,
        ckbTipNumber:
          ckbTipResult.status === "fulfilled" && ckbTipResult.value != null
            ? Number(ckbTipResult.value).toLocaleString()
            : null,
        ckbFeeRate:
          ckbFeeResult.status === "fulfilled" && ckbFeeResult.value != null
            ? `${ckbFeeResult.value}`
            : null,
        loading: false,
        error: false,
      });
    } catch {
      setInfo((prev) => ({ ...prev, loading: false, error: true }));
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { info, refresh };
}

function MetricRow({
  label,
  value,
  loading,
}: {
  label: string;
  value: string | null;
  loading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono font-medium">
        {loading ? (
          <Loader2 className="size-3 animate-spin inline" />
        ) : value !== null ? (
          value
        ) : (
          <span className="text-muted-foreground">–</span>
        )}
      </span>
    </div>
  );
}

export function QuickActions() {
  const { isConnected } = useApp();
  const { info } = useNetworkStatus();

  if (!isConnected) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Network Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-6">
          {/* Bitcoin */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-orange-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-orange-500/80">
                Bitcoin
              </span>
            </div>
            <div className="pl-4 space-y-1.5">
              <MetricRow
                label="Tip Block"
                value={info.btcBlockHeight !== null ? `#${info.btcBlockHeight.toLocaleString()}` : null}
                loading={info.loading}
              />
              <MetricRow
                label="Fee Rate"
                value={info.btcFeeRate !== null ? `~${info.btcFeeRate} sat/vB` : null}
                loading={info.loading}
              />
            </div>
          </div>

          {/* Divider */}
          <div className="hidden md:block w-px bg-border" />
          <div className="md:hidden h-px bg-border" />

          {/* CKB */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-500/80">
                CKB
              </span>
            </div>
            <div className="pl-4 space-y-1.5">
              <MetricRow
                label="Tip Block"
                value={info.ckbTipNumber !== null ? `#${info.ckbTipNumber}` : null}
                loading={info.loading}
              />
              <MetricRow
                label="Fee Rate"
                value={info.ckbFeeRate !== null ? `~${Number(info.ckbFeeRate).toLocaleString()} shannons/KB` : null}
                loading={info.loading}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
