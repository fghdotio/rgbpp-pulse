import type { UdtAsset, SporeAsset } from '../services/types';
import { formatAmount, formatAddress } from '../utils/format';
import { DobImage } from './DobImage';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Gem, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface UdtCardProps {
  asset: UdtAsset;
  onAction: (op: 'leap-to-btc' | 'transfer-on-btc' | 'leap-to-ckb') => void;
}

interface SporeCardProps {
  asset: SporeAsset;
  onAction: (op: 'leap-to-btc' | 'transfer-on-btc' | 'leap-to-ckb') => void;
  onClick?: () => void;
}

export const LocationBadge = ({ location }: { location: 'ckb' | 'btc' }) => (
  <Badge variant={location === 'btc' ? 'default' : 'info'} className="text-[0.625rem]">
    {location === 'btc' ? 'RGB++' : 'CKB'}
  </Badge>
);

export const MockBadge = () => (
  <Badge variant="muted" className="text-[0.5625rem] gap-1 border border-dashed border-border">
    <FlaskConical size={9} />
    Mock
  </Badge>
);

export function UdtCard({ asset, onAction }: UdtCardProps) {
  return (
    <Card className="p-5 transition-all duration-250 hover:bg-muted hover:shadow-lg hover:-translate-y-0.5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
          <Coins size={20} className="text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-base">{asset.symbol}</span>
            <LocationBadge location={asset.location} />
            {asset.isMock && <MockBadge />}
          </div>
          <div className="text-xs text-muted-foreground">{asset.name}</div>
        </div>
      </div>

      {/* Balance */}
      <div className="mb-4">
        <div className="text-2xl font-bold tracking-tight">
          {formatAmount(asset.balance, asset.decimals)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        {asset.location === 'ckb' && (
          <Button variant="outline" size="sm" onClick={() => onAction('leap-to-btc')} className="text-[0.6875rem] h-7 rounded-full">
            <ArrowUpRight size={12} />
            Leap to BTC
          </Button>
        )}
        {asset.location === 'btc' && (
          <>
            <Button variant="outline" size="sm" onClick={() => onAction('transfer-on-btc')} className="text-[0.6875rem] h-7 rounded-full">
              <ArrowLeftRight size={12} />
              Transfer
            </Button>
            <Button variant="outline" size="sm" onClick={() => onAction('leap-to-ckb')} className="text-[0.6875rem] h-7 rounded-full">
              <ArrowDownLeft size={12} />
              Leap to CKB
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

/**
 * SporeCard — compact card for the grid view.
 */
export function SporeCard({ asset, onClick }: SporeCardProps) {
  const dobName = asset.clusterName || 'DOB';

  return (
    <Card 
      onClick={onClick}
      className="p-4 transition-all duration-250 cursor-pointer hover:bg-muted hover:shadow-lg hover:-translate-y-0.5"
    >
      {/* Preview area */}
      <div
        className={cn(
          "w-full aspect-square rounded-md flex items-center justify-center mb-3 overflow-hidden relative",
          !(asset.dobSvg || asset.dobImageUri) && "bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460]"
        )}
        style={{
          background: (asset.dobSvg || asset.dobImageUri) ? 'hsl(var(--background))' : undefined,
        }}
      >
        {/* Decoding shimmer */}
        {!asset.dobDecoded && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent bg-[length:200%_100%] animate-shimmer" />
        )}
        {(asset.dobSvg || asset.dobImageUri) ? (
          <DobImage svg={asset.dobSvg} uri={asset.dobImageUri} compact />
        ) : (
          <Gem size={32} className="text-muted-foreground opacity-50" />
        )}
        <div className="absolute top-2 right-2 flex gap-1">
          {asset.isMock && <MockBadge />}
          <LocationBadge location={asset.location} />
        </div>
      </div>

      {/* Info */}
      <div>
        <div className="font-semibold text-sm mb-0.5">
          {dobName}
        </div>
        <div className="text-[0.6875rem] text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap">
          {formatAddress(asset.id, 8, 6)}
        </div>
      </div>
    </Card>
  );
}
