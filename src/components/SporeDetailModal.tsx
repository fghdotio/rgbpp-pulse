import React, { useState, useEffect } from 'react';
import type { SporeAsset, RgbppOperation } from '../services/types';
import type { DobTrait } from '../services/dob';
import { getDisplayTraits, isImageUri, extractImage } from '../services/dob';
import { locationBadge, actionButton } from './AssetCard';
import { DobImage } from './DobImage';
import {
  X, Gem, ArrowUpRight, ArrowDownLeft, ArrowLeftRight,
  Fingerprint, Dna, Hash, Layers, FileType, Loader2, Copy, Check, ImageIcon,
} from 'lucide-react';

interface SporeDetailModalProps {
  asset: SporeAsset;
  onClose: () => void;
  onAction: (op: RgbppOperation) => void;
}

/**
 * Format a trait value for display.
 * Strips internal DOB template syntax like `(%var):['...']`.
 */
function formatTraitValue(value: string | number): string {
  if (typeof value === 'number') return value.toLocaleString();
  const str = String(value);
  if (str.includes('<_>') || str.includes('<%') || str.startsWith('(%')) {
    return '—';
  }
  return str;
}

/**
 * Detect DOB version from content type string.
 * Spore DOB uses content types like "dob/0" or "dob/1".
 */
function getDobVersion(contentType: string): string | null {
  if (!contentType) return null;
  const match = contentType.match(/^dob\/(\d+)/i);
  return match ? match[1] : null;
}

function CopyableField({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
      <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {value}
        </div>
      </div>
      <button
        onClick={handleCopy}
        style={{
          padding: '4px', background: 'transparent', border: 'none',
          color: copied ? 'var(--green)' : 'var(--text-muted)', cursor: 'pointer',
          transition: 'color 150ms ease', flexShrink: 0,
        }}
        onMouseEnter={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-base)'; }}
        onMouseLeave={(e) => { if (!copied) e.currentTarget.style.color = 'var(--text-muted)'; }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
      </button>
    </div>
  );
}

/**
 * Renders an image from a btcfs://, ipfs://, or http(s):// URI.
 * For btcfs/ipfs, fetches via the DOB decoder server and displays as base64 data URI.
 */
function TraitImage({ uri }: { uri: string }) {
  const uriType = isImageUri(uri);
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (uriType === 'http') {
      setSrc(uri.trim());
      return;
    }
    if (uriType === 'btcfs' || uriType === 'ipfs') {
      setLoading(true);
      extractImage(uri.trim())
        .then((base64) => {
          if (base64) {
            // Try to guess mime type from URI, default to png
            setSrc(`data:image/png;base64,${base64}`);
          } else {
            setError(true);
          }
        })
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }
  }, [uri, uriType]);

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '80px',
        background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)', fontSize: '0.6875rem', gap: '6px',
      }}>
        <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
        Loading image…
      </div>
    );
  }

  if (error || !src) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', height: '48px',
        background: 'var(--bg-base)', borderRadius: 'var(--radius-md)',
        color: 'var(--text-muted)', fontSize: '0.625rem', gap: '4px',
      }}>
        <ImageIcon size={12} />
        Failed to load image
      </div>
    );
  }

  return (
    <img
      src={src}
      alt="DOB trait image"
      style={{
        width: '100%', maxHeight: '200px', objectFit: 'contain',
        borderRadius: 'var(--radius-md)', background: 'var(--bg-base)',
      }}
      onError={() => setError(true)}
    />
  );
}

function TraitRow({ trait }: { trait: DobTrait }) {
  const val = formatTraitValue(trait.value);
  const imageType = typeof trait.value === 'string' ? isImageUri(trait.value) : false;

  // If the trait value is an image URI, show it as image
  if (imageType) {
    return (
      <div style={{ padding: '10px 16px' }}>
        <div className="detail-trait-name" style={{ marginBottom: '8px' }}>
          {trait.name}
        </div>
        <TraitImage uri={String(trait.value)} />
        <div style={{
          fontSize: '0.5625rem', color: 'var(--text-muted)', marginTop: '4px',
          fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {String(trait.value)}
        </div>
      </div>
    );
  }

  return (
    <div className="detail-trait-row">
      <span className="detail-trait-name">{trait.name}</span>
      <span className="detail-trait-value">{val}</span>
    </div>
  );
}

export function SporeDetailModal({ asset, onClose, onAction }: SporeDetailModalProps) {
  const dobVersion = getDobVersion(asset.contentType);
  const allTraits = asset.dobTraits || [];
  const displayTraits = getDisplayTraits(allTraits);
  const internalTraits = allTraits.filter((t) => {
    const name = t.name.toLowerCase();
    return name.startsWith('prev.') || name.startsWith('prev<');
  });
  const hasDob = allTraits.length > 0;
  const dna = asset.dobContent?.dna as string | undefined;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', padding: 0, overflow: 'hidden' }}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-separator)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gem size={18} color="var(--green)" />
            <span style={{ fontWeight: 700, fontSize: '1rem' }}>
              {asset.clusterName || 'DOB'}
            </span>
            {locationBadge(asset.location)}
            {dobVersion !== null && (
              <span style={{
                padding: '2px 8px', borderRadius: '4px', fontSize: '0.625rem',
                fontWeight: 700, background: 'rgba(30, 215, 96, 0.12)',
                color: 'var(--green)', letterSpacing: '0.5px',
              }}>
                DOB/{dobVersion}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '6px', borderRadius: '50%', background: 'var(--bg-elevated)',
              border: 'none', color: 'var(--text-secondary)', cursor: 'pointer',
              transition: 'all 150ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-base)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '20px' }}>
          {/* Preview */}
          <div style={{
            width: '100%', aspectRatio: '1', borderRadius: 'var(--radius-lg)',
            background: (asset.dobSvg || asset.dobImageUri) ? 'var(--bg-base)' : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '20px', overflow: 'hidden', position: 'relative',
          }}>
            {(asset.dobSvg || asset.dobImageUri) ? (
              <DobImage svg={asset.dobSvg} uri={asset.dobImageUri} style={{ objectFit: 'contain' }} />
            ) : (
              <Gem size={48} color="var(--text-muted)" style={{ opacity: 0.4 }} />
            )}
          </div>

          {/* Metadata fields */}
          <div style={{
            background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
            padding: '4px 16px', marginBottom: '16px',
          }}>
            <CopyableField label="Spore ID" value={asset.id} icon={<Fingerprint size={14} />} />
            {asset.clusterId && (
              <>
                <div style={{ height: '1px', background: 'var(--border-separator)' }} />
                <CopyableField label="Cluster ID" value={asset.clusterId} icon={<Layers size={14} />} />
              </>
            )}
            {dna && (
              <>
                <div style={{ height: '1px', background: 'var(--border-separator)' }} />
                <CopyableField label="DNA" value={dna} icon={<Dna size={14} />} />
              </>
            )}
            {asset.contentType && asset.contentType !== 'unknown' && (
              <>
                <div style={{ height: '1px', background: 'var(--border-separator)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0' }}>
                  <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}><FileType size={14} /></div>
                  <div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Content Type</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{asset.contentType}</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* DOB Traits */}
          {!asset.dobDecoded ? (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '24px', color: 'var(--text-muted)', fontSize: '0.75rem',
            }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Decoding DOB traits…
            </div>
          ) : hasDob ? (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                marginBottom: '12px',
              }}>
                <Hash size={14} color="var(--green)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Traits</span>
                <span style={{
                  fontSize: '0.625rem', color: 'var(--text-muted)',
                  background: 'var(--bg-elevated)', padding: '1px 6px', borderRadius: '4px',
                }}>
                  {displayTraits.length}
                </span>
              </div>
              <div style={{
                background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}>
                {displayTraits.map((trait, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div style={{ height: '1px', background: 'var(--border-separator)', margin: '0 16px' }} />}
                    <TraitRow trait={trait} />
                  </React.Fragment>
                ))}
              </div>

              {/* Internal / rendering traits (collapsed) */}
              {internalTraits.length > 0 && (
                <details style={{ marginTop: '12px' }}>
                  <summary style={{
                    fontSize: '0.6875rem', color: 'var(--text-muted)', cursor: 'pointer',
                    listStyle: 'none', display: 'flex', alignItems: 'center', gap: '6px',
                    userSelect: 'none',
                  }}>
                    <span style={{ fontSize: '0.5rem' }}>▶</span>
                    {internalTraits.length} internal rendering traits
                  </summary>
                  <div style={{
                    background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden', marginTop: '8px', opacity: 0.7,
                  }}>
                    {internalTraits.map((trait, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <div style={{ height: '1px', background: 'var(--border-separator)', margin: '0 16px' }} />}
                        <TraitRow trait={trait} />
                      </React.Fragment>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '20px', color: 'var(--text-muted)',
              fontSize: '0.75rem',
            }}>
              Not a DOB — no decoded traits available
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{
          padding: '16px 20px', borderTop: '1px solid var(--border-separator)',
          display: 'flex', flexWrap: 'wrap', gap: '8px',
        }}>
          {asset.location === 'ckb' && actionButton('Leap to BTC', <ArrowUpRight size={12} />, () => onAction('leap-to-btc'))}
          {asset.location === 'btc' && actionButton('Transfer', <ArrowLeftRight size={12} />, () => onAction('transfer-on-btc'))}
          {asset.location === 'btc' && actionButton('Leap to CKB', <ArrowDownLeft size={12} />, () => onAction('leap-to-ckb'))}
        </div>
      </div>
    </div>
  );
}
