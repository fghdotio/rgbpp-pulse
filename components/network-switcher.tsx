"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import {
  ALLOW_SWITCH,
  NETWORK,
  setNetwork,
  type AppNetwork,
} from "@/lib/services/network";
import { cn } from "@/lib/utils";

const NETWORKS: { id: AppNetwork; label: string; dot: string }[] = [
  { id: "mainnet", label: "Mainnet", dot: "bg-emerald-500" },
  { id: "testnet", label: "Testnet", dot: "bg-amber-500" },
];

export function NetworkSwitcher() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // NETWORK may resolve via localStorage on the client but env on the server;
  // gate render on mount to avoid a hydration mismatch on the label.
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Reserve width so the header doesn't jump when we mount.
  if (!mounted) return <div className="h-9 w-[108px]" />;

  const current = NETWORKS.find((n) => n.id === NETWORK)!;

  // Production (single-network deploy): render a static badge so the user
  // can still see which network they're on, but no dropdown.
  if (!ALLOW_SWITCH) {
    return (
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary text-sm"
        title={`Network: ${current.label}`}
      >
        <span className={cn("size-2 rounded-full", current.dot)} />
        <span className="font-medium">{current.label}</span>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 h-9 px-3 rounded-lg bg-secondary hover:bg-accent transition-colors text-sm"
        title={`Network: ${current.label}`}
      >
        <span className={cn("size-2 rounded-full", current.dot)} />
        <span className="font-medium">{current.label}</span>
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-48 bg-popover border border-border rounded-xl shadow-xl z-50 p-1">
          {NETWORKS.map((n) => {
            const active = n.id === NETWORK;
            return (
              <button
                key={n.id}
                onClick={() => setNetwork(n.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm transition-colors",
                  active ? "bg-accent/60" : "hover:bg-accent",
                )}
              >
                <span className={cn("size-2 rounded-full", n.dot)} />
                <span className="flex-1 text-left font-medium">{n.label}</span>
                {active && <Check className="size-3.5 text-muted-foreground" />}
              </button>
            );
          })}
          <p className="px-2.5 pt-1.5 pb-1 text-[11px] text-muted-foreground leading-snug">
            Switching reloads the app.
          </p>
        </div>
      )}
    </div>
  );
}
