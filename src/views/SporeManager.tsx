import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { SporeCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { getMockSporeAssets } from '../services/assets';
import { sporeLeapToBtc, sporeTransferOnBtc, sporeLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, SporeAsset } from '../services/types';
import { Gem, Search } from 'lucide-react';

export function SporeManager() {
  const { isConnected } = useApp();
  const { upsertPipeline } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'ckb' | 'btc'>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ op: RgbppOperation; asset: SporeAsset } | null>(null);

  const all = getMockSporeAssets();
  const filtered = all
    .filter((a) => filter === 'all' || a.location === filter)
    .filter((a) => !search || (a.clusterName || '').toLowerCase().includes(search.toLowerCase()) || a.id.includes(search));

  const handleSubmit = async (params: { address: string }) => {
    if (!modal) return;
    const { op, asset } = modal;
    const onUpdate = upsertPipeline;
    if (op === 'leap-to-btc') await sporeLeapToBtc({ sporeTypeArgs: asset.id }, onUpdate);
    if (op === 'transfer-on-btc') await sporeTransferOnBtc({ transfers: [{ btcAddress: params.address, sporeTypeArgs: asset.id }] }, onUpdate);
    if (op === 'leap-to-ckb') await sporeLeapToCkb({ ckbAddress: params.address, sporeTypeArgs: asset.id }, onUpdate);
  };

  if (!isConnected) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Connect wallet to manage Spore assets</div>;
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Gem size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Spore NFTs</h1>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(['all', 'ckb', 'btc'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '6px 16px', borderRadius: 'var(--radius-full)', fontSize: '0.75rem', fontWeight: 600,
            background: filter === f ? 'var(--text-base)' : 'var(--bg-elevated)',
            color: filter === f ? '#000' : 'var(--text-secondary)',
            border: 'none', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px',
            transition: 'all 150ms ease',
          }}>
            {f}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input className="input-pill" placeholder="Search spores..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', width: '200px', fontSize: '0.75rem' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {filtered.map((a) => <SporeCard key={a.id} asset={a} onAction={(op) => setModal({ op, asset: a })} />)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No matching Spore assets</div>}

      {modal && (
        <ActionModal isOpen onClose={() => setModal(null)} assetType="spore" operation={modal.op} assetName={modal.asset.clusterName || 'Spore'} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
