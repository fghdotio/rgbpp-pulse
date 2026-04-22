/**
 * Asset Discovery Service
 *
 * Uses CCC SDK to discover and query RGB++ UDT and Spore assets
 * bound to a connected wallet address.
 */
import type { UdtAsset, SporeAsset } from './types';

/**
 * Mock UDT assets for demo / development.
 * In production, these would be queried via CCC's cell collection.
 */
export function getMockUdtAssets(): UdtAsset[] {
  return [
    {
      type: 'udt',
      name: 'RGB++ Test Token',
      symbol: 'RTT',
      decimals: 8,
      balance: BigInt('100000000000'), // 1000.0
      typeScriptArgs: '0xe6fa637f763fd63732146015b0964fe88f16996846b3d0a164bf15c069ff008b',
      typeScriptCodeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      typeScriptHashType: 'type',
      location: 'ckb',
    },
    {
      type: 'udt',
      name: 'Stable Coin X',
      symbol: 'SCX',
      decimals: 6,
      balance: BigInt('5000000000'), // 5000.0
      typeScriptArgs: '0x8418c9699aa47ef02f45f021a6d1d44e4dfa503cf2fc1b002ff3c39e9f158080',
      typeScriptCodeHash: '0xc5e5dcf215925f7ef4dfaf5f4b4f105bc321c02776d6e7d52a1db3fcd9d011a4',
      typeScriptHashType: 'type',
      location: 'btc',
    },
    {
      type: 'udt',
      name: 'CKB Wrapped BTC',
      symbol: 'cBTC',
      decimals: 8,
      balance: BigInt('50000000'), // 0.5
      typeScriptArgs: '0x1f460e3c8c280ac828ec58cfe3b4ee55dfa1241420229222f24a330b37d3a15f',
      typeScriptCodeHash: '0x25c29dc317811a6f6f3985a7a9ebc4838bd388d19d0feeecf0bcd60f6c0975bb',
      typeScriptHashType: 'type',
      location: 'ckb',
    },
  ];
}

/**
 * Mock Spore assets for demo / development.
 */
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
    },
    {
      type: 'spore',
      id: '0x01eb873a190a200cdf3a21ee823663e3f2d5d220b0dee6033fd06a67c43cb733',
      contentType: 'image/svg+xml',
      content: '',
      clusterId: '0xdef456',
      clusterName: 'Nervos Art',
      location: 'ckb',
    },
    {
      type: 'spore',
      id: '0xb1bf3620fa9caf55bd5e6ca05a99013cb48ba5cbf522efc34cc098da4a1cb1fe',
      contentType: 'image/png',
      content: '',
      clusterId: '0xabc123',
      clusterName: 'CKB Punks',
      location: 'btc',
    },
    {
      type: 'spore',
      id: '0x8ce8307ac273c6e5548bd1a5dbf6596aab5dd5e75259a092b5461d3dba1c34bf',
      contentType: 'application/json',
      content: '',
      clusterName: 'Unique Items',
      location: 'ckb',
    },
  ];
}
