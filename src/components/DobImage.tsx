import { useState, useEffect } from 'react';
import { ImageIcon } from 'lucide-react';

interface DobImageProps {
  /** Rendered SVG string (preferred) */
  svg?: string;
  /** Fallback image URI (http, btcfs://, ipfs://) */
  uri?: string;
  alt?: string;
  style?: React.CSSProperties;
  /** Show a compact placeholder on error (for small cards) */
  compact?: boolean;
}

/**
 * Renders a DOB image.
 * Priority: SVG string → direct URL → placeholder.
 */
export function DobImage({ svg, uri, alt = 'DOB image', style, compact }: DobImageProps) {
  const [error, setError] = useState(false);

  // Reset error when inputs change
  useEffect(() => { setError(false); }, [svg, uri]);

  // Priority 1: rendered SVG
  if (svg && !error) {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const svgUrl = URL.createObjectURL(blob);
    return (
      <img
        src={svgUrl}
        alt={alt}
        style={{
          width: '100%', height: '100%', objectFit: 'contain',
          ...style,
        }}
        onError={() => setError(true)}
        onLoad={() => URL.revokeObjectURL(svgUrl)}
      />
    );
  }

  // Priority 2: direct URL (http/https only; btcfs/ipfs would need extraction)
  if (uri && !error) {
    if (uri.startsWith('http://') || uri.startsWith('https://')) {
      return (
        <img
          src={uri}
          alt={alt}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            ...style,
          }}
          onError={() => setError(true)}
        />
      );
    }
  }

  // Placeholder
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: '100%', height: '100%', minHeight: compact ? '40px' : '48px',
      color: 'var(--text-muted)', fontSize: '0.625rem', gap: '4px',
      ...style,
    }}>
      <ImageIcon size={compact ? 14 : 16} />
    </div>
  );
}
