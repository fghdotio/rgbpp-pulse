import { useState } from 'react';
import type { RgbppOperation, UdtAsset } from '../services/types';
import { formatAmount } from '../utils/format';
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

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
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.5625rem] font-semibold transition-all duration-150 border",
        copied
          ? "bg-primary/15 border-primary/20 text-primary"
          : "bg-accent/50 border-border text-muted-foreground hover:text-foreground"
      )}
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

  const isValid = address && (!needsAmount || amount);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-primary">
              {meta.icon}
            </div>
            <div>
              <DialogTitle>{meta.label}</DialogTitle>
              <DialogDescription className="text-xs">{assetName}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Description */}
        <p className="text-[0.8125rem] text-muted-foreground leading-relaxed">
          {meta.desc}
        </p>

        {/* UDT Detail Card */}
        {udtInfo && (
          <div className="bg-background rounded-md p-4 border border-border">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center flex-shrink-0">
                <Coins size={16} className="text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-[0.9375rem]">{udtInfo.symbol}</div>
                <div className="text-[0.6875rem] text-muted-foreground">{udtInfo.name}</div>
              </div>
              <Badge variant={udtInfo.location === 'btc' ? 'default' : 'info'}>
                {udtInfo.location === 'btc' ? 'RGB++' : 'CKB'}
              </Badge>
            </div>

            {/* Info rows */}
            <div className="flex flex-col gap-2">
              {/* Balance */}
              <div className="flex justify-between items-baseline">
                <span className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide">Balance</span>
                <span className="text-base font-bold">
                  {formatAmount(udtInfo.balance, udtInfo.decimals)}{' '}
                  <span className="text-xs font-normal text-muted-foreground">{udtInfo.symbol}</span>
                </span>
              </div>
              {/* Decimals */}
              <div className="flex justify-between items-center">
                <span className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide">Decimals</span>
                <span className="text-[0.8125rem] font-mono">{udtInfo.decimals}</span>
              </div>
              {/* Type Script Args */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[0.6875rem] text-muted-foreground uppercase tracking-wide">Type Args</span>
                  <CopyButton text={udtInfo.typeScriptArgs} />
                </div>
                <div className="text-[0.625rem] font-mono text-muted-foreground break-all leading-relaxed bg-accent/30 p-1.5 rounded">
                  {udtInfo.typeScriptArgs}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {operation === 'leap-to-ckb' ? 'CKB Address' : 'BTC Address'}
              </label>
              {myAddress && (
                <button
                  onClick={() => setAddress(myAddress)}
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.625rem] font-semibold border transition-all duration-150",
                    address === myAddress
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                  )}
                >
                  My Address
                </button>
              )}
            </div>
            <Input
              placeholder={operation === 'leap-to-ckb' ? 'ckt1q...' : 'tb1q...'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          {needsAmount && (
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Amount
              </label>
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || loading}
          >
            {loading ? 'Submitting...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
