import React, { useState } from 'react';
import type { RgbppOperation, UdtAsset } from '../services/types';
import { formatAmount } from '../utils/format';
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Copy, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetType: 'udt' | 'spore';
  operation: RgbppOperation;
  assetName: string;
  /** Full UDT asset details — displayed in a rich info card */
  udtInfo?: UdtAsset;
  /** Connected wallet addresses for the "My Address" shortcut */
  ckbAddress?: string;
  btcAddress?: string;
  onSubmit: (params: { address: string; amount: string }) => void;
}

const opMeta: Record<RgbppOperation, { label: string; icon: React.ReactNode; desc: string }> = {
  'leap-to-btc': { label: 'Leap to BTC', icon: <ArrowUpRight size={18} />, desc: 'Transfer this asset from CKB to Bitcoin via RGB++ protocol' },
  'transfer-on-btc': { label: 'Transfer on BTC', icon: <ArrowLeftRight size={18} />, desc: 'Transfer this RGB++ asset to another Bitcoin address' },
  'leap-to-ckb': { label: 'Leap to CKB', icon: <ArrowDownLeft size={18} />, desc: 'Transfer this asset from Bitcoin back to CKB' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={handleCopy}
      title={copied ? 'Copied!' : 'Copy'}
      style={{
        background: copied ? 'rgba(30, 215, 96, 0.15)' : 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '4px',
        padding: '3px 6px',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        color: copied ? 'var(--green)' : 'var(--text-muted)',
        fontSize: '0.5625rem',
        fontWeight: 600,
        transition: 'all 150ms ease',
      }}
    >
      {copied ? <Check size={9} /> : <Copy size={9} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function ActionModal({ isOpen, onClose, assetType, operation, assetName, udtInfo, ckbAddress, btcAddress, onSubmit }: Props) {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const meta = opMeta[operation];
  const needsAmount = assetType === 'udt';
  const myAddress = operation === 'leap-to-ckb' ? ckbAddress : btcAddress;

  const handleSubmit = async () => {
    if (!address) return;
    if (needsAmount && !amount) return;
    setLoading(true);
    onSubmit({ address, amount });
    setTimeout(() => {
      setLoading(false);
      setAddress('');
      setAmount('');
      onClose();
    }, 500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--green)' }}>
              {meta.icon}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{meta.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{assetName}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
          {meta.desc}
        </p>

        {/* UDT Detail Card */}
        {udtInfo && (
          <div
            style={{
              background: 'var(--bg-base)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              border: '1px solid var(--border-separator)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--green) 0%, #0d9e42 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Coins size={16} color="#000" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{udtInfo.symbol}</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>{udtInfo.name}</div>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.5625rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  background: udtInfo.location === 'btc' ? 'rgba(30, 215, 96, 0.12)' : 'rgba(83, 157, 245, 0.15)',
                  color: udtInfo.location === 'btc' ? 'var(--green)' : 'var(--text-announcement)',
                }}
              >
                {udtInfo.location === 'btc' ? 'RGB++' : 'CKB'}
              </span>
            </div>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Balance */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Balance</span>
                <span style={{ fontSize: '1rem', fontWeight: 700 }}>
                  {formatAmount(udtInfo.balance, udtInfo.decimals)} <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-secondary)' }}>{udtInfo.symbol}</span>
                </span>
              </div>
              {/* Decimals */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Decimals</span>
                <span style={{ fontSize: '0.8125rem', fontFamily: 'monospace' }}>{udtInfo.decimals}</span>
              </div>
              {/* Type Script Args */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type Args</span>
                  <CopyButton text={udtInfo.typeScriptArgs} />
                </div>
                <div
                  style={{
                    fontSize: '0.625rem',
                    fontFamily: 'monospace',
                    color: 'var(--text-secondary)',
                    wordBreak: 'break-all',
                    lineHeight: 1.5,
                    background: 'rgba(255,255,255,0.02)',
                    padding: '6px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {udtInfo.typeScriptArgs}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="divider" />

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {operation === 'leap-to-ckb' ? 'CKB Address' : 'BTC Address'}
              </label>
              {myAddress && (
                <button
                  onClick={() => setAddress(myAddress)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.625rem',
                    fontWeight: 600,
                    border: '1px solid var(--border-default)',
                    background: address === myAddress ? 'rgba(30, 215, 96, 0.1)' : 'transparent',
                    color: address === myAddress ? 'var(--green)' : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 150ms ease',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)'; }}
                  onMouseLeave={(e) => { if (address !== myAddress) { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-muted)'; } }}
                >
                  My Address
                </button>
              )}
            </div>
            <input
              className="input-dark"
              placeholder={operation === 'leap-to-ckb' ? 'ckt1q...' : 'tb1q...'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {needsAmount && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Amount
              </label>
              <input
                className="input-dark"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="divider" />

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 'var(--radius-full)', background: 'var(--bg-elevated)', color: 'var(--text-base)', fontWeight: 600, fontSize: '0.875rem', border: 'none', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!address || (needsAmount && !amount) || loading}
            style={{
              padding: '10px 24px', borderRadius: 'var(--radius-full)',
              background: (!address || (needsAmount && !amount)) ? 'var(--bg-card)' : 'var(--green)',
              color: (!address || (needsAmount && !amount)) ? 'var(--text-muted)' : '#000',
              fontWeight: 700, fontSize: '0.875rem', border: 'none', cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: 'all 150ms ease',
            }}
          >
            {loading ? 'Submitting...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
