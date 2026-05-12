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
    <span className={cn(
      "text-[0.5625rem] py-0.5 px-2 rounded font-semibold uppercase tracking-wide",
      chain === 'btc' 
        ? "bg-orange-500/10 text-orange-500" 
        : "bg-cyan-400/10 text-cyan-400"
    )}>
      {chain.toUpperCase()}
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
    <div className="flex items-center gap-3 py-2.5 px-1 rounded-lg hover:bg-accent/30 transition-colors">
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
          "flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 flex-shrink-0",
          copied 
            ? "text-primary bg-primary/10" 
            : "text-muted-foreground hover:text-foreground hover:bg-accent"
        )}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}

export function WalletConnect() {
  const { isConnected, walletAddress, btcAddress, openConnector, disconnect, notify } = useApp();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  if (!isConnected) {
    return (
      <Button onClick={openConnector} className="gap-2 font-semibold">
        <Wallet size={18} />
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
        <Button variant="outline" className="gap-2.5 font-semibold text-sm px-4 py-2 h-auto border-border/50 hover:border-primary/30 hover:bg-accent/30">
          {/* Live indicator */}
          <div className="w-2 h-2 rounded-full bg-success shadow-[0_0_8px_hsl(var(--success))]" />

          {/* Primary address */}
          <span className="font-mono text-sm">
            {typeof displayAddr === 'string' && displayAddr.length > 12
              ? formatAddress(displayAddr, 5, 4)
              : displayAddr}
          </span>

          <ChevronDown
            size={14}
            className={cn(
              "transition-transform duration-200 text-muted-foreground",
              dropdownOpen && "rotate-180"
            )}
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-[340px] p-5 bg-card border-border/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Connected Wallet
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); disconnect(); setDropdownOpen(false); }}
            title="Disconnect wallet"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-150"
          >
            <LogOut size={14} />
            Disconnect
          </button>
        </div>

        <DropdownMenuSeparator className="bg-border/50 -mx-5 my-3" />

        {/* Address rows */}
        <div className="flex flex-col gap-1">
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
            <div className="py-3 text-sm text-muted-foreground text-center">
              No address resolved
            </div>
          )}
        </div>

        <DropdownMenuSeparator className="bg-border/50 -mx-5 my-3" />

        {/* Network indicator */}
        <div className="flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
          <span className="text-[0.6875rem] text-muted-foreground font-medium">
            Connected to Testnet
          </span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
