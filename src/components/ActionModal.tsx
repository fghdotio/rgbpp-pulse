import React, { useState } from 'react';
import type { RgbppOperation } from '../services/types';
import { X, ArrowUpRight, ArrowDownLeft, ArrowLeftRight } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetType: 'udt' | 'spore';
  operation: RgbppOperation;
  assetName: string;
  onSubmit: (params: { address: string; amount: string }) => void;
}

const opMeta: Record<RgbppOperation, { label: string; icon: React.ReactNode; desc: string }> = {
  'leap-to-btc': { label: 'Leap to BTC', icon: <ArrowUpRight size={18} />, desc: 'Transfer this asset from CKB to Bitcoin via RGB++ protocol' },
  'transfer-on-btc': { label: 'Transfer on BTC', icon: <ArrowLeftRight size={18} />, desc: 'Transfer this RGB++ asset to another Bitcoin address' },
  'leap-to-ckb': { label: 'Leap to CKB', icon: <ArrowDownLeft size={18} />, desc: 'Transfer this asset from Bitcoin back to CKB' },
};

export function ActionModal({ isOpen, onClose, assetType, operation, assetName, onSubmit }: Props) {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const meta = opMeta[operation];
  const needsAmount = assetType === 'udt';

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

        <div className="divider" />

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {operation === 'leap-to-ckb' ? 'CKB Address' : 'BTC Address'}
            </label>
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
