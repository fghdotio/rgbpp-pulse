/**
 * AssetMetadataProvider — TEMPORARY implementation on btc-assets-api.
 *
 * Nobody owns asset metadata yet. btc-assets-api's `/rgbpp/v1/assets/type`
 * answers it today, so that is what this stands on; when a real metadata service
 * exists, add a sibling implementation of `AssetMetadataProvider` and swap the
 * factory in `./index.ts`.
 *
 * Metadata is the one thing here that is genuinely static per type script, so it
 * is worth caching across sessions. The cache lives in a decorator rather than
 * inside the implementation, so it survives that swap.
 */
import { cacheGet, cacheSet } from '@/lib/utils/cache';
import { createHttpClient } from './http';
import type {
  AssetMetadata,
  AssetMetadataProvider,
  CkbScript,
} from './types';

/** btc-assets-api's `/rgbpp/v1/assets/type` response. */
type WireAssetType =
  | {
      type: 'xudt';
      symbol: string;
      name: string;
      decimal: number;
      type_hash?: string;
      total_supply?: string;
      issuer?: string;
    }
  | {
      type: 'spore';
      contentType: string;
      cluster?: { id: string; name: string; description: string };
    }
  | null;

export function createBtcAssetsApiMetadata(baseUrl: string): AssetMetadataProvider {
  const http = createHttpClient(baseUrl);

  return {
    async getAssetMetadata(typeScript: CkbScript): Promise<AssetMetadata> {
      const encoded = encodeURIComponent(JSON.stringify(typeScript));
      const res = await http.getOrNull<WireAssetType>(
        `/rgbpp/v1/assets/type?type_script=${encoded}`,
      );
      if (!res) return null;

      if (res.type === 'spore') {
        return {
          type: 'spore',
          contentType: res.contentType,
          cluster: res.cluster,
        };
      }
      return {
        type: 'xudt',
        symbol: res.symbol,
        name: res.name,
        decimal: res.decimal,
        typeHash: res.type_hash,
        totalSupply: res.total_supply,
        issuer: res.issuer,
      };
    },
  };
}

/**
 * Wrap a provider so each type script is only ever fetched once per browser.
 *
 * In-flight requests are shared too: asset discovery asks about the same type
 * script once per cell, and without this a wallet holding twenty cells of one
 * token would fire twenty identical lookups.
 */
export function withMetadataCache(
  provider: AssetMetadataProvider,
): AssetMetadataProvider {
  const inFlight = new Map<string, Promise<AssetMetadata>>();

  return {
    async getAssetMetadata(typeScript: CkbScript): Promise<AssetMetadata> {
      const key = `${typeScript.codeHash}:${typeScript.hashType}:${typeScript.args}`;

      const cached = cacheGet<AssetMetadata>('assetMetadata', key);
      if (cached !== undefined) return cached;

      const pending = inFlight.get(key);
      if (pending) return pending;

      const request = provider
        .getAssetMetadata(typeScript)
        .then((result) => {
          cacheSet('assetMetadata', key, result);
          return result;
        })
        .finally(() => {
          inFlight.delete(key);
        });

      inFlight.set(key, request);
      return request;
    },
  };
}
