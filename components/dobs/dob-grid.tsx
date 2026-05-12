"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useApp } from "@/lib/context/app-context";
import { truncateAddress } from "@/lib/utils";
import { ArrowUpRight, ArrowDownLeft, Image as ImageIcon, ExternalLink } from "lucide-react";
import type { SporeAsset } from "@/lib/services/types";

// Mock data for demonstration
const mockDobs: SporeAsset[] = [
  {
    type: "spore",
    id: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    contentType: "application/json",
    content: "",
    clusterId: "0xcluster123",
    clusterName: "Nervape Collection",
    location: "ckb",
    dobDecoded: true,
    dobTraits: [
      { name: "background", value: "Blue Sky", type: "String" },
      { name: "rarity", value: "Rare", type: "String" },
    ],
  },
  {
    type: "spore",
    id: "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
    contentType: "application/json",
    content: "",
    clusterId: "0xcluster456",
    clusterName: "CKB Punks",
    location: "btc",
    dobDecoded: true,
    dobTraits: [
      { name: "background", value: "Sunset", type: "String" },
      { name: "rarity", value: "Epic", type: "String" },
    ],
  },
  {
    type: "spore",
    id: "0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456",
    contentType: "image/png",
    content: "",
    clusterId: "0xcluster123",
    clusterName: "Nervape Collection",
    location: "ckb",
    dobDecoded: false,
  },
  {
    type: "spore",
    id: "0xdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abc",
    contentType: "application/json",
    content: "",
    clusterId: "0xcluster789",
    clusterName: "RGB++ Genesis",
    location: "btc",
    dobDecoded: true,
    dobTraits: [
      { name: "type", value: "Genesis", type: "String" },
      { name: "edition", value: 42, type: "Number" },
    ],
  },
];

export function DobGrid() {
  const { isConnected } = useApp();
  const [selectedDob, setSelectedDob] = useState<SporeAsset | null>(null);

  if (!isConnected) {
    return (
      <Card className="p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="size-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <ImageIcon className="size-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground">
            Connect your wallet to view your DOB collection.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {mockDobs.map((dob) => (
          <Card
            key={dob.id}
            className={`overflow-hidden cursor-pointer transition-all hover:border-primary/50 ${
              selectedDob?.id === dob.id ? "border-primary ring-1 ring-primary" : ""
            }`}
            onClick={() => setSelectedDob(dob)}
          >
            {/* DOB Preview */}
            <div className="aspect-square bg-secondary/50 flex items-center justify-center relative">
              {dob.dobSvg ? (
                <div
                  dangerouslySetInnerHTML={{ __html: dob.dobSvg }}
                  className="w-full h-full"
                />
              ) : (
                <div className="size-20 rounded-xl bg-gradient-to-br from-primary/30 to-chart-2/30 flex items-center justify-center">
                  <ImageIcon className="size-10 text-muted-foreground" />
                </div>
              )}
              <Badge
                variant={dob.location === "ckb" ? "default" : "secondary"}
                className="absolute top-2 right-2"
              >
                {dob.location.toUpperCase()}
              </Badge>
            </div>

            <CardContent className="p-4 space-y-3">
              <div>
                <h3 className="font-medium truncate">
                  {dob.clusterName || "Unknown Collection"}
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {truncateAddress(dob.id, 8, 6)}
                </p>
              </div>

              {/* Traits Preview */}
              {dob.dobTraits && dob.dobTraits.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {dob.dobTraits.slice(0, 2).map((trait, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {trait.name}: {trait.value}
                    </Badge>
                  ))}
                  {dob.dobTraits.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{dob.dobTraits.length - 2}
                    </Badge>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                {dob.location === "ckb" ? (
                  <Button size="sm" className="flex-1 gap-1.5">
                    <ArrowUpRight className="size-3.5" />
                    Leap to BTC
                  </Button>
                ) : (
                  <Button size="sm" className="flex-1 gap-1.5">
                    <ArrowDownLeft className="size-3.5" />
                    Leap to CKB
                  </Button>
                )}
                <Button size="sm" variant="outline" className="px-2.5">
                  <ExternalLink className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* DOB Detail Modal would go here */}
    </>
  );
}
