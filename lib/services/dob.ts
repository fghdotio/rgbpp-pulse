/**
 * DOB Decoder Service
 *
 * Calls the dob-decoder-standalone-server JSON-RPC API to decode
 * Spore DOB cells into traits and rendered images.
 *
 * Uses @ckb-ccc/dob-render to compose the final SVG from decoded traits.
 *
 * API: https://dob-decoder.ckbccc.com/ (mainnet)
 *      https://dob-decoder-test.ckbccc.com/ (testnet)
 * Methods: dob_decode, dob_batch_decode
 */

import { config as dobRenderConfig, renderByDobDecodeResponse } from '@ckb-ccc/dob-render';
import { IS_MAINNET } from './network';

const DOB_DECODER_URL = IS_MAINNET
  ? 'https://dob-decoder.ckbccc.com/'
  : 'https://dob-decoder-test.ckbccc.com/';

// Configure dob-render to use our decoder server
dobRenderConfig.setDobDecodeServerURL(DOB_DECODER_URL);

/** A single decoded trait from the DOB render output */
export interface DobTrait {
  name: string;
  value: string | number;
  type: 'String' | 'Number';
}

/** Parsed result from the DOB decoder */
export interface DobDecodeResult {
  traits: DobTrait[];
  /** Raw DOB content (dna, block_number, etc.) */
  dobContent: Record<string, unknown>;
  /** The full render_output JSON string (for potential SVG extraction) */
  renderOutput: string;
}

// ─── In-memory cache ───────────────────────────────────────
const decodeCache = new Map<string, DobDecodeResult | null>();

let rpcId = 1;

/**
 * Send a JSON-RPC request to the DOB decoder server.
 */
async function rpcCall<T>(method: string, params: unknown[]): Promise<T> {
  const body = {
    id: rpcId++,
    jsonrpc: '2.0',
    method,
    params,
  };

  const resp = await fetch(DOB_DECODER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`DOB decoder HTTP error: ${resp.status}`);
  }

  const json = await resp.json();
  if (json.error) {
    throw new Error(json.error.message || 'DOB decode error');
  }

  return json.result as T;
}

/**
 * Parse the double-JSON response from the decoder.
 *
 * The `result` is a JSON string containing:
 * ```json
 * {
 *   "render_output": "[{\"name\":\"...\",\"traits\":[{\"String\":\"...\"}]}]",
 *   "dob_content": { "dna": "...", ... }
 * }
 * ```
 */
function parseDecodeResult(resultStr: string): DobDecodeResult {
  const inner = JSON.parse(resultStr) as {
    render_output: string;
    dob_content: Record<string, unknown>;
  };

  const rawTraits = JSON.parse(inner.render_output) as Array<{
    name: string;
    traits: Array<Record<string, string | number>>;
  }>;

  const traits: DobTrait[] = rawTraits.map((t) => {
    const traitEntry = t.traits[0] || {};
    if ('String' in traitEntry) {
      return { name: t.name, value: traitEntry.String, type: 'String' as const };
    }
    if ('Number' in traitEntry) {
      return { name: t.name, value: traitEntry.Number, type: 'Number' as const };
    }
    // Fallback
    const [type, val] = Object.entries(traitEntry)[0] || ['String', ''];
    return { name: t.name, value: val, type: type as 'String' | 'Number' };
  });

  return {
    traits,
    dobContent: inner.dob_content,
    renderOutput: inner.render_output,
  };
}

/**
 * Decode a single DOB by spore ID.
 * Returns null if the spore is not a DOB or decoding fails.
 */
export async function decodeDob(sporeId: string): Promise<DobDecodeResult | null> {
  const key = sporeId.toLowerCase();
  if (decodeCache.has(key)) return decodeCache.get(key) ?? null;

  try {
    const resultStr = await rpcCall<string>('dob_decode', [sporeId]);
    const result = parseDecodeResult(resultStr);
    decodeCache.set(key, result);
    return result;
  } catch (err) {
    console.warn(`DOB decode failed for ${sporeId}:`, err);
    decodeCache.set(key, null);
    return null;
  }
}

/**
 * Batch decode multiple DOBs by spore IDs.
 * Returns a Map of sporeId → DobDecodeResult (or null for failures).
 */
export async function batchDecodeDobs(
  sporeIds: string[],
): Promise<Map<string, DobDecodeResult | null>> {
  const results = new Map<string, DobDecodeResult | null>();

  // Split into cached and uncached
  const uncachedIds: string[] = [];
  for (const id of sporeIds) {
    const key = id.toLowerCase();
    if (decodeCache.has(key)) {
      results.set(key, decodeCache.get(key) ?? null);
    } else {
      uncachedIds.push(id);
    }
  }

  if (uncachedIds.length === 0) return results;

  try {
    const resultStrs = await rpcCall<string[]>('dob_batch_decode', [uncachedIds]);

    for (let i = 0; i < uncachedIds.length; i++) {
      const key = uncachedIds[i].toLowerCase();
      const str = resultStrs[i];

      if (str && !str.startsWith('server error:')) {
        try {
          const parsed = parseDecodeResult(str);
          decodeCache.set(key, parsed);
          results.set(key, parsed);
        } catch {
          decodeCache.set(key, null);
          results.set(key, null);
        }
      } else {
        decodeCache.set(key, null);
        results.set(key, null);
      }
    }
  } catch (err) {
    console.warn('DOB batch decode failed:', err);
    // Mark all uncached as null
    for (const id of uncachedIds) {
      const key = id.toLowerCase();
      decodeCache.set(key, null);
      results.set(key, null);
    }
  }

  return results;
}

/**
 * Filter traits for display — hides internal rendering traits.
 * Traits starting with "prev." or "prev<" are used internally for SVG composition.
 */
export function getDisplayTraits(traits: DobTrait[]): DobTrait[] {
  return traits.filter((t) => {
    const name = t.name.toLowerCase();
    return !name.startsWith('prev.') && !name.startsWith('prev<');
  });
}

/**
 * Detect whether a trait value is an image URI that we can render.
 */
export function isImageUri(value: string | number): false | 'http' | 'btcfs' | 'ipfs' {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (v.startsWith('btcfs://')) return 'btcfs';
  if (v.startsWith('ipfs://')) return 'ipfs';
  if (/^https?:\/\/.+\.(png|jpg|jpeg|gif|svg|webp|avif)/i.test(v)) return 'http';
  return false;
}

// ─── Image extraction cache ─────────────────────────────────
const imageCache = new Map<string, string | null>();

/**
 * Extract an image from a btcfs:// or ipfs:// URI via the DOB decoder server.
 * Returns a base64-encoded string, or null on failure.
 */
export async function extractImage(fsuri: string): Promise<string | null> {
  if (imageCache.has(fsuri)) return imageCache.get(fsuri) ?? null;

  try {
    const base64 = await rpcCall<string>('dob_extract_image_from_fsuri', [fsuri, 'base64']);
    imageCache.set(fsuri, base64);
    return base64;
  } catch (err) {
    console.warn(`Failed to extract image from ${fsuri}:`, err);
    imageCache.set(fsuri, null);
    return null;
  }
}

// ─── SVG render cache ─────────────────────────────────────
const svgCache = new Map<string, string | null>();

/**
 * Render a DOB into an SVG string using @ckb-ccc/dob-render.
 *
 * Takes the raw `render_output` JSON string from dob_decode
 * and produces a fully composed SVG (with btcfs/ipfs images resolved).
 */
export async function renderDobToSvg(renderOutput: string): Promise<string | null> {
  if (svgCache.has(renderOutput)) return svgCache.get(renderOutput) ?? null;

  try {
    const svg = await renderByDobDecodeResponse(renderOutput);
    svgCache.set(renderOutput, svg);
    return svg;
  } catch (err) {
    console.warn('DOB SVG render failed:', err);
    svgCache.set(renderOutput, null);
    return null;
  }
}
