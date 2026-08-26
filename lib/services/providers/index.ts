/**
 * Provider wiring.
 *
 * This is the swap point. Each provider is one factory call against one proxy
 * route; replacing a stand-in with its real service means changing the factory
 * on that line and nothing else in the app.
 *
 *   indexer   rgbpp-indexer — real, in place today.
 *   gateway   btc-assets-api standing in for rgbpp-gateway, which is unbuilt.
 *   metadata  btc-assets-api standing in for an asset-metadata service, unbuilt.
 *
 * Which upstream each route actually reaches is a server-side env question —
 * see the route handlers under app/api and .env.example.
 */
import {
  GATEWAY_API_BASE,
  INDEXER_API_BASE,
  METADATA_API_BASE,
} from '../network';
import { createRgbppIndexer } from './indexer';
import { createBtcAssetsApiGateway } from './gateway';
import { createBtcAssetsApiMetadata, withMetadataCache } from './metadata';

/** RGB++ state: cells, balances, cross-chain transaction status, history. */
export const indexer = createRgbppIndexer(INDEXER_API_BASE);

/** Bitcoin access and the RGB++ SPV proof. */
export const gateway = createBtcAssetsApiGateway(GATEWAY_API_BASE);

/** Token and DOB metadata: symbol, name, decimals, cluster. */
export const assetMetadata = withMetadataCache(
  createBtcAssetsApiMetadata(METADATA_API_BASE),
);

export * from './types';
export { ProviderHttpError } from './http';
export { createRgbppDataSource } from './data-source';
