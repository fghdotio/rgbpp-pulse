import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { fetchUdtAssets, fetchSporeAssets, enrichSporesWithDob, getMockUdtAssets } from '../services/assets';
import type { UdtAsset, SporeAsset } from '../services/types';
import { DobImage } from '../components/DobImage';
import { formatAmount, formatAddress } from '../utils/format';
import {
  Wallet, Loader2, Coins, Gem, ArrowRight,
  Bitcoin, Box,
} from 'lucide-react';

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
        Loading portfolio…
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 300ms ease' }}>

      {/* ── Summary Stats ─────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px', marginBottom: '32px',
      }}>
        <StatCard
          icon={<Bitcoin size={18} />}
          label="RGB++ Assets"
          value={(btcUdts.length + btcSpores.length).toString()}
          accent="#f7931a"
        />
        <StatCard
          icon={<Box size={18} />}
          label="CKB Assets"
          value={(ckbUdts.length + ckbSpores.length).toString()}
          accent="#00cccc"
        />
        <StatCard
          icon={<Coins size={18} />}
          label="UDT Tokens"
          value={udtAssets.length.toString()}
          accent="var(--green)"
        />
        <StatCard
          icon={<Gem size={18} />}
          label="DOBs"
          value={sporeAssets.length.toString()}
          accent="#a78bfa"
        />
      </div>

      {/* ── UDT Summary ──────────────────────────── */}
      <section style={{ marginBottom: '28px' }}>
        <SectionHeader
          icon={<Coins size={16} color="var(--green)" />}
          title="Tokens"
          count={udtAssets.length}
        />
        {udtAssets.length > 0 ? (
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden',
          }}>
            {udtAssets.slice(0, 5).map((a, i) => (
              <UdtRow key={a.typeScriptArgs + a.location} asset={a} showDivider={i > 0} />
            ))}
            <button
              onClick={() => setView('udt')}
              style={{
                width: '100%', padding: '12px', background: 'transparent',
                border: 'none', borderTop: '1px solid var(--border-separator)',
                color: 'var(--text-muted)', fontSize: '0.75rem',
                cursor: 'pointer', transition: 'color 150ms ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {udtAssets.length > 5 && `+${udtAssets.length - 5} more · `}View all tokens <ArrowRight size={11} />
            </button>
          </div>
        ) : (
          <EmptyState text="No UDT tokens" />
        )}
      </section>

      {/* ── DOBs Summary ─────────────────────────── */}
      <section>
        <SectionHeader
          icon={<Gem size={16} color="#a78bfa" />}
          title="DOBs"
          count={sporeAssets.length}
        />
        {sporeAssets.length > 0 ? (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
              gap: '8px',
            }}>
              {sporeAssets.slice(0, 8).map((a) => (
                <DobThumb key={a.id} asset={a} onClick={() => setView('spore')} />
              ))}
            </div>
            <button
              onClick={() => setView('spore')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                width: '100%', marginTop: '12px', padding: '10px',
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)',
                border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem',
                cursor: 'pointer', textAlign: 'center', transition: 'color 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#a78bfa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {sporeAssets.length > 8 && `+${sporeAssets.length - 8} more · `}View all DOBs <ArrowRight size={11} />
            </button>
          </>
        ) : (
          <EmptyState text="No DOBs" />
        )}
      </section>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
      padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px',
      borderLeft: `3px solid ${accent}`,
      transition: 'all 200ms ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: accent }}>
        {icon}
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {label}
        </span>
      </div>
      <span style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
        {value}
      </span>
    </div>
  );
}

function SectionHeader({ icon, title, count }: { icon: React.ReactNode; title: string; count: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      marginBottom: '12px',
    }}>
      {icon}
      <h2 style={{ fontSize: '1rem', fontWeight: 700, flex: 1 }}>{title}</h2>
      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: '4px' }}>
        {count}
      </span>
    </div>
  );
}

/** Compact UDT row for portfolio overview */
function UdtRow({ asset, showDivider }: { asset: UdtAsset; showDivider: boolean }) {
  return (
    <>
      {showDivider && <div style={{ height: '1px', background: 'var(--border-separator)', margin: '0 16px' }} />}
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '12px 16px', transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Icon */}
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          background: `linear-gradient(135deg, ${asset.location === 'btc' ? '#f7931a22' : '#00cccc22'}, transparent)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Coins size={14} color={asset.location === 'btc' ? '#f7931a' : '#00cccc'} />
        </div>

        {/* Name + location */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem' }}>{asset.symbol || asset.name}</div>
          <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {asset.location === 'btc' ? 'RGB++' : 'CKB'}
          </div>
        </div>

        {/* Balance */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', fontFamily: 'monospace' }}>
            {formatAmount(asset.balance, asset.decimals)}
          </div>
        </div>

        {/* Chain indicator dot */}
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: asset.location === 'btc' ? '#f7931a' : '#00cccc',
          flexShrink: 0,
        }} />
      </div>
    </>
  );
}

/** Compact DOB thumbnail for portfolio overview */
function DobThumb({ asset, onClick }: { asset: SporeAsset; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
        aspectRatio: '1', cursor: 'pointer', position: 'relative',
        background: (asset.dobSvg || asset.dobImageUri) ? 'var(--bg-base)' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        transition: 'transform 200ms ease, box-shadow 200ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {(asset.dobSvg || asset.dobImageUri) ? (
        <DobImage svg={asset.dobSvg} uri={asset.dobImageUri} compact />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
          <Gem size={20} color="var(--text-muted)" style={{ opacity: 0.4 }} />
        </div>
      )}

      {/* Name overlay */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: '16px 6px 6px',
        background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
        fontSize: '0.5625rem', fontWeight: 600, color: '#fff',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {asset.clusterName || formatAddress(asset.id, 4, 4)}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
      padding: '32px', textAlign: 'center', color: 'var(--text-muted)',
      fontSize: '0.8125rem',
    }}>
      {text}
    </div>
  );
}
