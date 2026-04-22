import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { UdtCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { getMockUdtAssets } from '../services/assets';
import { udtLeapToBtc, udtTransferOnBtc, udtLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, UdtAsset } from '../services/types';
import { Coins, Search } from 'lucide-react';

export function UdtManager() {
  const { isConnected } = useApp();
  const { upsertPipeline } = useTransactions();
  const [filter, setFilter] = useState<'all' | 'ckb' | 'btc'>('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<{ op: RgbppOperation; asset: UdtAsset } | null>(null);

  const all = getMockUdtAssets();
  const filtered = all
    .filter((a) => filter === 'all' || a.location === filter)
    .filter((a) => !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.symbol.toLowerCase().includes(search.toLowerCase()));

  const handleSubmit = async (params: { address: string; amount: string }) => {
    if (!modal) return;
    const { op, asset } = modal;
    const amt = BigInt(Math.floor(parseFloat(params.amount) * 1e8));
    const onUpdate = upsertPipeline;
    if (op === 'leap-to-btc') await udtLeapToBtc({ udtScriptArgs: asset.typeScriptArgs, amount: amt }, onUpdate);
    if (op === 'transfer-on-btc') await udtTransferOnBtc({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }] }, onUpdate);
    if (op === 'leap-to-ckb') await udtLeapToCkb({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }] }, onUpdate);
  };

  if (!isConnected) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Connect wallet to manage UDT assets</div>;
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Coins size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>UDT Assets</h1>
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
          <input className="input-pill" placeholder="Search tokens..." value={search} onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', width: '200px', fontSize: '0.75rem' }} />
        </div>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {filtered.map((a) => <UdtCard key={a.typeScriptArgs} asset={a} onAction={(op) => setModal({ op, asset: a })} />)}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No matching UDT assets</div>}

      {modal && (
        <ActionModal isOpen onClose={() => setModal(null)} assetType="udt" operation={modal.op} assetName={modal.asset.symbol} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
