import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { UdtCard, SporeCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { TransactionTracker } from '../components/TransactionTracker';
import { getMockUdtAssets, getMockSporeAssets } from '../services/assets';
import { udtLeapToBtc, udtTransferOnBtc, udtLeapToCkb, sporeLeapToBtc, sporeTransferOnBtc, sporeLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, UdtAsset, SporeAsset } from '../services/types';
import { Wallet, Coins, Gem } from 'lucide-react';

export function Portfolio() {
  const { isConnected, walletAddress } = useApp();
  const { activePipelines, upsertPipeline } = useTransactions();
  const [modal, setModal] = useState<{ type: 'udt' | 'spore'; op: RgbppOperation; name: string; args: string } | null>(null);

  const udtAssets = getMockUdtAssets();
  const sporeAssets = getMockSporeAssets();

  const handleUdtAction = (asset: UdtAsset, op: RgbppOperation) => {
    setModal({ type: 'udt', op, name: asset.symbol, args: asset.typeScriptArgs });
  };

  const handleSporeAction = (asset: SporeAsset, op: RgbppOperation) => {
    setModal({ type: 'spore', op, name: asset.clusterName || 'Spore', args: asset.id });
  };

  const handleSubmit = async (params: { address: string; amount: string }) => {
    if (!modal) return;
    const onUpdate = upsertPipeline;

    if (modal.type === 'udt') {
      const amt = BigInt(Math.floor(parseFloat(params.amount) * 1e8));
      if (modal.op === 'leap-to-btc') await udtLeapToBtc({ udtScriptArgs: modal.args, amount: amt }, onUpdate);
      if (modal.op === 'transfer-on-btc') await udtTransferOnBtc({ udtScriptArgs: modal.args, receivers: [{ address: params.address, amount: amt }] }, onUpdate);
      if (modal.op === 'leap-to-ckb') await udtLeapToCkb({ udtScriptArgs: modal.args, receivers: [{ address: params.address, amount: amt }] }, onUpdate);
    } else {
      if (modal.op === 'leap-to-btc') await sporeLeapToBtc({ sporeTypeArgs: modal.args }, onUpdate);
      if (modal.op === 'transfer-on-btc') await sporeTransferOnBtc({ transfers: [{ btcAddress: params.address, sporeTypeArgs: modal.args }] }, onUpdate);
      if (modal.op === 'leap-to-ckb') await sporeLeapToCkb({ ckbAddress: params.address, sporeTypeArgs: modal.args }, onUpdate);
    }
  };

  if (!isConnected) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '16px', padding: '40px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
          <Wallet size={28} color="var(--text-muted)" />
        </div>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Connect Your Wallet</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'center', maxWidth: '320px' }}>
          Connect a CKB or BTC wallet to view and manage your RGB++ assets
        </p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>
      {/* Active Pipelines */}
      {activePipelines.length > 0 && (
        <section style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1.4px', marginBottom: '12px' }}>
            Active Transactions
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {activePipelines.map((p) => <TransactionTracker key={p.id} pipeline={p} compact />)}
          </div>
        </section>
      )}

      {/* UDT Assets */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Coins size={18} color="var(--green)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>UDT</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{udtAssets.length} assets</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {udtAssets.map((a) => <UdtCard key={a.typeScriptArgs} asset={a} onAction={(op) => handleUdtAction(a, op)} />)}
        </div>
      </section>

      {/* Spore Assets */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Gem size={18} color="var(--green)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>DOBs</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sporeAssets.length} items</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {sporeAssets.map((a) => <SporeCard key={a.id} asset={a} onAction={(op) => handleSporeAction(a, op)} />)}
        </div>
      </section>

      {/* Modal */}
      {modal && (
        <ActionModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          assetType={modal.type}
          operation={modal.op}
          assetName={modal.name}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
