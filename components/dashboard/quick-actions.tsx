"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Plus } from "lucide-react";

const actions = [
  {
    label: "Leap to BTC",
    description: "Transfer assets to Bitcoin",
    icon: ArrowUpRight,
    href: "/tokens?action=leap-to-btc",
    color: "text-success",
  },
  {
    label: "Leap to CKB",
    description: "Transfer assets to CKB",
    icon: ArrowDownLeft,
    href: "/tokens?action=leap-to-ckb",
    color: "text-chart-2",
  },
  {
    label: "Transfer on BTC",
    description: "Transfer RGB++ on Bitcoin",
    icon: ArrowLeftRight,
    href: "/tokens?action=transfer-on-btc",
    color: "text-warning",
  },
  {
    label: "Mint DOB",
    description: "Create new DOB asset",
    icon: Plus,
    href: "/dobs?action=mint",
    color: "text-chart-4",
  },
];

export function QuickActions() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
          >
            <div className="size-10 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <action.icon className={`size-5 ${action.color}`} />
            </div>
            <div>
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs text-muted-foreground">{action.description}</p>
            </div>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
