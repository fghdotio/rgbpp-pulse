/**
 * Asset Discovery Service
 *
 * Uses:
 * - CCC SDK client.findCellsByLock to discover CKB-native xUDT assets
 * - RGB++ API (api-testnet.rgbpp.com) to discover BTC-bound RGB++ assets
 * Falls back to mock data on failure.
 */
import { ccc } from '@ckb-ccc/connector-react';
import type { UdtAsset, SporeAsset } from './types';
import { getAddressAssets, getAssetTypeInfo, type RgbppCell } from './api';
import { batchDecodeDobs, renderDobToSvg } from './dob';

/**
 * Spore type script code_hashes from spore-contract VERSIONS.md
 * https://github.com/sporeprotocol/spore-contract/blob/master/docs/VERSIONS.md
 */
const KNOWN_SPORE_CODE_HASHES = [
  // testnet v0.2.2-beta.2
  '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
  // mainnet v0.2.2-beta.1
  '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
  // testnet v0.2.1 (deprecated, but may still have live cells)
  '0x5e063b4c0e7abeaa6a428df3b693521a3050934cf3b0ae97a800d1bc31449398',
];

/**
 * Fetch CKB-native xUDT assets by querying the CKB indexer via CCC SDK.
 *
 * Iterates over the signer's lock scripts, uses client.findCellsByLock
 * with the xUDT type script (prefix match) to find all xUDT cells,
 * then aggregates balances by type script args.
 */
export async function fetchCkbUdtAssets(
  client: ccc.Client,
  signer: ccc.Signer,
): Promise<UdtAsset[]> {
  try {
    // Get the xUDT script info from the client's known scripts
    const xudtScriptInfo = await client.getKnownScript(ccc.KnownScript.XUdt);

    // Get user's lock scripts
    const addressObjs = await signer.getAddressObjs();

    // Aggregate balances by type script args
    const balanceMap = new Map<string, {
      balance: bigint;
      typeScriptArgs: string;
      typeScriptCodeHash: string;
      typeScriptHashType: string;
    }>();

    for (const { script: lockScript } of addressObjs) {
      // Query cells with this lock script and xUDT type script (prefix match by codeHash)
      for await (const cell of client.findCells(
        {
          script: lockScript,
          scriptType: 'lock',
          scriptSearchMode: 'exact',
          filter: {
            script: {
              codeHash: xudtScriptInfo.codeHash,
              hashType: xudtScriptInfo.hashType,
              args: '0x', // prefix match — will match all xUDT tokens
            },
          },
          withData: true,
        },
        'desc',
        20,
      )) {
        if (!cell.cellOutput.type) continue;

        const typeArgs = cell.cellOutput.type.args;
        const key = typeArgs;

        // xUDT balance is stored in the first 16 bytes of cell data (LE u128)
        let amount = BigInt(0);
        if (cell.outputData && cell.outputData.length >= 34) { // 0x + 32 hex chars = 16 bytes
          const dataHex = cell.outputData.startsWith('0x')
            ? cell.outputData.slice(2)
            : cell.outputData;
          // Read first 16 bytes as LE u128
          if (dataHex.length >= 32) {
            const leBytes = dataHex.slice(0, 32);
            // Convert LE hex to bigint
            const beBytes = leBytes.match(/.{2}/g)!.reverse().join('');
            amount = BigInt('0x' + beBytes);
          }
        }

        const existing = balanceMap.get(key);
        if (existing) {
          existing.balance += amount;
        } else {
          balanceMap.set(key, {
            balance: amount,
            typeScriptArgs: typeArgs,
            typeScriptCodeHash: cell.cellOutput.type.codeHash,
            typeScriptHashType: cell.cellOutput.type.hashType,
          });
        }
      }
    }

    // Convert to UdtAsset array, enriching with metadata from the API
    const assets: UdtAsset[] = [];
    for (const [, info] of balanceMap) {
      let name = `xUDT ${info.typeScriptArgs.slice(0, 10)}...`;
      let symbol = info.typeScriptArgs.slice(2, 8).toUpperCase();
      let decimals = 8;

      // Try to look up real token info from the RGB++ API
      try {
        const typeInfo = await getAssetTypeInfo({
          codeHash: info.typeScriptCodeHash,
          args: info.typeScriptArgs,
          hashType: info.typeScriptHashType as 'type' | 'data' | 'data1' | 'data2',
        });
        if (typeInfo && 'symbol' in typeInfo) {
          name = typeInfo.name || name;
          symbol = typeInfo.symbol || symbol;
          decimals = typeInfo.decimal ?? decimals;
        }
      } catch {
        // API lookup failed, use defaults
      }

      assets.push({
        type: 'udt',
        name,
        symbol,
        decimals,
        balance: info.balance,
        typeScriptArgs: info.typeScriptArgs,
        typeScriptCodeHash: info.typeScriptCodeHash,
        typeScriptHashType: info.typeScriptHashType,
        location: 'ckb',
      });
    }

    return assets;
  } catch (err) {
    console.warn('Failed to fetch CKB UDT assets via CCC SDK:', err);
    return [];
  }
}

/**
 * Fetch RGB++-bound UDT balances from the RGB++ API via the /assets endpoint.
 * Filters out Spore cells, parses LE u128 amounts from cell data,
 * aggregates by type script args, and enriches with token metadata.
 */
export async function fetchRgbppUdtAssets(btcAddress: string): Promise<UdtAsset[]> {
  try {
    const cells = await getAddressAssets(btcAddress);

    // Filter for xUDT cells (has type script, is NOT a Spore cell)
    const udtCells = cells.filter(
      (cell) => cell.cellOutput.type && !isSporeCell(cell),
    );

    // Aggregate balances by type script args
    const balanceMap = new Map<string, {
      balance: bigint;
      typeScript: { codeHash: string; args: string; hashType: string };
    }>();

    for (const cell of udtCells) {
      const typeScript = cell.cellOutput.type!;
      const key = typeScript.args;

      // Parse LE u128 from first 16 bytes of cell data
      let amount = BigInt(0);
      const dataHex = (cell.data || '').startsWith('0x')
        ? (cell.data || '').slice(2)
        : (cell.data || '');
      if (dataHex.length >= 32) {
        const leBytes = dataHex.slice(0, 32);
        const beBytes = leBytes.match(/.{2}/g)!.reverse().join('');
        amount = BigInt('0x' + beBytes);
      }

      const existing = balanceMap.get(key);
      if (existing) {
        existing.balance += amount;
      } else {
        balanceMap.set(key, {
          balance: amount,
          typeScript: {
            codeHash: typeScript.codeHash,
            args: typeScript.args,
            hashType: typeScript.hashType,
          },
        });
      }
    }

    // Convert to UdtAsset array, enriching with metadata
    const assets: UdtAsset[] = [];
    for (const [, info] of balanceMap) {
      let name = `xUDT ${info.typeScript.args.slice(0, 10)}...`;
      let symbol = info.typeScript.args.slice(2, 8).toUpperCase();
      let decimals = 8;

      try {
        const typeInfo = await getAssetTypeInfo({
          codeHash: info.typeScript.codeHash,
          args: info.typeScript.args,
          hashType: info.typeScript.hashType as 'type' | 'data' | 'data1' | 'data2',
        });
        if (typeInfo && 'symbol' in typeInfo) {
          name = typeInfo.name || name;
          symbol = typeInfo.symbol || symbol;
          decimals = typeInfo.decimal ?? decimals;
        }
      } catch {
        // API lookup failed, use defaults
      }

      assets.push({
        type: 'udt',
        name,
        symbol,
        decimals,
        balance: info.balance,
        typeScriptArgs: info.typeScript.args,
        typeScriptCodeHash: info.typeScript.codeHash,
        typeScriptHashType: info.typeScript.hashType,
        location: 'btc',
      });
    }

    return assets;
  } catch (err) {
    console.warn('Failed to fetch RGB++ UDT assets from API:', err);
    return [];
  }
}

/**
 * Fetch all UDT assets (CKB-native + RGB++-bound).
 * Falls back to mock data when both sources fail.
 */
export async function fetchUdtAssets(
  btcAddress: string | null,
  client?: ccc.Client,
  signer?: ccc.Signer,
): Promise<UdtAsset[]> {
  const results: UdtAsset[] = [];

  // CKB-native UDTs via CCC SDK
  if (client && signer) {
    const ckbUdts = await fetchCkbUdtAssets(client, signer);
    results.push(...ckbUdts);
  }

  // RGB++-bound UDTs via API
  if (btcAddress) {
    const rgbppUdts = await fetchRgbppUdtAssets(btcAddress);
    results.push(...rgbppUdts);
  }

  // Fall back to mock data if nothing found
  if (results.length === 0) {
    return getMockUdtAssets();
  }

  return results;
}

/**
 * Parse Spore cell data (molecule table format) to extract contentType and clusterId.
 *
 * SporeData molecule table layout:
 *   [0..4)   total_size (LE u32)
 *   [4..8)   offset_content_type (LE u32)
 *   [8..12)  offset_content (LE u32)
 *   [12..16) offset_cluster_id (LE u32)
 *   [offset_content_type..offset_content) content_type field (Bytes: 4-byte LE len + utf8)
 *   [offset_content..offset_cluster_id) content field (Bytes)
 *   [offset_cluster_id..total_size) cluster_id field (BytesOpt: empty or 4-byte LE len + data)
 */
function parseSporeData(data: string): { contentType: string; clusterId: string } {
  const result = { contentType: 'unknown', clusterId: '' };
  try {
    if (!data || data === '0x') return result;
    const hex = data.startsWith('0x') ? data.slice(2) : data;
    if (hex.length < 32) return result; // at least 4 offsets = 16 bytes

    const readU32LE = (offset: number) => {
      const bytes = hex.slice(offset * 2, offset * 2 + 8);
      return (
        parseInt(bytes.slice(0, 2), 16) |
        (parseInt(bytes.slice(2, 4), 16) << 8) |
        (parseInt(bytes.slice(4, 6), 16) << 16) |
        (parseInt(bytes.slice(6, 8), 16) << 24)
      ) >>> 0;
    };

    const offsetCT = readU32LE(4);  // offset to content_type field
    const offsetC = readU32LE(8);   // offset to content field
    const offsetCI = readU32LE(12); // offset to cluster_id field
    const totalSize = readU32LE(0);

    // Parse content_type: Bytes = [len_u32_LE] + [utf8 data]
    if (offsetC > offsetCT + 4) {
      const ctDataLen = readU32LE(offsetCT);
      if (ctDataLen > 0 && ctDataLen < 200) {
        const ctHex = hex.slice((offsetCT + 4) * 2, (offsetCT + 4 + ctDataLen) * 2);
        const bytes = new Uint8Array(ctHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
        result.contentType = new TextDecoder().decode(bytes);
      }
    }

    // Parse cluster_id: BytesOpt = empty or [len_u32_LE] + [data]
    if (totalSize > offsetCI + 4) {
      const ciDataLen = readU32LE(offsetCI);
      if (ciDataLen === 32) {
        result.clusterId = '0x' + hex.slice((offsetCI + 4) * 2, (offsetCI + 4 + 32) * 2);
      }
    }
  } catch {
    // ignore parse errors
  }
  return result;
}

/**
 * Parse Cluster cell data (molecule table) to extract name and description.
 *
 * ClusterData molecule table layout:
 *   [0..4)   total_size
 *   [4..8)   offset_name
 *   [8..12)  offset_description
 *   [offset_name..offset_description) name field (Bytes: 4-byte LE len + utf8)
 *   [offset_description..total_size) description field (Bytes)
 */
function parseClusterData(data: string): { name: string; description: string } {
  const result = { name: '', description: '' };
  try {
    if (!data || data === '0x') return result;
    const hex = data.startsWith('0x') ? data.slice(2) : data;
    if (hex.length < 24) return result;

    const readU32LE = (offset: number) => {
      const bytes = hex.slice(offset * 2, offset * 2 + 8);
      return (
        parseInt(bytes.slice(0, 2), 16) |
        (parseInt(bytes.slice(2, 4), 16) << 8) |
        (parseInt(bytes.slice(4, 6), 16) << 16) |
        (parseInt(bytes.slice(6, 8), 16) << 24)
      ) >>> 0;
    };

    const totalSize = readU32LE(0);
    const offsetName = readU32LE(4);
    const offsetDesc = readU32LE(8);

    // Parse name
    if (offsetDesc > offsetName + 4) {
      const nameLen = readU32LE(offsetName);
      if (nameLen > 0 && nameLen < 500) {
        const nameHex = hex.slice((offsetName + 4) * 2, (offsetName + 4 + nameLen) * 2);
        const bytes = new Uint8Array(nameHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
        result.name = new TextDecoder().decode(bytes);
      }
    }

    // Parse description
    if (totalSize > offsetDesc + 4) {
      const descLen = readU32LE(offsetDesc);
      if (descLen > 0 && descLen < 10000) {
        const descHex = hex.slice((offsetDesc + 4) * 2, (offsetDesc + 4 + descLen) * 2);
        const bytes = new Uint8Array(descHex.match(/.{2}/g)!.map(b => parseInt(b, 16)));
        result.description = new TextDecoder().decode(bytes);
      }
    }
  } catch {
    // ignore parse errors
  }
  return result;
}

/** Cluster code_hashes for looking up cluster cells via CKB RPC */
const KNOWN_CLUSTER_CODE_HASHES = [
  // testnet v0.2.2-beta.2
  '0x0bbe768b519d8ea7b96d58f1182eb7e6ef96c541fbd9526975077ee09f049058',
  // mainnet v0.2.2-beta.1
  '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
];

/**
 * Look up a cluster cell by clusterId via CKB RPC and parse its name.
 * Caches results in-memory to avoid redundant queries.
 */
const clusterNameCache = new Map<string, string>();

async function lookupClusterName(
  client: ccc.Client,
  clusterId: string,
): Promise<string> {
  if (!clusterId) return '';
  const cached = clusterNameCache.get(clusterId);
  if (cached !== undefined) return cached;

  try {
    for (const codeHash of KNOWN_CLUSTER_CODE_HASHES) {
      for await (const cell of client.findCells(
        {
          script: {
            codeHash,
            hashType: 'data1',
            args: clusterId,
          },
          scriptType: 'type',
          scriptSearchMode: 'exact',
          withData: true,
        },
        'desc',
        1,
      )) {
        const { name } = parseClusterData(cell.outputData ?? '0x');
        clusterNameCache.set(clusterId, name);
        return name;
      }
    }
  } catch {
    // lookup failed
  }
  clusterNameCache.set(clusterId, '');
  return '';
}

/**
 * Fetch CKB-native Spore assets by querying the CKB indexer via CCC SDK.
 * All data is resolved via CKB RPC — no btc-assets-api calls.
 */
export async function fetchCkbSporeAssets(
  client: ccc.Client,
  signer: ccc.Signer,
): Promise<SporeAsset[]> {
  const spores: SporeAsset[] = [];

  try {
    const addressObjs = await signer.getAddressObjs();

    for (const codeHash of KNOWN_SPORE_CODE_HASHES) {
      for (const { script: lockScript } of addressObjs) {
        for await (const cell of client.findCells(
          {
            script: lockScript,
            scriptType: 'lock',
            scriptSearchMode: 'exact',
            filter: {
              script: {
                codeHash,
                hashType: 'data1',
                args: '0x', // prefix match — matches all Spore IDs
              },
            },
            withData: true,
          },
          'desc',
          50,
        )) {
          if (!cell.cellOutput.type) continue;

          const typeArgs = cell.cellOutput.type.args;
          const { contentType, clusterId } = parseSporeData(cell.outputData ?? '0x');

          // Look up cluster name via CKB RPC
          const clusterName = await lookupClusterName(client, clusterId);

          spores.push({
            type: 'spore',
            id: typeArgs,
            contentType,
            content: '',
            clusterId,
            clusterName,
            location: 'ckb',
          });
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch CKB Spore assets via CCC SDK:', err);
  }

  return spores;
}

/**
 * Fetch RGB++-bound Spore assets from the RGB++ API.
 */
export async function fetchRgbppSporeAssets(btcAddress: string): Promise<SporeAsset[]> {
  try {
    const cells = await getAddressAssets(btcAddress);
    const sporeCells = cells.filter((cell) => isSporeCell(cell));

    const spores: SporeAsset[] = [];
    for (const cell of sporeCells) {
      const typeScript = cell.cellOutput.type;
      if (!typeScript) continue;

      let clusterName = '';
      let clusterId = '';
      let contentType = 'unknown';

      try {
        const info = await getAssetTypeInfo(typeScript);
        if (info && info.type === 'spore') {
          contentType = info.contentType;
          if (info.cluster) {
            clusterId = info.cluster.id;
            clusterName = info.cluster.name;
          }
        }
      } catch {
        contentType = parseSporeData(cell.data).contentType;
      }

      spores.push({
        type: 'spore',
        id: typeScript.args,
        contentType,
        content: '',
        clusterId,
        clusterName,
        location: 'btc',
      });
    }

    return spores;
  } catch (err) {
    console.warn('Failed to fetch RGB++ Spore assets from API:', err);
    return [];
  }
}

/**
 * Fetch all Spore assets (CKB-native + RGB++-bound),
 * then batch-decode DOB traits via the decoder server.
 */
export async function fetchSporeAssets(
  btcAddress: string | null,
  client?: ccc.Client,
  signer?: ccc.Signer,
): Promise<SporeAsset[]> {
  const results: SporeAsset[] = [];

  // CKB-native Spores via CCC SDK
  if (client && signer) {
    const ckbSpores = await fetchCkbSporeAssets(client, signer);
    results.push(...ckbSpores);
  }

  // RGB++-bound Spores via API
  if (btcAddress) {
    const rgbppSpores = await fetchRgbppSporeAssets(btcAddress);
    results.push(...rgbppSpores);
  }

  return results;
}

/**
 * Batch decode DOB traits for an array of SporeAssets (mutates in-place).
 * Separated from fetchSporeAssets so the UI can show spores immediately
 * and fill in traits asynchronously.
 */
export async function enrichSporesWithDob(spores: SporeAsset[]): Promise<SporeAsset[]> {
  if (spores.length === 0) return spores;

  const ids = spores.map((s) => s.id);

  try {
    const decoded = await batchDecodeDobs(ids);

    // Phase 1: attach traits and extract metadata
    const renderJobs: Promise<void>[] = [];

    for (const spore of spores) {
      const key = spore.id.toLowerCase();
      const result = decoded.get(key);
      spore.dobDecoded = true;
      if (result) {
        spore.dobTraits = result.traits;
        spore.dobContent = result.dobContent;

        // Extract prev.bg as DOB preview image fallback
        const bgTrait = result.traits.find((t) => t.name === 'prev.bg');
        if (bgTrait && typeof bgTrait.value === 'string') {
          spore.dobImageUri = bgTrait.value;
        }

        // Phase 2: render SVG via dob-render (in parallel)
        renderJobs.push(
          renderDobToSvg(result.renderOutput)
            .then((svg) => {
              if (svg) spore.dobSvg = svg;
            })
            .catch((err) => {
              console.warn(`SVG render failed for ${spore.id.slice(0, 14)}:`, err);
            })
        );
      }
    }

    // Wait for all SVG renders to complete
    await Promise.allSettled(renderJobs);
  } catch (err) {
    console.warn('Failed to batch decode DOBs:', err);
    for (const spore of spores) {
      spore.dobDecoded = true;
    }
  }

  return spores;
}

function isSporeCell(cell: RgbppCell): boolean {
  if (!cell.cellOutput.type) return false;
  return KNOWN_SPORE_CODE_HASHES.includes(cell.cellOutput.type.codeHash);
}



// ─── Mock Data (Fallback) ───────────────────────────────────

export function getMockUdtAssets(): UdtAsset[] {
  return [
    {
      type: 'udt',
      name: 'RGB++ Test Token',
      symbol: 'RTT',
      decimals: 8,
      balance: BigInt('100000000000'),
      typeScriptArgs: '0xe6fa637f763fd63732146015b0964fe88f16996846b3d0a164bf15c069ff008b',
      typeScriptCodeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      typeScriptHashType: 'type',
      location: 'ckb',
      isMock: true,
    },
    {
      type: 'udt',
      name: 'Stable Coin X',
      symbol: 'SCX',
      decimals: 6,
      balance: BigInt('5000000000'),
      typeScriptArgs: '0x8418c9699aa47ef02f45f021a6d1d44e4dfa503cf2fc1b002ff3c39e9f158080',
      typeScriptCodeHash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
      typeScriptHashType: 'type',
      location: 'btc',
      isMock: true,
    },
    {
      type: 'udt',
      name: 'CKB Wrapped BTC',
      symbol: 'cBTC',
      decimals: 8,
      balance: BigInt('50000000'),
      typeScriptArgs: '0x1f460e3c8c280ac828ec58cfe3b4ee55dfa1241420229222f24a330b37d3a15f',
      typeScriptCodeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      typeScriptHashType: 'type',
      location: 'ckb',
      isMock: true,
    },
  ];
}



