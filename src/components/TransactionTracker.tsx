import React from 'react';
import type { TransactionPipeline, TransactionStep } from '../services/types';
import { formatTimestamp, getCkbExplorerUrl, getBtcExplorerUrl, formatAddress } from '../utils/format';
import { CheckCircle2, Circle, Loader2, XCircle, ExternalLink, Clock } from 'lucide-react';

interface Props {
  pipeline: TransactionPipeline;
  compact?: boolean;
}

const operationLabels: Record<string, string> = {
  'leap-to-btc': 'Leap to BTC',
  'transfer-on-btc': 'Transfer on BTC',
  'leap-to-ckb': 'Leap to CKB',
};

function StepIcon({ status }: { status: TransactionStep['status'] }) {
  switch (status) {
    case 'done':
      return <CheckCircle2 size={18} color="var(--green)" />;
    case 'active':
      return <Loader2 size={18} color="var(--green)" style={{ animation: 'spin 1s linear infinite' }} />;
    case 'error':
      return <XCircle size={18} color="var(--text-negative)" />;
    case 'pending':
    default:
      return <Circle size={18} color="var(--text-muted)" />;
  }
}

function StepLine({ isLast, status }: { isLast: boolean; status: TransactionStep['status'] }) {
  if (isLast) return null;
  return (
    <div
      style={{
        width: '2px',
        height: '24px',
        marginLeft: '8px',
        background:
          status === 'done'
            ? 'var(--green)'
            : status === 'active'
              ? 'linear-gradient(to bottom, var(--green), var(--text-muted))'
              : 'var(--border-separator)',
        borderRadius: '1px',
        transition: 'background 300ms ease',
      }}
    />
  );
}

export function TransactionTracker({ pipeline, compact = false }: Props) {
  const doneCount = pipeline.steps.filter((s) => s.status === 'done').length;
  const progress = (doneCount / pipeline.steps.length) * 100;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-lg)',
        padding: compact ? '16px' : '20px',
        transition: 'all 250ms ease',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '0.625rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              background:
                pipeline.status === 'completed'
                  ? 'rgba(30, 215, 96, 0.15)'
                  : pipeline.status === 'error'
                    ? 'rgba(243, 114, 127, 0.15)'
                    : 'rgba(255, 164, 43, 0.15)',
              color:
                pipeline.status === 'completed'
                  ? 'var(--green)'
                  : pipeline.status === 'error'
                    ? 'var(--text-negative)'
                    : 'var(--text-warning)',
            }}
          >
            {pipeline.status}
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
            {pipeline.assetType.toUpperCase()} · {operationLabels[pipeline.operation]}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          <Clock size={12} />
          {formatTimestamp(pipeline.createdAt)}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          background: 'var(--border-separator)',
          borderRadius: '2px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progress}%`,
            background: pipeline.status === 'error' ? 'var(--text-negative)' : 'var(--green)',
            borderRadius: '2px',
            transition: 'width 500ms ease',
          }}
        />
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {pipeline.steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '4px 0',
                opacity: step.status === 'pending' ? 0.4 : 1,
                transition: 'opacity 300ms ease',
              }}
            >
              <StepIcon status={step.status} />
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8125rem',
                    fontWeight: step.status === 'active' ? 600 : 400,
                    color: step.status === 'active' ? 'var(--text-base)' : step.status === 'done' ? 'var(--text-secondary)' : 'var(--text-muted)',
                  }}
                >
                  {step.label}
                </div>
                {step.txHash && (
                  <a
                    href={step.chain === 'btc' ? getBtcExplorerUrl(step.txHash) : getCkbExplorerUrl(step.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      transition: 'color 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--green)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                  >
                    {formatAddress(step.txHash, 8, 6)}
                    <ExternalLink size={10} />
                  </a>
                )}
              </div>
              {step.timestamp && (
                <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatTimestamp(step.timestamp)}
                </span>
              )}
            </div>
            <StepLine isLast={i === pipeline.steps.length - 1} status={step.status} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
