import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchUdtAssets, fetchSporeAssets, enrichSporesWithDob, getMockUdtAssets } from '../services/assets';
import type { UdtAsset, SporeAsset } from '../services/types';
import { DobImage } from '../components/DobImage';
import { formatAmount, formatAddress } from '../utils/format';
import {
  Wallet, Loader2, Coins, Gem, ArrowRight,
  TrendingUp, Layers, Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
      <div className="flex flex-col items-center justify-center flex-1 gap-6 p-10">
        <div className="w-20 h-20 rounded-2xl gradient-orange flex items-center justify-center glow-orange">
          <Wallet size={36} className="text-white" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground text-sm max-w-sm">
            Connect a CKB or BTC wallet to view and manage your RGB++ assets across chains
          </p>
        </div>
        <Button onClick={openConnector} size="lg" className="mt-2 gap-2 px-8">
          <Wallet size={18} />
          Connect Wallet
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-muted-foreground">
        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
        <span className="text-sm font-medium">Loading your portfolio...</span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-8">
      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 gradient-card border-border/50 col-span-1 md:col-span-2">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total Assets</p>
              <h2 className="text-4xl font-bold tracking-tight">
                {udtAssets.length + sporeAssets.length}
              </h2>
            </div>
            <div className="w-12 h-12 rounded-xl gradient-orange flex items-center justify-center">
              <TrendingUp size={24} className="text-white" />
            </div>
          </div>
          <div className="flex gap-6 pt-4 border-t border-border/50">
            <div>
              <p className="text-2xl font-bold text-orange-500">{btcUdts.length + btcSpores.length}</p>
              <p className="text-xs text-muted-foreground">RGB++ Layer</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-cyan-400">{ckbUdts.length + ckbSpores.length}</p>
              <p className="text-xs text-muted-foreground">CKB Layer</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <Card className="p-5 flex items-center gap-4 gradient-card border-border/50">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Coins size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{udtAssets.length}</p>
              <p className="text-xs text-muted-foreground">Tokens</p>
            </div>
          </Card>
          <Card className="p-5 flex items-center gap-4 gradient-card border-border/50">
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Gem size={20} className="text-violet-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sporeAssets.length}</p>
              <p className="text-xs text-muted-foreground">DOBs</p>
            </div>
          </Card>
        </div>
      </div>

      {/* UDT Summary */}
      <section>
        <SectionHeader
          icon={<Coins size={18} className="text-primary" />}
          title="Tokens"
          count={udtAssets.length}
          onViewAll={() => setView('udt')}
        />
        {udtAssets.length > 0 ? (
          <Card className="overflow-hidden border-border/50">
            {udtAssets.slice(0, 5).map((a, i) => (
              <UdtRow key={a.typeScriptArgs + a.location} asset={a} showDivider={i > 0} />
            ))}
            {udtAssets.length > 5 && (
              <button
                onClick={() => setView('udt')}
                className="w-full p-4 bg-transparent border-t border-border/50 text-muted-foreground text-sm cursor-pointer transition-colors hover:text-primary hover:bg-accent/30 flex items-center justify-center gap-2 font-medium"
              >
                View all {udtAssets.length} tokens <ArrowRight size={14} />
              </button>
            )}
          </Card>
        ) : (
          <EmptyState icon={<Coins size={24} />} text="No tokens found" />
        )}
      </section>

      {/* DOBs Summary */}
      <section>
        <SectionHeader
          icon={<Gem size={18} className="text-violet-400" />}
          title="Digital Objects (DOBs)"
          count={sporeAssets.length}
          onViewAll={() => setView('spore')}
        />
        {sporeAssets.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {sporeAssets.slice(0, 8).map((a) => (
                <DobThumb key={a.id} asset={a} onClick={() => setView('spore')} />
              ))}
            </div>
            {sporeAssets.length > 8 && (
              <button
                onClick={() => setView('spore')}
                className="flex items-center justify-center gap-2 w-full mt-4 p-4 bg-card border border-border/50 rounded-xl text-muted-foreground text-sm cursor-pointer transition-all hover:text-violet-400 hover:border-violet-400/30 font-medium"
              >
                View all {sporeAssets.length} DOBs <ArrowRight size={14} />
              </button>
            )}
          </>
        ) : (
          <EmptyState icon={<Gem size={24} />} text="No DOBs found" />
        )}
      </section>
    </div>
  );
}

// Sub-components

function SectionHeader({ icon, title, count, onViewAll }: { 
  icon: React.ReactNode; 
  title: string; 
  count: number;
  onViewAll: () => void;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-lg bg-card flex items-center justify-center">
        {icon}
      </div>
      <h2 className="text-lg font-bold flex-1">{title}</h2>
      <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">
        {count}
      </span>
      <button 
        onClick={onViewAll}
        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
      >
        View All <ArrowRight size={12} />
      </button>
    </div>
  );
}

/** Compact UDT row for portfolio overview */
function UdtRow({ asset, showDivider }: { asset: UdtAsset; showDivider: boolean }) {
  const isBtc = asset.location === 'btc';
  
  return (
    <>
      {showDivider && <div className="h-px bg-border/50 mx-4" />}
      <div className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-accent/30">
        {/* Icon */}
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
          isBtc ? "bg-orange-500/10" : "bg-cyan-400/10"
        )}>
          <Coins size={18} className={isBtc ? "text-orange-500" : "text-cyan-400"} />
        </div>

        {/* Name + location */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{asset.symbol || asset.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={cn(
              "text-[0.625rem] font-medium px-1.5 py-0.5 rounded",
              isBtc ? "bg-orange-500/10 text-orange-500" : "bg-cyan-400/10 text-cyan-400"
            )}>
              {isBtc ? 'RGB++' : 'CKB'}
            </span>
          </div>
        </div>

        {/* Balance */}
        <div className="text-right">
          <div className="font-bold text-sm font-mono">
            {formatAmount(asset.balance, asset.decimals)}
          </div>
          <div className="text-[0.625rem] text-muted-foreground mt-0.5">
            {asset.symbol || 'tokens'}
          </div>
        </div>
      </div>
    </>
  );
}

/** Compact DOB thumbnail for portfolio overview */
function DobThumb({ asset, onClick }: { asset: SporeAsset; onClick: () => void }) {
  const isBtc = asset.location === 'btc';
  
  return (
    <div
      onClick={onClick}
      className="group rounded-xl overflow-hidden aspect-square cursor-pointer relative transition-all duration-300 hover:scale-[1.02] hover:shadow-xl border border-border/50 hover:border-primary/30"
      style={{
        background: (asset.dobSvg || asset.dobImageUri) ? 'hsl(var(--card))' : 'linear-gradient(135deg, hsl(var(--accent)) 0%, hsl(var(--card)) 100%)',
      }}
    >
      {(asset.dobSvg || asset.dobImageUri) ? (
        <DobImage svg={asset.dobSvg} uri={asset.dobImageUri} compact />
      ) : (
        <div className="flex items-center justify-center w-full h-full">
          <Sparkles size={24} className="text-muted-foreground/40 group-hover:text-primary/60 transition-colors" />
        </div>
      )}

      {/* Chain indicator */}
      <div className={cn(
        "absolute top-2 right-2 w-2 h-2 rounded-full",
        isBtc ? "bg-orange-500" : "bg-cyan-400"
      )} />

      {/* Name overlay */}
      <div className="absolute bottom-0 left-0 right-0 pt-6 pb-2 px-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
        <p className="text-[0.625rem] font-semibold text-white truncate">
          {asset.clusterName || formatAddress(asset.id, 4, 4)}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <Card className="p-12 text-center border-border/50 border-dashed">
      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-3 text-muted-foreground">
        {icon}
      </div>
      <p className="text-muted-foreground text-sm">{text}</p>
    </Card>
  );
}
