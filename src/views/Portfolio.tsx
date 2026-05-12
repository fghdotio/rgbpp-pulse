import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchUdtAssets, fetchSporeAssets, enrichSporesWithDob, getMockUdtAssets } from '../services/assets';
import type { UdtAsset, SporeAsset } from '../services/types';
import { DobImage } from '../components/DobImage';
import { formatAmount, formatAddress } from '../utils/format';
import {
  Wallet, Loader2, Coins, Gem, ArrowRight,
  Bitcoin, Box,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function Portfolio() {
  const { isConnected, btcAddress, signer, client, setView, openConnector } = useApp();
  const [udtAssets, setUdtAssets] = useState<UdtAsset[]>([]);
  const [sporeAssets, setSporeAssets] = useState<SporeAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) return;
    setLoading(true);

    const loadAssets = async () => {
      try {
        const [udts, spores] = await Promise.all([
          fetchUdtAssets(btcAddress, client, signer),
          btcAddress ? fetchSporeAssets(btcAddress, client, signer) : Promise.resolve([]),
        ]);
        setUdtAssets(udts);
        setSporeAssets(spores);

        if (spores.length > 0) {
          const enriched = await enrichSporesWithDob(spores);
          setSporeAssets([...enriched]);
        }
      } catch {
        setUdtAssets(getMockUdtAssets());
        setSporeAssets([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [isConnected, btcAddress, signer, client]);

  const ckbUdts = udtAssets.filter((a) => a.location === 'ckb');
  const btcUdts = udtAssets.filter((a) => a.location === 'btc');
  const ckbSpores = sporeAssets.filter((a) => a.location === 'ckb');
  const btcSpores = sporeAssets.filter((a) => a.location === 'btc');

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 p-10">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-2">
          <Wallet size={28} className="text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold">Connect Your Wallet</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          Connect a CKB or BTC wallet to view and manage your RGB++ assets
        </p>
        <Button onClick={openConnector} className="mt-2 gap-2">
          <Wallet size={16} />
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 gap-3 text-muted-foreground">
        <Loader2 size={20} className="animate-spin" />
        Loading portfolio...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={<Bitcoin size={18} />}
          label="RGB++ Assets"
          value={(btcUdts.length + btcSpores.length).toString()}
          accent="text-orange-500"
          accentBorder="border-l-orange-500"
        />
        <StatCard
          icon={<Box size={18} />}
          label="CKB Assets"
          value={(ckbUdts.length + ckbSpores.length).toString()}
          accent="text-cyan-400"
          accentBorder="border-l-cyan-400"
        />
        <StatCard
          icon={<Coins size={18} />}
          label="UDT Tokens"
          value={udtAssets.length.toString()}
          accent="text-primary"
          accentBorder="border-l-primary"
        />
        <StatCard
          icon={<Gem size={18} />}
          label="DOBs"
          value={sporeAssets.length.toString()}
          accent="text-violet-400"
          accentBorder="border-l-violet-400"
        />
      </div>

      {/* UDT Summary */}
      <section className="mb-7">
        <SectionHeader
          icon={<Coins size={16} className="text-primary" />}
          title="Tokens"
          count={udtAssets.length}
        />
        {udtAssets.length > 0 ? (
          <Card className="overflow-hidden">
            {udtAssets.slice(0, 5).map((a, i) => (
              <UdtRow key={a.typeScriptArgs + a.location} asset={a} showDivider={i > 0} />
            ))}
            <button
              onClick={() => setView('udt')}
              className="w-full p-3 bg-transparent border-t border-border text-muted-foreground text-xs cursor-pointer transition-colors hover:text-primary flex items-center justify-center gap-1"
            >
              {udtAssets.length > 5 && `+${udtAssets.length - 5} more · `}View all tokens <ArrowRight size={11} />
            </button>
          </Card>
        ) : (
          <EmptyState text="No UDT tokens" />
        )}
      </section>

      {/* DOBs Summary */}
      <section>
        <SectionHeader
          icon={<Gem size={16} className="text-violet-400" />}
          title="DOBs"
          count={sporeAssets.length}
        />
        {sporeAssets.length > 0 ? (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {sporeAssets.slice(0, 8).map((a) => (
                <DobThumb key={a.id} asset={a} onClick={() => setView('spore')} />
              ))}
            </div>
            <button
              onClick={() => setView('spore')}
              className="flex items-center justify-center gap-1 w-full mt-3 p-2.5 bg-card rounded-md text-muted-foreground text-xs cursor-pointer transition-colors hover:text-violet-400"
            >
              {sporeAssets.length > 8 && `+${sporeAssets.length - 8} more · `}View all DOBs <ArrowRight size={11} />
            </button>
          </>
        ) : (
          <EmptyState text="No DOBs" />
        )}
      </section>
    </div>
  );
}

// Sub-components

function StatCard({ icon, label, value, accent, accentBorder }: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  accent: string;
  accentBorder: string;
}) {
  return (
    <Card className={cn("p-5 flex flex-col gap-3 border-l-[3px]", accentBorder)}>
      <div className={cn("flex items-center gap-2", accent)}>
        {icon}
        <span className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>
      <span className="text-3xl font-extrabold tracking-tight">
        {value}
      </span>
    </Card>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      {icon}
      <h2 className="text-base font-bold flex-1">{title}</h2>
      <span className="text-[0.6875rem] text-muted-foreground bg-muted px-2 py-0.5 rounded">
        {count}
      </span>
    </div>
  );
}

/** Compact UDT row for portfolio overview */
function UdtRow({ asset, showDivider }: { asset: UdtAsset; showDivider: boolean }) {
  return (
    <>
      {showDivider && <div className="h-px bg-border mx-4" />}
      <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted">
        {/* Icon */}
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
          asset.location === 'btc' 
            ? "bg-orange-500/10" 
            : "bg-cyan-400/10"
        )}>
          <Coins size={14} className={asset.location === 'btc' ? "text-orange-500" : "text-cyan-400"} />
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[0.8125rem]">{asset.symbol || asset.name}</div>
          <div className="text-[0.625rem] text-muted-foreground uppercase tracking-wide">
            {asset.location === 'btc' ? 'RGB++' : 'CKB'}
          </div>
        </div>

        {/* Balance */}
        <div className="text-right">
          <div className="font-semibold text-[0.8125rem] font-mono">
            {formatAmount(asset.balance, asset.decimals)}
          </div>
        </div>

        {/* Chain indicator dot */}
        <div className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          asset.location === 'btc' ? "bg-orange-500" : "bg-cyan-400"
        )} />
      </div>
    </>
  );
}

/** Compact DOB thumbnail for portfolio overview */
function DobThumb({ asset, onClick }: { asset: SporeAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="rounded-md overflow-hidden aspect-square cursor-pointer relative transition-all duration-200 hover:scale-105 hover:shadow-lg"
      style={{
        background: (asset.dobSvg || asset.dobImageUri) ? 'hsl(var(--background))' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      {(asset.dobSvg || asset.dobImageUri) ? (
        <DobImage svg={asset.dobSvg} uri={asset.dobImageUri} compact />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <Gem size={20} className="text-muted-foreground opacity-40" />
        </div>
      )}

      {/* Name overlay */}
      <div className="absolute bottom-0 left-0 right-0 pt-4 pb-1.5 px-1.5 bg-gradient-to-t from-black/70 to-transparent text-[0.5625rem] font-semibold text-white overflow-hidden text-ellipsis whitespace-nowrap">
        {asset.clusterName || formatAddress(asset.id, 4, 4)}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <Card className="p-8 text-center text-muted-foreground text-[0.8125rem]">
      {text}
    </Card>
  );
}
