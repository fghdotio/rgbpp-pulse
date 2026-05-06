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
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
      }}
    >
      {/* Cluster header */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '14px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-base)',
          textAlign: 'left',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        <Layers size={14} color="var(--green)" />
        <span style={{ fontWeight: 600, fontSize: '0.875rem', flex: 1 }}>
          {group.clusterName}
        </span>
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            background: 'var(--bg-base)',
            padding: '2px 8px',
            borderRadius: '4px',
          }}
        >
          {group.spores.length}
        </span>
        {open
          ? <ChevronUp size={14} color="var(--text-muted)" />
          : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {/* Spore grid (collapsible) */}
      {open && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
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
      )}
    </div>
  );
}

/**
 * DOBs Manager — shows all DOBs/Spores grouped by Cluster.
 * Clicking a card opens a detail modal with DOB version, traits, and actions.
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
    // Sort: named clusters first (alphabetical), unclustered last
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
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Connect wallet to view DOBs</div>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'var(--text-secondary)', padding: '48px' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Loading DOBs...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Gem size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>DOBs</h1>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {filtered.length} items · {clusterGroups.length} {clusterGroups.length === 1 ? 'collection' : 'collections'}
          {decoding && (
            <span style={{ marginLeft: '8px', color: 'var(--text-secondary)' }}>
              <Loader2 size={11} style={{ animation: 'spin 1s linear infinite', verticalAlign: 'middle', marginRight: '4px' }} />
              Decoding DOBs…
            </span>
          )}
        </span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {([['all', 'All'], ['ckb', 'CKB'], ['rgbpp', 'RGB++']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
            background: filter === key ? 'var(--text-base)' : 'var(--bg-elevated)',
            color: filter === key ? '#000' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer', letterSpacing: '0.5px', transition: 'all 150ms ease',
          }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-pill" placeholder="Search DOBs..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', width: '200px', fontSize: '0.75rem' }} />
        </div>
      </div>

      {/* Cluster groups */}
      {clusterGroups.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No matching DOBs</div>
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
