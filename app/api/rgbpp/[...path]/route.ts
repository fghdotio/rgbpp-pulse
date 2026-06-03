/**
 * Server-side proxy for the RGB++ assets API.
 *
 * All client requests go to /api/rgbpp/... and are forwarded from the
 * deployment server to the upstream API, so:
 *  - the user's browser never contacts the upstream directly (egress IP is
 *    the server's, not the user's);
 *  - the mainnet API token / origin stay server-side and are injected here.
 *
 * Two modes — chosen by which env vars are set:
 *
 *   1. SINGLE-NETWORK (production): set RGBPP_API_URL (+ TOKEN/ORIGIN).
 *      This is the legacy shape. Cookie is ignored. The deployment is pinned
 *      to one network and should also have NEXT_PUBLIC_ALLOW_NETWORK_SWITCH
 *      unset on the client side.
 *
 *   2. DUAL-NETWORK (preview/dev): set RGBPP_API_URL_MAINNET and
 *      RGBPP_API_URL_TESTNET (each with its own _TOKEN / _ORIGIN). The proxy
 *      picks per request based on the `leapfi-network` cookie set by
 *      the in-app switcher (lib/services/network.ts → setNetwork).
 *
 * If both shapes are present, dual-network wins.
 *
 * Env (single-network):
 *   RGBPP_API_URL                  upstream base URL
 *   RGBPP_API_TOKEN                Bearer token (omit if upstream is open)
 *   RGBPP_API_ORIGIN               origin bound to the token
 *
 * Env (dual-network):
 *   RGBPP_API_URL_MAINNET          + _TOKEN_MAINNET, _ORIGIN_MAINNET
 *   RGBPP_API_URL_TESTNET          + _TOKEN_TESTNET, _ORIGIN_TESTNET
 */
import { NextRequest, NextResponse } from 'next/server';

// Upstream is plain HTTP in some deployments and needs the Node runtime
// (Edge fetch may block it); also required to read non-public env vars.
export const runtime = 'nodejs';

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

/**
 * Resolve env into per-network configs. Returns null for a network that has
 * no config (so callers can 400 instead of silently routing to the wrong
 * place). Builds at module load — env changes require a restart, same as
 * before.
 */
function loadConfigs(): { mainnet: UpstreamConfig | null; testnet: UpstreamConfig | null } {
  const dualMainnet = process.env.RGBPP_API_URL_MAINNET;
  const dualTestnet = process.env.RGBPP_API_URL_TESTNET;
  const legacyUrl = process.env.RGBPP_API_URL;

  if (dualMainnet || dualTestnet) {
    return {
      mainnet: dualMainnet
        ? {
            url: dualMainnet,
            token: process.env.RGBPP_API_TOKEN_MAINNET,
            origin: process.env.RGBPP_API_ORIGIN_MAINNET,
          }
        : null,
      testnet: dualTestnet
        ? {
            url: dualTestnet,
            token: process.env.RGBPP_API_TOKEN_TESTNET,
            origin: process.env.RGBPP_API_ORIGIN_TESTNET,
          }
        : null,
    };
  }

  // Legacy single-network shape. Bind it to whichever network this deployment
  // claims to be — the env-var name was network-agnostic so we trust
  // NEXT_PUBLIC_NETWORK (server can read this too).
  const cfg: UpstreamConfig = {
    url: legacyUrl ?? 'https://api-testnet.rgbpp.com',
    token: process.env.RGBPP_API_TOKEN,
    origin: process.env.RGBPP_API_ORIGIN,
  };
  return {
    mainnet: ENV_NETWORK === 'mainnet' ? cfg : null,
    testnet: ENV_NETWORK === 'testnet' ? cfg : null,
  };
}

const CONFIGS = loadConfigs();

/**
 * Pick the upstream for this request. Cookie wins when present and configured;
 * otherwise fall back to NEXT_PUBLIC_NETWORK. This keeps the first visit to a
 * dual-network preview aligned with the UI before the client has written its
 * cookie, and prevents stale cookies from breaking single-network deploys.
 */
function pickConfig(request: NextRequest): { network: Network; config: UpstreamConfig } | { error: string } {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const cookieNetwork: Network | null =
    cookie === 'mainnet' || cookie === 'testnet' ? cookie : null;
  const requested: Network =
    cookieNetwork && CONFIGS[cookieNetwork]
      ? cookieNetwork
      : CONFIGS[ENV_NETWORK]
        ? ENV_NETWORK
        : CONFIGS.mainnet
          ? 'mainnet'
          : 'testnet';

  const config = CONFIGS[requested];
  if (!config) {
    return {
      error: `RGB++ proxy: no upstream configured for ${requested}. ` +
        `Set RGBPP_API_URL_${requested.toUpperCase()} (dual-network) or ` +
        `RGBPP_API_URL with NEXT_PUBLIC_NETWORK=${requested} (single-network).`,
    };
  }
  return { network: requested, config };
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
  request: NextRequest,
  path: string[],
  method: 'GET' | 'POST',
): Promise<NextResponse> {
  const picked = pickConfig(request);
  if ('error' in picked) {
    console.error('[rgbpp-proxy]', picked.error);
    return NextResponse.json({ error: picked.error }, { status: 400 });
  }
  const { config } = picked;
  const upstream = `${config.url}/${path.join('/')}${request.nextUrl.search}`;

  try {
    const res = await fetch(upstream, {
      method,
      headers: upstreamHeaders(config),
      body: method === 'POST' ? await request.text() : undefined,
      // Don't cache on the server by default; let the client handle TTL.
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
    console.error('[rgbpp-proxy] upstream error:', err);
    return NextResponse.json(
      { error: 'Upstream API request failed' },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(request, path, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return forward(request, path, 'POST');
}
