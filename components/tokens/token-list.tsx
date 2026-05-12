"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { formatBalance, truncateAddress } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, Coins, Copy, Check } from "lucide-react";
import type { UdtAsset } from "@/lib/services/types";

// Mock data for demonstration
const mockTokens: UdtAsset[] = [
  {
    type: "udt",
    name: "RGB++ Test Token",
    symbol: "RTT",
    decimals: 8,
    balance: BigInt("100000000000"),
    typeScriptArgs: "0xe6fa637f763fd63732146015b0964fe88f16996846b3d0a164bf15c069ff008b",
    typeScriptCodeHash: "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
    typeScriptHashType: "type",
    location: "ckb",
  },
  {
    type: "udt",
    name: "Stable Coin X",
    symbol: "SCX",
    decimals: 6,
    balance: BigInt("5000000000"),
    typeScriptArgs: "0x8418c9699aa47ef02f45f021a6d892ea2acdb32a45b5d75f28a2bf2c0eb7a73d",
    typeScriptCodeHash: "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
    typeScriptHashType: "type",
    location: "btc",
  },
  {
    type: "udt",
    name: "Test Token",
    symbol: "TST",
    decimals: 8,
    balance: BigInt("25000000000"),
    typeScriptArgs: "0x2a3f1c9d8e7b6a5f4c3d2e1b0a9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f",
    typeScriptCodeHash: "0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb",
    typeScriptHashType: "type",
    location: "btc",
  },
];

export function TokenList() {
  const { isConnected } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<UdtAsset | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <Coins className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your wallet to view and manage your tokens.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" className="bg-primary/15 text-primary">
              All Tokens
            </Button>
            <Button variant="ghost" size="sm">
              On CKB
            </Button>
            <Button variant="ghost" size="sm">
              On BTC
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Token Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mockTokens.map((token) => (
          <Card
            key={token.typeScriptArgs}
            className={`cursor-pointer transition-all hover:border-primary/50 ${
              selectedToken?.typeScriptArgs === token.typeScriptArgs ? "border-primary" : ""
            }`}
            onClick={() => setSelectedToken(token)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {token.symbol.slice(0, 2)}
                    </span>
                  </div>
                  <div>
                    <CardTitle className="text-base">{token.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">{token.symbol}</p>
                  </div>
                </div>
                <Badge variant={token.location === "ckb" ? "default" : "secondary"}>
                  {token.location.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">
                  {formatBalance(token.balance, token.decimals)}
                </p>
                <p className="text-sm text-muted-foreground">{token.symbol}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Type Args</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(token.typeScriptArgs, token.typeScriptArgs);
                    }}
                    className="flex items-center gap-1 text-foreground hover:text-primary transition-colors"
                  >
                    <span className="font-mono">{truncateAddress(token.typeScriptArgs, 6, 4)}</span>
                    {copiedId === token.typeScriptArgs ? (
                      <Check className="size-3 text-success" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                {token.location === "ckb" ? (
                  <Button size="sm" className="flex-1 gap-1.5">
                    <ArrowUpRight className="size-4" />
                    Leap to BTC
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" className="flex-1 gap-1.5">
                      <ArrowLeftRight className="size-4" />
                      Transfer
                    </Button>
                    <Button size="sm" className="flex-1 gap-1.5">
                      <ArrowDownLeft className="size-4" />
                      Leap to CKB
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
