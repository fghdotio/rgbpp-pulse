import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { formatAddress, copyToClipboard, getCkbAddressExplorerUrl, getBtcAddressExplorerUrl } from '../utils/format';
import { Wallet, LogOut, Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';

/**
 * Determines if an address is BTC-like based on common prefixes.
 */
function isBtcLike(addr: string): boolean {
  return /^(tb1|bc1|[13mn2])/.test(addr);
}

/**
 * Small chain icon badge.
 */
function ChainBadge({ chain }: { chain: 'ckb' | 'btc' }) {
  const colors = chain === 'btc'
    ? { bg: 'rgba(255, 164, 43, 0.15)', color: '#ffa42b' }
    : { bg: 'rgba(83, 157, 245, 0.15)', color: '#539df5' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '1px 6px', borderRadius: '3px',
      fontSize: '0.5625rem', fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.5px', lineHeight: '1.4',
      background: colors.bg, color: colors.color,
      flexShrink: 0,
    }}>
      {chain}
    </span>
  );
}

/**
 * A single address row with chain badge, truncated address, copy, and explorer link.
 */
function AddressRow({ chain, address, onNotify }: {
  chain: 'ckb' | 'btc';
  address: string;
  onNotify: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const explorerUrl = chain === 'btc'
    ? getBtcAddressExplorerUrl(address)
    : getCkbAddressExplorerUrl(address);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const ok = await copyToClipboard(address);
    if (ok) {
      setCopied(true);
      onNotify(`${chain.toUpperCase()} address copied`);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: '6px 0',
    }}>
      <ChainBadge chain={chain} />

      {/* Clickable address → explorer */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
        style={{
          flex: 1, minWidth: 0,
          fontSize: '0.8125rem', fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          textDecoration: 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          transition: 'color 150ms ease',
          display: 'flex', alignItems: 'center', gap: '4px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
      >
        {formatAddress(address, 8, 6)}
        <ExternalLink size={10} style={{ flexShrink: 0, opacity: 0.6 }} />
      </a>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        title="Copy full address"
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '24px', height: '24px', borderRadius: '50%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: copied ? 'var(--green)' : 'var(--text-muted)',
          transition: 'all 150ms ease', flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-base)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
        onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function WalletConnect() {
  const { isConnected, walletAddress, btcAddress, openConnector, disconnect, notify } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  if (!isConnected) {
    return (
      <button
        onClick={openConnector}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'var(--green)', color: '#000',
          padding: '10px 24px', borderRadius: 'var(--radius-full)',
          fontWeight: 700, fontSize: '0.875rem',
          border: 'none', cursor: 'pointer',
          transition: 'all 150ms ease', letterSpacing: '0.14px',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--green-hover)'; e.currentTarget.style.transform = 'scale(1.04)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--green)'; e.currentTarget.style.transform = 'scale(1)'; }}
      >
        <Wallet size={16} />
        CONNECT WALLET
      </button>
    );
  }

  // Determine the display address for the collapsed pill
  const displayAddr = walletAddress || btcAddress || 'Connected';

  const handleNotify = (msg: string) => {
    notify('info', 'Copied', msg);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Collapsed pill — click to toggle dropdown */}
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: dropdownOpen ? 'var(--bg-card)' : 'var(--bg-elevated)',
          color: 'var(--text-base)',
          padding: '8px 14px', borderRadius: 'var(--radius-full)',
          fontWeight: 600, fontSize: '0.8125rem',
          border: 'none', cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-card)'; }}
        onMouseLeave={(e) => { if (!dropdownOpen) e.currentTarget.style.background = 'var(--bg-elevated)'; }}
      >
        {/* Live indicator */}
        <div style={{
          width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--green)',
          boxShadow: '0 0 6px var(--green)',
          flexShrink: 0,
        }} />

        {/* Primary address */}
        <span style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>
          {typeof displayAddr === 'string' && displayAddr.length > 12
            ? formatAddress(displayAddr, 5, 4)
            : displayAddr}
        </span>

        <ChevronDown
          size={14}
          style={{
            transition: 'transform 200ms ease',
            transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            opacity: 0.5,
          }}
        />
      </button>

      {/* Dropdown panel */}
      {dropdownOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)', right: 0,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          border: '1px solid var(--border-separator)',
          boxShadow: 'var(--shadow-heavy)',
          padding: '16px',
          minWidth: '320px',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 200,
          animation: 'slideUp 200ms ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <span style={{
              fontSize: '0.6875rem', fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '1.2px',
            }}>
              Connected Addresses
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); disconnect(); setDropdownOpen(false); }}
              title="Disconnect wallet"
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: 'var(--radius-full)',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', fontSize: '0.6875rem', fontWeight: 600,
                transition: 'all 150ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-negative)'; e.currentTarget.style.background = 'rgba(243, 114, 127, 0.08)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={12} />
              Disconnect
            </button>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'var(--border-separator)', margin: '0 0 10px' }} />

          {/* Address rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {walletAddress && (
              <AddressRow
                chain={isBtcLike(walletAddress) ? 'btc' : 'ckb'}
                address={walletAddress}
                onNotify={handleNotify}
              />
            )}
            {btcAddress && btcAddress !== walletAddress && (
              <AddressRow
                chain="btc"
                address={btcAddress}
                onNotify={handleNotify}
              />
            )}
            {!walletAddress && !btcAddress && (
              <div style={{ padding: '8px 0', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                No address resolved
              </div>
            )}
          </div>

          {/* Testnet indicator */}
          <div style={{
            marginTop: '12px', paddingTop: '10px',
            borderTop: '1px solid var(--border-separator)',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: 'var(--text-warning)',
            }} />
            <span style={{
              fontSize: '0.625rem', color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '1px',
            }}>
              Testnet
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
