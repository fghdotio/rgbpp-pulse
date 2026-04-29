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
import { getAddressAssets, getAddressBalance, getAssetTypeInfo, type RgbppCell } from './api';

const KNOWN_SPORE_CODE_HASHES = [
  '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002c036a0', // Spore
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
 * Fetch RGB++-bound UDT balances from the RGB++ API.
 */
export async function fetchRgbppUdtAssets(btcAddress: string): Promise<UdtAsset[]> {
  try {
    const balance = await getAddressBalance(btcAddress);
    return balance.xudt.map((x) => ({
      type: 'udt' as const,
      name: x.name || 'Unknown Token',
      symbol: x.symbol || '???',
      decimals: x.decimal,
      balance: BigInt(x.total_amount || '0'),
      typeScriptArgs: x.type_script.args,
      typeScriptCodeHash: x.type_script.codeHash,
      typeScriptHashType: x.type_script.hashType,
      location: 'btc' as const,
    }));
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
 * Fetch real Spore assets from the RGB++ API.
 * Parses cell type scripts to detect Spore cells and fetches metadata.
 */
export async function fetchSporeAssets(btcAddress: string): Promise<SporeAsset[]> {
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

      // Try to get type info from the API
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
        // Parse data field for content type if API fails
        contentType = parseSporeContentType(cell.data) || 'unknown';
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
    console.warn('Failed to fetch Spore assets from API:', err);
    return [];
  }
}

function isSporeCell(cell: RgbppCell): boolean {
  if (!cell.cellOutput.type) return false;
  return KNOWN_SPORE_CODE_HASHES.includes(cell.cellOutput.type.codeHash);
}

/**
 * Parse spore data to extract content type (basic heuristic).
 * Spore data format: content_type_len (4 bytes LE) + content_type + content_len (4 bytes LE) + content
 */
function parseSporeContentType(data: string): string | null {
  try {
    if (!data || data === '0x') return null;
    const hex = data.startsWith('0x') ? data.slice(2) : data;
    if (hex.length < 8) return null;
    // First 4 bytes LE = total header length, skip it
    // Bytes 4-8 LE = content type length
    const ctLen = parseInt(hex.slice(8, 10) + hex.slice(10, 12), 16);
    if (ctLen > 0 && ctLen < 100) {
      const ctHex = hex.slice(12, 12 + ctLen * 2);
      return Buffer.from(ctHex, 'hex').toString('utf-8');
    }
  } catch {
    // ignore parse errors
  }
  return null;
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

export function getMockSporeAssets(): SporeAsset[] {
  return [
    {
      type: 'spore',
      id: '0x8d814f7306d31bdfa40ddec0d3c9391c5505a7e9c0917596a8535e2a81ef3ab2',
      contentType: 'image/png',
      content: '',
      clusterId: '0xabc123',
      clusterName: 'CKB Punks',
      location: 'btc',
      isMock: true,
    },
    {
      type: 'spore',
      id: '0x01eb873a190a200cdf3a21ee823663e3f2d5d220b0dee6033fd06a67c43cb733',
      contentType: 'image/svg+xml',
      content: '',
      clusterId: '0xdef456',
      clusterName: 'Nervos Art',
      location: 'ckb',
      isMock: true,
    },
    {
      type: 'spore',
      id: '0xb1bf3620fa9caf55bd5e6ca05a99013cb48ba5cbf522efc34cc098da4a1cb1fe',
      contentType: 'image/png',
      content: '',
      clusterId: '0xabc123',
      clusterName: 'CKB Punks',
      location: 'btc',
      isMock: true,
    },
    {
      type: 'spore',
      id: '0x8ce8307ac273c6e5548bd1a5dbf6596aab5dd5e75259a092b5461d3dba1c34bf',
      contentType: 'application/json',
      content: '',
      clusterName: 'Unique Items',
      location: 'ckb',
      isMock: true,
    },
  ];
}

