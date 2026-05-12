import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { UdtCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { showToast } from '../components/Toast';
import { fetchUdtAssets, getMockUdtAssets } from '../services/assets';
import { udtLeapToBtc, udtTransferOnBtc, udtLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, UdtAsset, TransactionPipeline } from '../services/types';
import { Coins, Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * UDT Manager — shows all UDTs (both CKB-native and RGB++-bound).
 */
export function UdtManager() {
  const { isConnected, walletAddress, btcAddress, signer, client, setView } = useApp();
  const { upsertPipeline } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'ckb' | 'rgbpp'>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ op: RgbppOperation; asset: UdtAsset } | null>(null);
  const [assets, setAssets] = useState<UdtAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) { return; }
    setLoading(true);
    fetchUdtAssets(btcAddress, client, signer)
      .then(setAssets)
      .catch(() => setAssets(getMockUdtAssets()))
      .finally(() => setLoading(false));
  }, [isConnected, btcAddress, signer, client]);

  const filtered = assets
    .filter((a) => filter === 'all' || (filter === 'ckb' ? a.location === 'ckb' : a.location === 'btc'))
    .filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (params: { address: string; amount: string }) => {
    if (!modal) return;
    const { op, asset } = modal;
    const opLabel = op === 'leap-to-btc' ? 'Leap to BTC' : op === 'transfer-on-btc' ? 'Transfer on BTC' : 'Leap to CKB';
    const assetSymbol = asset.symbol;

    // Wrap onUpdate to detect when the first broadcast step completes
    let toastShown = false;
    const onUpdate = (p: TransactionPipeline) => {
      upsertPipeline(p);
      if (!toastShown) {
        const hasBroadcast = p.steps.some(
          (s) => s.status === 'done' && s.label.toLowerCase().includes('broadcasting'),
        );
        if (hasBroadcast) {
          toastShown = true;
          showToast(`${opLabel} submitted · ${assetSymbol}`, {
            label: 'View',
            onClick: () => setView('transactions'),
          });
        }
      }
    };

    const amt = BigInt(Math.floor(parseFloat(params.amount) * 1e8));
    if (op === 'leap-to-btc') udtLeapToBtc({ udtScriptArgs: asset.typeScriptArgs, amount: amt, signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
    if (op === 'transfer-on-btc') udtTransferOnBtc({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }], signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
    if (op === 'leap-to-ckb') udtLeapToCkb({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }], signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
  };

  if (!isConnected) {
    return <div className="p-12 text-center text-muted-foreground">Connect wallet to view UDT assets</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 gap-3 text-muted-foreground p-12">
        <Loader2 size={20} className="animate-spin" />
        Loading UDT assets...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <Coins size={22} className="text-primary" />
        <h1 className="text-2xl font-bold">UDT</h1>
        <span className="text-xs text-muted-foreground">{filtered.length} assets</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {([['all', 'All'], ['ckb', 'CKB'], ['rgbpp', 'RGB++']] as const).map(([key, label]) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'secondary'}
            size="sm"
            onClick={() => setFilter(key)}
            className={cn(
              "rounded-full text-xs font-semibold tracking-wide",
              filter === key && "bg-foreground text-background hover:bg-foreground/90"
            )}
          >
            {label}
          </Button>
        ))}
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tokens..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-[200px] text-xs h-8"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((a) => <UdtCard key={`${a.typeScriptArgs}-${a.location}`} asset={a} onAction={(op) => setModal({ op, asset: a })} />)}
      </div>
      {filtered.length === 0 && <div className="text-center p-10 text-muted-foreground">No matching UDT assets</div>}

      {modal && (
        <ActionModal isOpen onClose={() => setModal(null)} assetType="udt" operation={modal.op} assetName={modal.asset.symbol} udtInfo={modal.asset} ckbAddress={walletAddress ?? undefined} btcAddress={btcAddress ?? undefined} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
