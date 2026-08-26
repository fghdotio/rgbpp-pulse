/**
 * Proxy to the asset-metadata service — token and DOB metadata
 * (`/rgbpp/v1/assets/type`).
 *
 * No such service exists yet, so this falls back to the legacy btc-assets-api
 * vars (RGBPP_API_*) when RGBPP_METADATA_* is unset. It has its own route
 * rather than sharing the gateway's so that pointing metadata elsewhere later
 * is an env change, not a code change.
 */
import { createProxyHandlers, loadProviderConfigs } from '@/lib/server/upstream-proxy';

export const runtime = 'nodejs';

const handlers = createProxyHandlers(
  loadProviderConfigs('asset-metadata', 'RGBPP_METADATA', 'RGBPP_API'),
);

export const GET = handlers.GET;
export const POST = handlers.POST;
