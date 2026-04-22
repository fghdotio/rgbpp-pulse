import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { UdtCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { showToast } from '../components/Toast';
import { fetchUdtAssets, getMockUdtAssets } from '../services/assets';
import { udtLeapToBtc, udtTransferOnBtc, udtLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, UdtAsset } from '../services/types';
import { Coins, Search, Loader2 } from 'lucide-react';

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
    if (!isConnected) { setAssets([]); return; }
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
    const amt = BigInt(Math.floor(parseFloat(params.amount) * 1e8));
    if (op === 'leap-to-btc') udtLeapToBtc({ udtScriptArgs: asset.typeScriptArgs, amount: amt, signer: signer ?? undefined, client: client ?? undefined }, upsertPipeline);
    if (op === 'transfer-on-btc') udtTransferOnBtc({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }] }, upsertPipeline);
    if (op === 'leap-to-ckb') udtLeapToCkb({ udtScriptArgs: asset.typeScriptArgs, receivers: [{ address: params.address, amount: amt }] }, upsertPipeline);

    showToast(`${opLabel} submitted · ${asset.symbol}`, {
      label: 'View',
      onClick: () => setView('transactions'),
    });
  };

  if (!isConnected) {
    return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Connect wallet to view UDT assets</div>;
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'var(--text-secondary)', padding: '48px' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Loading UDT assets...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <Coins size={22} color="var(--green)" />
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>UDT</h1>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{filtered.length} assets</span>
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
        <ActionModal isOpen onClose={() => setModal(null)} assetType="udt" operation={modal.op} assetName={modal.asset.symbol} udtInfo={modal.asset} ckbAddress={walletAddress} btcAddress={btcAddress} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
