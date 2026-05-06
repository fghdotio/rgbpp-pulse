import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useTransactions } from '../context/TransactionContext';
import { UdtCard, SporeCard } from '../components/AssetCard';
import { ActionModal } from '../components/ActionModal';
import { showToast } from '../components/Toast';
import { fetchUdtAssets, fetchSporeAssets, getMockUdtAssets } from '../services/assets';
import { udtLeapToBtc, udtTransferOnBtc, udtLeapToCkb, sporeLeapToBtc, sporeTransferOnBtc, sporeLeapToCkb } from '../services/rgbpp';
import type { RgbppOperation, UdtAsset, SporeAsset, TransactionPipeline } from '../services/types';
import { Wallet, Loader2, Box, Zap } from 'lucide-react';

export function Portfolio() {
  const { isConnected, walletAddress, btcAddress, signer, client, setView, openConnector } = useApp();
  const { upsertPipeline } = useTransactions();
  const [modal, setModal] = useState<{ type: 'udt' | 'spore'; op: RgbppOperation; name: string; args: string; udtAsset?: UdtAsset } | null>(null);
  const [udtAssets, setUdtAssets] = useState<UdtAsset[]>([]);
  const [sporeAssets, setSporeAssets] = useState<SporeAsset[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch real assets when connected
  useEffect(() => {
    if (!isConnected) {
      return;
    }

    setLoading(true);

    const loadAssets = async () => {
      try {
        const [udts, spores] = await Promise.all([
          fetchUdtAssets(btcAddress, client, signer),
          btcAddress ? fetchSporeAssets(btcAddress) : Promise.resolve([]),
        ]);
        setUdtAssets(udts);
        setSporeAssets(spores);
      } catch {
        setUdtAssets(getMockUdtAssets());
        setSporeAssets([]);
      } finally {
        setLoading(false);
      }
    };

    loadAssets();
  }, [isConnected, btcAddress, signer, client]);

  // Group assets by chain location
  const ckbUdts = udtAssets.filter((a) => a.location === 'ckb');
  const ckbSpores = sporeAssets.filter((a) => a.location === 'ckb');
  const rgbppUdts = udtAssets.filter((a) => a.location === 'btc');
  const rgbppSpores = sporeAssets.filter((a) => a.location === 'btc');
  const hasCkbAssets = ckbUdts.length > 0 || ckbSpores.length > 0;
  const hasRgbppAssets = rgbppUdts.length > 0 || rgbppSpores.length > 0;

  const handleUdtAction = (asset: UdtAsset, op: RgbppOperation) => {
    setModal({ type: 'udt', op, name: asset.symbol, args: asset.typeScriptArgs, udtAsset: asset });
  };

  const handleSporeAction = (asset: SporeAsset, op: RgbppOperation) => {
    setModal({ type: 'spore', op, name: asset.clusterName || 'DOB', args: asset.id });
  };

  const handleSubmit = async (params: { address: string; amount: string }) => {
    if (!modal) return;
    const opLabel = modal.op === 'leap-to-btc' ? 'Leap to BTC' : modal.op === 'transfer-on-btc' ? 'Transfer on BTC' : 'Leap to CKB';
    const assetName = modal.name;

    // Wrap onUpdate to detect when the first broadcast step completes,
    // then show the toast at that point instead of immediately.
    let toastShown = false;
    const onUpdate = (p: TransactionPipeline) => {
      upsertPipeline(p);
      if (!toastShown) {
        const hasBroadcast = p.steps.some(
          (s) => s.status === 'done' && s.label.toLowerCase().includes('broadcasting'),
        );
        if (hasBroadcast) {
          toastShown = true;
          showToast(`${opLabel} submitted · ${assetName}`, {
            label: 'View',
            onClick: () => setView('transactions'),
          });
        }
      }
    };

    if (modal.type === 'udt') {
      const amt = BigInt(Math.floor(parseFloat(params.amount) * 1e8));
      if (modal.op === 'leap-to-btc') udtLeapToBtc({ udtScriptArgs: modal.args, amount: amt, signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
      if (modal.op === 'transfer-on-btc') udtTransferOnBtc({ udtScriptArgs: modal.args, receivers: [{ address: params.address, amount: amt }], signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
      if (modal.op === 'leap-to-ckb') udtLeapToCkb({ udtScriptArgs: modal.args, receivers: [{ address: params.address, amount: amt }], signer: signer ?? undefined, client: client ?? undefined }, onUpdate);
    } else {
      if (modal.op === 'leap-to-btc') sporeLeapToBtc({ sporeTypeArgs: modal.args }, onUpdate);
      if (modal.op === 'transfer-on-btc') sporeTransferOnBtc({ transfers: [{ btcAddress: params.address, sporeTypeArgs: modal.args }] }, onUpdate);
      if (modal.op === 'leap-to-ckb') sporeLeapToCkb({ ckbAddress: params.address, sporeTypeArgs: modal.args }, onUpdate);
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
        <button
          onClick={openConnector}
          style={{
            marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px',
            background: 'var(--green)', color: '#000', padding: '12px 32px',
            borderRadius: 'var(--radius-full)', fontWeight: 700, fontSize: '0.875rem',
            border: 'none', cursor: 'pointer', transition: 'all 150ms ease',
          }}
        >
          <Wallet size={16} />
          Connect Wallet
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'var(--text-secondary)' }}>
        <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
        Loading assets...
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>

      {/* ── RGB++ Assets ─────────────────────────────── */}
      <section style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Zap size={18} color="var(--green)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>RGB++</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {rgbppUdts.length + rgbppSpores.length} assets
          </span>
        </div>

        {hasRgbppAssets ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* RGB++ UDTs */}
            {rgbppUdts.length > 0 && (
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  UDT
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {rgbppUdts.map((a) => <UdtCard key={a.typeScriptArgs} asset={a} onAction={(op) => handleUdtAction(a, op)} />)}
                </div>
              </div>
            )}
            {/* RGB++ DOBs */}
            {rgbppSpores.length > 0 && (
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  DOBs
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {rgbppSpores.map((a) => <SporeCard key={a.id} asset={a} onAction={(op) => handleSporeAction(a, op)} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No RGB++ assets found
          </div>
        )}
      </section>

      {/* ── CKB Assets ───────────────────────────────── */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <Box size={18} color="var(--text-announcement)" />
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700 }}>CKB</h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {ckbUdts.length + ckbSpores.length} assets
          </span>
        </div>

        {hasCkbAssets ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* CKB UDTs */}
            {ckbUdts.length > 0 && (
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  UDT
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                  {ckbUdts.map((a) => <UdtCard key={a.typeScriptArgs} asset={a} onAction={(op) => handleUdtAction(a, op)} />)}
                </div>
              </div>
            )}
            {/* CKB DOBs */}
            {ckbSpores.length > 0 && (
              <div>
                <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                  DOBs
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                  {ckbSpores.map((a) => <SporeCard key={a.id} asset={a} onAction={(op) => handleSporeAction(a, op)} />)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            No CKB assets found
          </div>
        )}
      </section>

      {/* Modal */}
      {modal && (
        <ActionModal
          isOpen={!!modal}
          onClose={() => setModal(null)}
          assetType={modal.type}
          operation={modal.op}
          assetName={modal.name}
          udtInfo={modal.udtAsset}
          ckbAddress={walletAddress ?? undefined}
          btcAddress={btcAddress ?? undefined}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
