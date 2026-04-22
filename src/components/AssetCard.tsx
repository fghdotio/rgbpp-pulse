import React, { useState } from 'react';
import type { UdtAsset, SporeAsset } from '../services/types';
import { formatAmount, formatAddress } from '../utils/format';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Gem, FlaskConical, Copy, Check } from 'lucide-react';

interface UdtCardProps {
  asset: UdtAsset;
  onAction: (op: 'leap-to-btc' | 'transfer-on-btc' | 'leap-to-ckb') => void;
}

interface SporeCardProps {
  asset: SporeAsset;
  onAction: (op: 'leap-to-btc' | 'transfer-on-btc' | 'leap-to-ckb') => void;
}

const locationBadge = (location: 'ckb' | 'btc') => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '0.625rem',
      fontWeight: 600,
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      background: location === 'btc' ? 'rgba(30, 215, 96, 0.12)' : 'rgba(83, 157, 245, 0.15)',
      color: location === 'btc' ? 'var(--green)' : 'var(--text-announcement)',
    }}
  >
    {location === 'btc' ? 'RGB++' : 'CKB'}
  </span>
);

const mockBadge = () => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      padding: '2px 7px',
      borderRadius: '4px',
      fontSize: '0.5625rem',
      fontWeight: 700,
      textTransform: 'uppercase',
      letterSpacing: '0.8px',
      background: 'rgba(255, 255, 255, 0.06)',
      color: 'var(--text-muted)',
      border: '1px dashed rgba(255, 255, 255, 0.1)',
    }}
  >
    <FlaskConical size={9} />
    Mock
  </span>
);

function CopyableHash({ text, display }: { text: string; display: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <span
      onClick={handleCopy}
      title={copied ? 'Copied!' : `Copy ${text}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '0.6875rem',
        color: 'var(--text-muted)',
        fontFamily: 'monospace',
        cursor: 'pointer',
        borderRadius: '4px',
        padding: '2px 4px',
        margin: '-2px -4px',
        transition: 'all 150ms ease',
        background: copied ? 'rgba(30, 215, 96, 0.1)' : 'transparent',
      }}
      onMouseEnter={(e) => { if (!copied) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={(e) => { if (!copied) e.currentTarget.style.background = 'transparent'; }}
    >
      {display}
      {copied
        ? <Check size={10} color="var(--green)" style={{ flexShrink: 0 }} />
        : <Copy size={10} style={{ flexShrink: 0, opacity: 0.5 }} />
      }
    </span>
  );
}

const actionButton = (
  label: string,
  icon: React.ReactNode,
  onClick: () => void,
  color = 'var(--text-base)',
) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: 'var(--radius-full)',
      background: 'var(--bg-base)',
      color,
      fontSize: '0.6875rem',
      fontWeight: 600,
      border: '1px solid var(--border-default)',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      whiteSpace: 'nowrap',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = 'var(--green)';
      e.currentTarget.style.color = 'var(--green)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--border-default)';
      e.currentTarget.style.color = color;
    }}
  >
    {icon}
    {label}
  </button>
);

export function UdtCard({ asset, onAction }: UdtCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        transition: 'all 250ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--green) 0%, #0d9e42 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Coins size={20} color="#000" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>{asset.symbol}</span>
            {locationBadge(asset.location)}
            {asset.isMock && mockBadge()}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{asset.name}</div>
        </div>
      </div>

      {/* Balance */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
          {formatAmount(asset.balance, asset.decimals)}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        {asset.location === 'ckb' && actionButton('Leap to BTC', <ArrowUpRight size={12} />, () => onAction('leap-to-btc'))}
        {asset.location === 'btc' && actionButton('Transfer', <ArrowLeftRight size={12} />, () => onAction('transfer-on-btc'))}
        {asset.location === 'btc' && actionButton('Leap to CKB', <ArrowDownLeft size={12} />, () => onAction('leap-to-ckb'))}
      </div>
    </div>
  );
}

export function SporeCard({ asset, onAction }: SporeCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px',
        transition: 'all 250ms ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-elevated)';
        e.currentTarget.style.boxShadow = 'var(--shadow-medium)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-surface)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Preview area */}
      <div
        style={{
          width: '100%',
          aspectRatio: '1',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '12px',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <Gem size={32} color="var(--text-muted)" style={{ opacity: 0.5 }} />
        <div style={{ position: 'absolute', top: '8px', right: '8px', display: 'flex', gap: '4px' }}>
          {asset.isMock && mockBadge()}
          {locationBadge(asset.location)}
        </div>
      </div>

      {/* Info */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '2px' }}>
          {asset.clusterName || 'DOB'}
        </div>
        <div
          style={{
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            fontFamily: 'monospace',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {formatAddress(asset.id, 8, 6)}
        </div>
        <div style={{ fontSize: '0.625rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
          {asset.contentType}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {asset.location === 'ckb' && actionButton('Leap to BTC', <ArrowUpRight size={11} />, () => onAction('leap-to-btc'))}
        {asset.location === 'btc' && actionButton('Transfer', <ArrowLeftRight size={11} />, () => onAction('transfer-on-btc'))}
        {asset.location === 'btc' && actionButton('Leap to CKB', <ArrowDownLeft size={11} />, () => onAction('leap-to-ckb'))}
      </div>
    </div>
  );
}
