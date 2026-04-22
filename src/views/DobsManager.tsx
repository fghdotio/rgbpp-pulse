import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { SporeCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { fetchSporeAssets, getMockSporeAssets } from '../services/assets';
import { sporeLeapToBtc, sporeTransferOnBtc, sporeLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, SporeAsset } from '../services/types';
import { Gem, Search, Loader2 } from 'lucide-react';

/**
 * DOBs Manager — shows all DOBs/Spores (both CKB-native and RGB++-bound).
 */
export function DobsManager() {
  const { isConnected, btcAddress } = useApp();
  const { upsertPipeline } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'ckb' | 'rgbpp'>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ op: RgbppOperation; asset: SporeAsset } | null>(null);
  const [assets, setAssets] = useState<SporeAsset[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isConnected) { setAssets([]); return; }
    setLoading(true);
    (btcAddress ? fetchSporeAssets(btcAddress) : Promise.resolve(getMockSporeAssets()))
      .then(setAssets)
      .catch(() => setAssets(getMockSporeAssets()))
      .finally(() => setLoading(false));
  }, [isConnected, btcAddress]);

  const filtered = assets
    .filter((a) => filter === 'all' || (filter === 'ckb' ? a.location === 'ckb' : a.location === 'btc'))
    .filter((a) => !search || (a.clusterName || '').toLowerCase().includes(search.toLowerCase()) || a.id.includes(search));

  const handleSubmit = async (params: { address: string }) => {
    if (!modal) return;
    const { op, asset } = modal;
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
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filtered.length} items</span>
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

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {filtered.map((a) => <SporeCard key={a.id} asset={a} onAction={(op) => setModal({ op, asset: a })} />)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No matching DOBs</div>}

      {modal && (
        <ActionModal isOpen onClose={() => setModal(null)} assetType="spore" operation={modal.op} assetName={modal.asset.clusterName || 'DOB'} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
