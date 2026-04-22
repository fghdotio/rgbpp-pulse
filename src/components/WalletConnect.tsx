import React from 'react';
import { useApp } from '../context/AppContext';
import { formatAddress, copyToClipboard } from '../utils/format';
import { Wallet, LogOut, Copy, Check } from 'lucide-react';

export function WalletConnect() {
  const { isConnected, walletAddress, connect, disconnect, notify } = useApp();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (walletAddress) {
      const ok = await copyToClipboard(walletAddress);
      if (ok) {
        setCopied(true);
        notify('info', 'Copied', 'Address copied to clipboard');
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  if (!isConnected) {
    return (
      <button
        onClick={connect}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--green)',
          color: '#000',
          padding: '10px 24px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 700,
          fontSize: '0.875rem',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 150ms ease',
          letterSpacing: '0.14px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--green-hover)';
          e.currentTarget.style.transform = 'scale(1.04)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--green)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <Wallet size={16} />
        CONNECT WALLET
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={handleCopy}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-elevated)',
          color: 'var(--text-base)',
          padding: '8px 16px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 600,
          fontSize: '0.875rem',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--bg-card)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'var(--bg-elevated)';
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--green)',
            boxShadow: '0 0 6px var(--green)',
          }}
        />
        {formatAddress(walletAddress!, 6, 4)}
        {copied ? <Check size={14} color="var(--green)" /> : <Copy size={14} />}
      </button>

      <button
        onClick={disconnect}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '8px',
          background: 'transparent',
          color: 'var(--text-secondary)',
          borderRadius: '50%',
          border: 'none',
          cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-negative)';
          e.currentTarget.style.background = 'rgba(243, 114, 127, 0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-secondary)';
          e.currentTarget.style.background = 'transparent';
        }}
        title="Disconnect"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
