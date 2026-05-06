/**
 * UnifiedTxRow — a single expandable row in the unified transaction list.
 *
 * Collapsed: operation type | txid (truncated) | status badge | timestamp
 * Expanded:  BTC tx link, CKB tx link, transaction time (full)
 */
import { useState } from 'react';
import type { UnifiedTransaction } from '../services/mergeTransactions';
import { formatAddress, formatTimestamp, getBtcExplorerUrl, getCkbExplorerUrl } from '../utils/format';
import { CheckCircle2, Clock, Loader2, XCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  tx: UnifiedTransaction;
}

function StatusBadge({ status }: { status: UnifiedTransaction['status'] }) {
  const config = {
    confirmed: { icon: <CheckCircle2 size={14} />, label: 'Confirmed', color: 'var(--green)', bg: 'rgba(30, 215, 96, 0.12)' },
    pending: { icon: <Clock size={14} />, label: 'Pending', color: 'var(--text-warning)', bg: 'rgba(255, 164, 43, 0.12)' },
    active: { icon: <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />, label: 'In Progress', color: 'var(--text-warning)', bg: 'rgba(255, 164, 43, 0.12)' },
    error: { icon: <XCircle size={14} />, label: 'Error', color: 'var(--text-negative)', bg: 'rgba(243, 114, 127, 0.12)' },
  }[status];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '0.6875rem',
        fontWeight: 600,
        color: config.color,
        background: config.bg,
        whiteSpace: 'nowrap',
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

const opLabels: Record<string, string> = {
  'leap-to-btc': 'Leap → BTC',
  'transfer-on-btc': 'Transfer',
  'leap-to-ckb': 'Leap → CKB',
  'rgbpp': 'RGB++',
  'unknown': '—',
};



function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0' }}>
      <span
        style={{
          fontSize: '0.6875rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          minWidth: '80px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', flex: 1, minWidth: 0 }}>
        {children}
      </span>
    </div>
  );
}

function TxLink({ hash, chain }: { hash: string; chain: 'btc' | 'ckb' }) {
  const url = chain === 'btc' ? getBtcExplorerUrl(hash) : getCkbExplorerUrl(hash);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        fontFamily: 'monospace',
        fontSize: '0.8125rem',
        color: 'var(--text-base)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        transition: 'color 150ms ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--green)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-base)'; }}
    >
      {formatAddress(hash, 10, 8)}
      <ExternalLink size={11} />
    </a>
  );
}

export function UnifiedTxRow({ tx }: Props) {
  const [expanded, setExpanded] = useState(false);

  const displayTxId = tx.btcTxId || tx.ckbTxHash || '';

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        transition: 'background 150ms ease',
      }}
    >
      {/* ── Collapsed summary row (clickable) ── */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-base)',
          textAlign: 'left',
          transition: 'background 150ms ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-elevated)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        {/* Operation type */}
        <span
          style={{
            fontSize: '0.6875rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'var(--bg-base)',
            minWidth: '72px',
            textAlign: 'center',
            whiteSpace: 'nowrap',
          }}
        >
          {opLabels[tx.operationType] ?? tx.operationType}
        </span>

        {/* TX ID (truncated) */}
        <span
          style={{
            flex: 1,
            fontSize: '0.8125rem',
            fontFamily: displayTxId ? 'monospace' : 'inherit',
            color: displayTxId ? 'var(--text-base)' : 'var(--text-muted)',
            fontStyle: displayTxId ? 'normal' : 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {displayTxId ? formatAddress(displayTxId, 8, 6) : 'Building...'}
        </span>

        {/* Status badge */}
        <StatusBadge status={tx.status} />

        {/* Timestamp */}
        <span
          style={{
            fontSize: '0.6875rem',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            minWidth: '56px',
            textAlign: 'right',
          }}
        >
          {formatTimestamp(tx.timestamp)}
        </span>

        {/* Chevron */}
        {expanded
          ? <ChevronUp size={14} color="var(--text-muted)" />
          : <ChevronDown size={14} color="var(--text-muted)" />}
      </button>

      {/* ── Expanded detail panel ── */}
      {expanded && (
        <div
          style={{
            padding: '4px 16px 16px',
            borderTop: '1px solid var(--border-separator)',
          }}
        >
          {/* BTC TX */}
          {tx.btcTxId && (
            <DetailRow label="BTC TX">
              <TxLink hash={tx.btcTxId} chain="btc" />
            </DetailRow>
          )}

          {/* CKB TX */}
          {tx.ckbTxHash && (
            <DetailRow label="CKB TX">
              <TxLink hash={tx.ckbTxHash} chain="ckb" />
            </DetailRow>
          )}

        </div>
      )}
    </div>
  );
}
