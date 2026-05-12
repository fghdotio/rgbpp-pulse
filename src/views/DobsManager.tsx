import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { SporeCard } from '../components/AssetCard';
import { SporeDetailModal } from '../components/SporeDetailModal';
import { ActionModal } from '../components/ActionModal';
import { fetchSporeAssets, enrichSporesWithDob } from '../services/assets';
import { sporeLeapToBtc, sporeTransferOnBtc, sporeLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, SporeAsset } from '../services/types';
import { Gem, Search, Loader2, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ClusterGroup {
  clusterId: string;
  clusterName: string;
  spores: SporeAsset[];
}

function ClusterSection({
  group,
  defaultOpen,
  onCardClick,
}: {
  group: ClusterGroup;
  defaultOpen: boolean;
  onCardClick: (asset: SporeAsset) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="overflow-hidden">
        {/* Cluster header */}
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2.5 px-4 py-3.5 bg-transparent text-foreground text-left transition-colors hover:bg-muted cursor-pointer">
            <Layers size={14} className="text-primary" />
            <span className="font-semibold text-sm flex-1">
              {group.clusterName}
            </span>
            <span className="text-[0.6875rem] font-semibold text-muted-foreground bg-background px-2 py-0.5 rounded">
              {group.spores.length}
            </span>
            {open
              ? <ChevronUp size={14} className="text-muted-foreground" />
              : <ChevronDown size={14} className="text-muted-foreground" />}
          </button>
        </CollapsibleTrigger>

        {/* Spore grid (collapsible) */}
        <CollapsibleContent>
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {group.spores.map((a) => (
                <SporeCard
                  key={a.id}
                  asset={a}
                  onClick={() => onCardClick(a)}
                  onAction={() => {/* handled via detail modal */}}
                />
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * DOBs Manager — shows all DOBs/Spores grouped by Cluster.
 */
export function DobsManager() {
  const { isConnected, btcAddress, client, signer } = useApp();
  const { upsertPipeline } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'ckb' | 'rgbpp'>('all');
  const [search, setSearch] = useState('');
  const [selectedSpore, setSelectedSpore] = useState<SporeAsset | null>(null);
  const [actionModal, setActionModal] = useState<{ op: RgbppOperation; asset: SporeAsset } | null>(null);
  const [assets, setAssets] = useState<SporeAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [decoding, setDecoding] = useState(false);

  useEffect(() => {
    if (!isConnected) { return; }
    let cancelled = false;
    setLoading(true);
    setDecoding(false);
    fetchSporeAssets(btcAddress, client, signer)
      .then((spores) => {
        if (cancelled) return;
        setAssets(spores);
        setLoading(false);

        // Phase 2: decode DOB traits asynchronously
        if (spores.length > 0) {
          setDecoding(true);
          enrichSporesWithDob(spores)
            .then((enriched) => {
              if (!cancelled) setAssets([...enriched]);
            })
            .finally(() => {
              if (!cancelled) setDecoding(false);
            });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssets([]);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [isConnected, btcAddress, client, signer]);

  const filtered = assets
    .filter((a) => filter === 'all' || (filter === 'ckb' ? a.location === 'ckb' : a.location === 'btc'))
    .filter((a) => !search || (a.clusterName || '').toLowerCase().includes(search.toLowerCase()) || a.id.includes(search));

  // Group filtered results by cluster
  const clusterGroups: ClusterGroup[] = useMemo(() => {
    const map = new Map<string, ClusterGroup>();
    for (const s of filtered) {
      const key = s.clusterId || '__unclustered__';
      const existing = map.get(key);
      if (existing) {
        existing.spores.push(s);
      } else {
        map.set(key, {
          clusterId: key,
          clusterName: s.clusterName || 'Unclustered',
          spores: [s],
        });
      }
    }
    return [...map.values()].sort((a, b) => {
      if (a.clusterId === '__unclustered__') return 1;
      if (b.clusterId === '__unclustered__') return -1;
      return a.clusterName.localeCompare(b.clusterName);
    });
  }, [filtered]);

  // When an action is triggered from the detail modal
  const handleDetailAction = (op: RgbppOperation) => {
    if (!selectedSpore) return;
    setActionModal({ op, asset: selectedSpore });
  };

  const handleActionSubmit = async (params: { address: string }) => {
    if (!actionModal) return;
    const { op, asset } = actionModal;
    if (op === 'leap-to-btc') await sporeLeapToBtc({ sporeTypeArgs: asset.id }, upsertPipeline);
    if (op === 'transfer-on-btc') await sporeTransferOnBtc({ transfers: [{ btcAddress: params.address, sporeTypeArgs: asset.id }] }, upsertPipeline);
    if (op === 'leap-to-ckb') await sporeLeapToCkb({ ckbAddress: params.address, sporeTypeArgs: asset.id }, upsertPipeline);
  };

  if (!isConnected) {
    return <div className="p-12 text-center text-muted-foreground">Connect wallet to view DOBs</div>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1 gap-3 text-muted-foreground p-12">
        <Loader2 size={20} className="animate-spin" />
        Loading DOBs...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2.5 mb-6">
        <Gem size={22} className="text-primary" />
        <h1 className="text-2xl font-bold">DOBs</h1>
        <span className="text-xs text-muted-foreground">
          {filtered.length} items · {clusterGroups.length} {clusterGroups.length === 1 ? 'collection' : 'collections'}
          {decoding && (
            <span className="ml-2 text-muted-foreground">
              <Loader2 size={11} className="animate-spin inline align-middle mr-1" />
              Decoding DOBs...
            </span>
          )}
        </span>
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
            placeholder="Search DOBs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 w-[200px] text-xs h-8"
          />
        </div>
      </div>

      {/* Cluster groups */}
      {clusterGroups.length > 0 ? (
        <div className="flex flex-col gap-2">
          {clusterGroups.map((g) => (
            <ClusterSection
              key={g.clusterId}
              group={g}
              defaultOpen={clusterGroups.length <= 5}
              onCardClick={(asset) => setSelectedSpore(asset)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center p-10 text-muted-foreground">No matching DOBs</div>
      )}

      {/* Detail modal */}
      {selectedSpore && (
        <SporeDetailModal
          asset={selectedSpore}
          onClose={() => setSelectedSpore(null)}
          onAction={handleDetailAction}
        />
      )}

      {/* Action modal (from detail modal actions) */}
      {actionModal && (
        <ActionModal
          isOpen
          onClose={() => setActionModal(null)}
          assetType="spore"
          operation={actionModal.op}
          assetName={actionModal.asset.clusterName || 'DOB'}
          onSubmit={handleActionSubmit}
        />
      )}
    </div>
  );
}
