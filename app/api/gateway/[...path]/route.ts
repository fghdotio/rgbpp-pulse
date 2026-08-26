/**
 * Proxy to rgbpp-gateway — Bitcoin access (`/bitcoin/v1/*`) and the RGB++ SPV
 * proof (`/rgbpp/v1/btc-spv/proof`).
 *
 * rgbpp-gateway does not exist yet, so this falls back to the legacy
 * btc-assets-api vars (RGBPP_API_*) when RGBPP_GATEWAY_* is unset — the routes
 * are identical, which is what makes the stand-in work. Point
 * RGBPP_GATEWAY_URL at the real gateway once it ships.
 */
import { createProxyHandlers, loadProviderConfigs } from '@/lib/server/upstream-proxy';

export const runtime = 'nodejs';

const handlers = createProxyHandlers(
  loadProviderConfigs('rgbpp-gateway', 'RGBPP_GATEWAY', 'RGBPP_API'),
);

export const GET = handlers.GET;
export const POST = handlers.POST;
