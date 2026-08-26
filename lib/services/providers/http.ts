/**
 * Minimal JSON-over-HTTP helper shared by the provider implementations.
 *
 * Providers always point at a same-origin proxy route (see `app/api/*`), never
 * at an upstream directly, so there is no auth or CORS handling here — the proxy
 * owns both.
 */

export class ProviderHttpError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
    readonly body: string,
  ) {
    super(`${url} → ${status}${body ? `: ${body}` : ''}`);
    this.name = 'ProviderHttpError';
  }
}

export interface HttpClient {
  get<T>(path: string, params?: QueryParams): Promise<T>;
  /** Resolves to null on 404 instead of throwing. */
  getOrNull<T>(path: string, params?: QueryParams): Promise<T | null>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

/**
 * `object` rather than `Record<string, …>` so the SDK's own param interfaces
 * (BtcUtxoParams and friends) can be passed straight through — an interface
 * without an index signature is not assignable to a Record type.
 */
export type QueryParams = object;

function withQuery(path: string, params?: QueryParams): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export function createHttpClient(baseUrl: string): HttpClient {
  async function send(
    path: string,
    init: RequestInit,
    allow404: boolean,
  ): Promise<unknown> {
    const url = `${baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...init.headers },
    });

    if (!res.ok) {
      if (allow404 && res.status === 404) return null;
      const body = await res.text().catch(() => '');
      throw new ProviderHttpError(res.status, url, body);
    }

    // 204 and empty bodies are legitimate answers for some routes.
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  return {
    get: <T>(path: string, params?: QueryParams) =>
      send(withQuery(path, params), { method: 'GET' }, false) as Promise<T>,
    getOrNull: <T>(path: string, params?: QueryParams) =>
      send(withQuery(path, params), { method: 'GET' }, true) as Promise<T | null>,
    post: <T>(path: string, body?: unknown) =>
      send(
        path,
        {
          method: 'POST',
          body: body === undefined ? undefined : JSON.stringify(body),
        },
        false,
      ) as Promise<T>,
  };
}

/**
 * Parse a decimal-string amount from the wire.
 *
 * The indexer sends amounts and capacities as strings on purpose: a u128 UDT
 * amount and a large CKB capacity both exceed Number.MAX_SAFE_INTEGER.
 */
export function toBigInt(value: string | number | null | undefined): bigint | null {
  if (value === null || value === undefined) return null;
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function toBigIntOr(
  value: string | number | null | undefined,
  fallback: bigint,
): bigint {
  return toBigInt(value) ?? fallback;
}
