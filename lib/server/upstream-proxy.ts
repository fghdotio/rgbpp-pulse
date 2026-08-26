/**
 * Shared server-side forwarder for the provider proxy routes.
 *
 * Every browser request goes to /api/{indexer,gateway,metadata}/... and is
 * forwarded from the deployment server to that provider's upstream, so:
 *  - the user's browser never contacts an upstream directly (egress IP is the
 *    server's, not the user's);
 *  - upstream tokens and origins stay server-side and are injected here.
 *
 * Each provider is configured independently, and each supports two shapes —
 * chosen by which env vars are set:
 *
 *   1. SINGLE-NETWORK (production): set <PREFIX>_URL (+ _TOKEN / _ORIGIN).
 *      The cookie is ignored; the deployment is pinned to one network via
 *      NEXT_PUBLIC_NETWORK.
 *
 *   2. DUAL-NETWORK (preview/dev): set <PREFIX>_URL_MAINNET and
 *      <PREFIX>_URL_TESTNET (each with its own _TOKEN / _ORIGIN). The proxy
 *      picks per request from the `leapfi-network` cookie written by the
 *      in-app switcher (lib/services/network.ts → setNetwork).
 *
 * If both shapes are present, dual-network wins.
 *
 * Config is read at module load, so env changes need a restart.
 */
import { NextRequest, NextResponse } from 'next/server';

// Must match COOKIE_NAME in lib/services/network.ts.
const COOKIE_NAME = 'leapfi-network';

type Network = 'mainnet' | 'testnet';

interface UpstreamConfig {
  url: string;
  token?: string;
  origin?: string;
}

const ENV_NETWORK: Network =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

interface ProviderConfigs {
  label: string;
  mainnet: UpstreamConfig | null;
  testnet: UpstreamConfig | null;
  /** What to tell an operator whose config is missing. */
  envPrefix: string;
}

/**
 * Resolve one provider's env into per-network configs.
 *
 * `fallbackPrefix` exists because rgbpp-gateway and the asset-metadata service
 * do not exist yet: both providers fall back to the legacy btc-assets-api vars
 * (RGBPP_API_*) so an existing deployment keeps working untouched. Drop the
 * fallback once those services ship.
 */
export function loadProviderConfigs(
  label: string,
  envPrefix: string,
  fallbackPrefix?: string,
): ProviderConfigs {
  const read = (prefix: string, suffix: string) =>
    process.env[`${prefix}${suffix}`];

  const resolve = (suffix: string) =>
    read(envPrefix, suffix) ??
    (fallbackPrefix ? read(fallbackPrefix, suffix) : undefined);

  const dualMainnet = resolve('_URL_MAINNET');
  const dualTestnet = resolve('_URL_TESTNET');

  if (dualMainnet || dualTestnet) {
    return {
      label,
      envPrefix,
      mainnet: dualMainnet
        ? {
            url: dualMainnet,
            token: resolve('_TOKEN_MAINNET'),
            origin: resolve('_ORIGIN_MAINNET'),
          }
        : null,
      testnet: dualTestnet
        ? {
            url: dualTestnet,
            token: resolve('_TOKEN_TESTNET'),
            origin: resolve('_ORIGIN_TESTNET'),
          }
        : null,
    };
  }

  const url = resolve('_URL');
  if (!url) {
    return { label, envPrefix, mainnet: null, testnet: null };
  }

  // Single-network shape: the env var names are network-agnostic, so bind them
  // to whichever network this deployment claims to be.
  const config: UpstreamConfig = {
    url,
    token: resolve('_TOKEN'),
    origin: resolve('_ORIGIN'),
  };
  return {
    label,
    envPrefix,
    mainnet: ENV_NETWORK === 'mainnet' ? config : null,
    testnet: ENV_NETWORK === 'testnet' ? config : null,
  };
}

/**
 * Pick the upstream for this request. Cookie wins when present and configured;
 * otherwise fall back to NEXT_PUBLIC_NETWORK. This keeps a dual-network
 * preview's first visit aligned with the UI before the client has written its
 * cookie, and stops a stale cookie from breaking single-network deploys.
 */
function pickConfig(
  configs: ProviderConfigs,
  request: NextRequest,
): UpstreamConfig | { error: string } {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const cookieNetwork: Network | null =
    cookie === 'mainnet' || cookie === 'testnet' ? cookie : null;

  const requested: Network =
    cookieNetwork && configs[cookieNetwork]
      ? cookieNetwork
      : configs[ENV_NETWORK]
        ? ENV_NETWORK
        : configs.mainnet
          ? 'mainnet'
          : 'testnet';

  const config = configs[requested];
  if (!config) {
    return {
      error:
        `${configs.label} proxy: no upstream configured for ${requested}. ` +
        `Set ${configs.envPrefix}_URL_${requested.toUpperCase()} (dual-network) or ` +
        `${configs.envPrefix}_URL with NEXT_PUBLIC_NETWORK=${requested} (single-network).`,
    };
  }
  return config;
}

function upstreamHeaders(config: UpstreamConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.token) {
    headers.authorization = `Bearer ${config.token}`;
    if (config.origin) headers.origin = config.origin;
  }
  return headers;
}

async function forward(
  configs: ProviderConfigs,
  request: NextRequest,
  path: string[],
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  const picked = pickConfig(configs, request);
  if ('error' in picked) {
    console.error(`[${configs.label}-proxy]`, picked.error);
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }

  const base = picked.url.replace(/\/$/, '');
  const upstream = `${base}/${path.join('/')}${request.nextUrl.search}`;

  try {
    const res = await fetch(upstream, {
      method,
      headers: upstreamHeaders(picked),
      body: method === 'POST' ? await request.text() : undefined,
      // Don't cache on the server; the client owns TTL.
      cache: 'no-store',
    });

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') ?? 'application/json',
      },
    });
  } catch (err) {
    console.error(`[${configs.label}-proxy] upstream error:`, err);
    return NextResponse.json(
      { error: `${configs.label} upstream request failed` },
      { status: 502 },
    );
  }
}

/** Build the GET/POST handlers for one provider's catch-all route. */
export function createProxyHandlers(configs: ProviderConfigs) {
  return {
    GET: async (
      request: NextRequest,
      { params }: { params: Promise<{ path: string[] }> },
    ) => forward(configs, request, (await params).path, 'GET'),

    POST: async (
      request: NextRequest,
      { params }: { params: Promise<{ path: string[] }> },
    ) => forward(configs, request, (await params).path, 'POST'),
  };
}
