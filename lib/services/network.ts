/**
 * Central network configuration.
 *
 * Everything network-dependent — CKB client, BTC network, assets-API endpoint,
 * rgbpp scripts, wallet network preference — is derived from here so the
 * CKB / BTC / API triple can never drift out of sync.
 *
 * Resolution order:
 *   1. Client-side localStorage override (only when ALLOW_SWITCH is true)
 *   2. NEXT_PUBLIC_NETWORK ('mainnet' | 'testnet', default 'testnet')
 *
 * Production: two deployments, each pinned via NEXT_PUBLIC_NETWORK +
 * NEXT_PUBLIC_ALLOW_NETWORK_SWITCH unset → switcher hidden, override ignored.
 * Preview/dev: NEXT_PUBLIC_ALLOW_NETWORK_SWITCH=true → switcher visible,
 * choice persisted and mirrored to a cookie that the /api/rgbpp proxy reads
 * to pick the right upstream (server can't see localStorage).
 */

export type AppNetwork = 'mainnet' | 'testnet';

const ENV_NETWORK: AppNetwork =
  process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

/**
 * Gate for the in-app network switcher. Off by default so production
 * deployments — even if they accidentally ship the switcher UI — can't
 * actually flip networks.
 */
export const ALLOW_SWITCH =
  process.env.NEXT_PUBLIC_ALLOW_NETWORK_SWITCH === 'true';

const LS_KEY = 'leapfi:network';
/**
 * Cookie name read by the /api/rgbpp proxy to route requests to the correct
 * upstream. Must match COOKIE_NAME in app/api/rgbpp/[...path]/route.ts.
 */
const COOKIE_NAME = 'leapfi-network';

function writeNetworkCookie(network: AppNetwork) {
  document.cookie = `${COOKIE_NAME}=${network}; path=/; max-age=31536000; SameSite=Lax`;
}

function readOverride(): AppNetwork | null {
  if (typeof window === 'undefined' || !ALLOW_SWITCH) return null;
  try {
    const v = window.localStorage.getItem(LS_KEY);
    return v === 'mainnet' || v === 'testnet' ? v : null;
  } catch {
    return null;
  }
}

export const NETWORK: AppNetwork = readOverride() ?? ENV_NETWORK;

export const IS_MAINNET = NETWORK === 'mainnet';

/**
 * Build a network-scoped localStorage key. Every persistent piece of state
 * that holds network-specific data (pipelines, checkpoints, asset caches,
 * indexer responses) MUST go through this so a switcher reload can't surface
 * mainnet data inside a testnet session, or vice versa.
 *
 * Exception: the network override key itself (LS_KEY above) is intentionally
 * NOT scoped — it's the selector.
 */
export function networkedKey(base: string): string {
  return `${base}:${NETWORK}`;
}

/**
 * Persist the user's choice and reload. Reload (rather than reactive swap)
 * because IS_MAINNET / clients / rgbpp config are captured at module load by
 * many consumers — a fresh boot is the only way to guarantee no mixed-network
 * state survives in caches or in the ccc provider.
 *
 * Writes BOTH localStorage (read by client at module load) and a cookie
 * (read by the /api/rgbpp proxy to pick the upstream). Both must be set
 * before reload, or the server side will route to the wrong upstream and
 * you get "spore id not found" / 502s for one render cycle.
 */
export function setNetwork(next: AppNetwork) {
  if (typeof window === 'undefined' || !ALLOW_SWITCH || next === NETWORK) return;
  try {
    window.localStorage.setItem(LS_KEY, next);
  } catch {
    // Without persistence the reload would just flip back. Bail.
    return;
  }
  // 1 year, lax — same-origin only, sent on all /api/rgbpp/* requests.
  writeNetworkCookie(next);
  window.location.reload();
}

/**
 * Keep the server-visible cookie aligned with the client-selected network on
 * initial boot. This covers first visits (no cookie yet) and stale-cookie cases.
 */
export function syncNetworkCookie() {
  if (typeof document === 'undefined' || !ALLOW_SWITCH) return;
  writeNetworkCookie(NETWORK);
}

/** CKB address prefix for the target network (ccc matches network prefs against this). */
export const CKB_ADDRESS_PREFIX = IS_MAINNET ? 'ckb' : 'ckt';

/** BTC network name ccc uses for the connected wallet's preferred network. */
export const BTC_NETWORK_NAME = IS_MAINNET ? 'btc' : 'btcTestnet';

/**
 * Browser-side base URLs for the three data providers. Each is a local server
 * proxy (see app/api/{indexer,gateway,metadata}/[...path]/route.ts), so the
 * deployment server — not the user's browser — is the egress IP, and upstream
 * tokens stay server-side.
 *
 * Three routes rather than one because the upstreams are three different
 * services: rgbpp-indexer today, and rgbpp-gateway plus an asset-metadata
 * service once they exist. Until then the last two are pointed at
 * btc-assets-api by env; see lib/services/providers/types.ts.
 */
export const INDEXER_API_BASE = '/api/indexer';
export const GATEWAY_API_BASE = '/api/gateway';
export const METADATA_API_BASE = '/api/metadata';

/** Human label for warnings/notifications. */
export const NETWORK_LABEL = IS_MAINNET ? 'Bitcoin Mainnet' : 'Bitcoin Testnet';

/** Infer which BTC network an address belongs to, from its prefix. */
export function btcNetworkOfAddress(addr: string): AppNetwork | 'unknown' {
  if (/^(bc1|[13])/.test(addr)) return 'mainnet';
  if (/^(tb1|[mn2])/.test(addr)) return 'testnet';
  return 'unknown';
}
