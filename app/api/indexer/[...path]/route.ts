/**
 * Proxy to rgbpp-indexer — RGB++ state across CKB and Bitcoin.
 *
 * https://github.com/fghdotio/rgbpp-indexer-opus5high
 *
 * Env: RGBPP_INDEXER_URL (+ _TOKEN / _ORIGIN), or the dual-network
 * RGBPP_INDEXER_URL_MAINNET / _TESTNET pair. See lib/server/upstream-proxy.ts.
 */
import { createProxyHandlers, loadProviderConfigs } from '@/lib/server/upstream-proxy';

// Upstream is plain HTTP in some deployments and needs the Node runtime (Edge
// fetch may block it); also required to read non-public env vars.
export const runtime = 'nodejs';

const handlers = createProxyHandlers(
  loadProviderConfigs('rgbpp-indexer', 'RGBPP_INDEXER'),
);

export const GET = handlers.GET;
export const POST = handlers.POST;
