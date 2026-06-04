"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Coins,
  Image,
  ArrowLeftRight,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePipelines } from "@/lib/context/pipeline-context";

const navigation = [
  { name: "Portfolio", href: "/", icon: LayoutDashboard },
  { name: "Tokens", href: "/tokens", icon: Coins },
  { name: "DOBs", href: "/dobs", icon: Image },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
];

const externalLinks = [
  { name: "CKB Explorer", href: "https://explorer.nervos.org/", icon: ExternalLink },
  { name: "RGB++ Docs", href: "https://rgbpp.com/docs/introduction", icon: ExternalLink },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { activeCount } = usePipelines();

  return (
    <aside
      className={cn(
        "flex flex-col h-screen border-r border-border bg-card transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-border">
        <img src="/logo.svg" alt="LeapFi" className="size-8" />
        {!collapsed && (
          <div className="min-w-0">
            <span
              className="block font-bold tracking-tight text-foreground leading-tight"
              style={{ fontFamily: "'Arial Rounded MT Bold', ui-rounded, system-ui, sans-serif" }}
            >
              Leap<span className="text-primary">Fi</span>
            </span>
            <span className="block text-xs text-muted-foreground leading-tight">
              RGB++ Asset Manager
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon className="size-5 shrink-0" />
                {!collapsed && (
                  <span className="flex-1">{item.name}</span>
                )}
                {!collapsed && item.name === "Transactions" && activeCount > 0 && (
                  <span className="flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-warning/15 text-warning text-xs font-medium">
                    {activeCount}
                  </span>
                )}
                {collapsed && item.name === "Transactions" && activeCount > 0 && (
                  <span className="absolute top-1 right-1 size-2 rounded-full bg-warning" />
                )}
              </Link>
            );
          })}
        </div>

        {/* External Links */}
        {!collapsed && (
          <div className="mt-8">
            <p className="px-3 mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resources
            </p>
            <div className="space-y-1">
              {externalLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </nav>

      {/* Collapse Button */}
      <div className="px-2 py-4 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ChevronLeft
            className={cn(
              "size-4 transition-transform",
              collapsed && "rotate-180"
            )}
          />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
