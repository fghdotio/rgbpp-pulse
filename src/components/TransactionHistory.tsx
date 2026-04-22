import React from 'react';
import type { TransactionPipeline } from '../services/types';
import { formatTimestamp, getCkbExplorerUrl, getBtcExplorerUrl, formatAddress } from '../utils/format';
import { CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  pipelines: TransactionPipeline[];
  onClear?: () => void;
}

const opLabels: Record<string, string> = {
  'leap-to-btc': 'Leap to BTC',
  'transfer-on-btc': 'Transfer on BTC',
  'leap-to-ckb': 'Leap to CKB',
};

export function TransactionHistory({ pipelines, onClear }: Props) {
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  if (pipelines.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
        No transaction history yet
      </div>
    );
  }

  return (
    <div>
      {onClear && pipelines.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Clear History
          </button>
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {pipelines.map((p) => {
          const isExp = expandedId === p.id;
          const firstHash = p.steps.find((s) => s.txHash)?.txHash;
          return (
            <div key={p.id} style={{ background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <button onClick={() => setExpandedId(isExp ? null : p.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-base)', textAlign: 'left' }}>
                {p.status === 'completed' ? <CheckCircle2 size={16} color="var(--green)" /> : <XCircle size={16} color="var(--text-negative)" />}
                <span style={{ fontWeight: 600, fontSize: '0.8125rem', minWidth: '60px' }}>{p.assetType.toUpperCase()}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-base)' }}>{opLabels[p.operation]}</span>
                {firstHash && <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{formatAddress(firstHash, 6, 4)}</span>}
                <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{formatTimestamp(p.createdAt)}</span>
                {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {isExp && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-separator)' }}>
                  {p.steps.map((step) => (
                    <div key={step.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', fontSize: '0.75rem' }}>
                      {step.status === 'done' ? <CheckCircle2 size={12} color="var(--green)" /> : <XCircle size={12} color="var(--text-negative)" />}
                      <span style={{ flex: 1, color: 'var(--text-secondary)' }}>{step.label}</span>
                      {step.txHash && (
                        <a href={step.chain === 'btc' ? getBtcExplorerUrl(step.txHash) : getCkbExplorerUrl(step.txHash)} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                          {formatAddress(step.txHash, 6, 4)}<ExternalLink size={9} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
