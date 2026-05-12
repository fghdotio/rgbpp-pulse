import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatAddress, copyToClipboard, getCkbAddressExplorerUrl, getBtcAddressExplorerUrl } from '../utils/format';
import { Wallet, LogOut, Copy, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

/**
 * Determines if an address is BTC-like based on common prefixes.
 */
function isBtcLike(addr: string): boolean {
  return /^(tb1|bc1|[13mn2])/.test(addr);
}

/**
 * Small chain badge component.
 */
function ChainBadge({ chain }: { chain: 'ckb' | 'btc' }) {
  return (
    <Badge variant={chain === 'btc' ? 'warning' : 'info'} className="text-[0.5625rem] py-0.5 px-1.5">
      {chain.toUpperCase()}
    </Badge>
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
    <div className="flex items-center gap-2 py-1.5">
      <ChainBadge chain={chain} />

      {/* Clickable address to explorer */}
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title={address}
        className="flex-1 min-w-0 text-[0.8125rem] font-mono text-muted-foreground hover:text-primary transition-colors duration-150 overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-1"
      >
        {formatAddress(address, 8, 6)}
        <ExternalLink size={10} className="flex-shrink-0 opacity-60" />
      </a>

      {/* Copy button */}
      <button
        onClick={handleCopy}
        title="Copy full address"
        className={cn(
          "flex items-center justify-center w-6 h-6 rounded-full transition-all duration-150 flex-shrink-0",
          copied 
            ? "text-primary" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function WalletConnect() {
  const { isConnected, walletAddress, btcAddress, openConnector, disconnect, notify } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!isConnected) {
    return (
      <Button onClick={openConnector} className="gap-2 uppercase tracking-wide">
        <Wallet size={16} />
        Connect Wallet
      </Button>
    );
  }

  // Determine the display address for the collapsed pill
  const displayAddr = walletAddress || btcAddress || 'Connected';

  const handleNotify = (msg: string) => {
    notify('info', 'Copied', msg);
  };

  return (
    <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="pill" className="gap-2 font-semibold text-[0.8125rem]">
          {/* Live indicator */}
          <div className="w-[7px] h-[7px] rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))] flex-shrink-0" />

          {/* Primary address */}
          <span className="font-mono text-[0.8125rem]">
            {typeof displayAddr === 'string' && displayAddr.length > 12
              ? formatAddress(displayAddr, 5, 4)
              : displayAddr}
          </span>

          <ChevronDown
            size={14}
            className={cn(
              "transition-transform duration-200 opacity-50",
              dropdownOpen && "rotate-180"
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[320px] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[0.6875rem] font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Addresses
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); disconnect(); setDropdownOpen(false); }}
            title="Disconnect wallet"
            className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.6875rem] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
          >
            <LogOut size={12} />
            Disconnect
          </button>
        </div>

        <DropdownMenuSeparator />

        {/* Address rows */}
        <div className="flex flex-col gap-0.5 py-2">
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
            <div className="py-2 text-[0.8125rem] text-muted-foreground">
              No address resolved
            </div>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* Testnet indicator */}
        <div className="flex items-center gap-1.5 pt-2">
          <div className="w-[5px] h-[5px] rounded-full bg-warning" />
          <span className="text-[0.625rem] text-muted-foreground uppercase tracking-wider">
            Testnet
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
