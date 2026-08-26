/**
 * The composed RgbppDataSource handed to @ckb-ccc/rgbpp.
 *
 * The SDK asks for one object, but that object's methods have two different
 * owners. Its interface already draws the line for us:
 *
 *   BtcDataProvider        → gateway   (Bitcoin: utxos, balance, fees, broadcast)
 *   RgbppSpvProofProvider  → gateway   (`/rgbpp/v1/btc-spv/proof`)
 *   RgbppCkbCellProvider   → indexer   (which CKB cells a BTC address owns)
 *
 * Before the split, one `BtcAssetsApi` answered all three. This file is the
 * only place that knows they now come from different services.
 */
import { ccc } from '@ckb-ccc/core';
import type { RgbppDataSource } from '@ckb-ccc/rgbpp';
import type { RgbppCell, RgbppGateway, RgbppIndexer } from './types';

export interface RgbppDataSourceDeps {
  indexer: RgbppIndexer;
  gateway: RgbppGateway;
  ckbClient: ccc.Client;
}

/**
 * The indexer reports a cell's binding (`btc_out_point`) and lock kind, not its
 * lock script — the script is fully determined by those two, so shipping it
 * would be redundant. The SDK needs the script, so rebuild it here.
 *
 * Uses the SDK's own `buildRgbppLockArgs` rather than encoding the args by hand:
 * the layout is `vout` as a 4-byte LE integer followed by the txid in reverse
 * byte order, and getting either half wrong yields a lock that looks plausible
 * and unlocks nothing.
 */
async function toCellOutputs(
  cells: RgbppCell[],
  ckbClient: ccc.Client,
): Promise<ccc.CellOutput[]> {
  const bound = cells.filter((cell) => cell.lockKind === 'rgbpp' && cell.btcOutPoint);
  if (bound.length === 0) return [];

  const { ScriptManager, ClientScriptProvider, buildRgbppLockArgs } = await import(
    '@ckb-ccc/rgbpp'
  );
  const scriptManager = new ScriptManager(new ClientScriptProvider(ckbClient));
  // Same code hash for every cell; only the args differ per binding.
  const template = await scriptManager.rgbppLockScriptTemplate();

  return bound.map((cell) =>
    ccc.CellOutput.from({
      capacity: cell.capacity,
      lock: {
        codeHash: template.codeHash,
        hashType: template.hashType,
        args: buildRgbppLockArgs(cell.btcOutPoint!),
      },
      type: cell.typeScript ?? undefined,
    }),
  );
}

export function createRgbppDataSource({
  indexer,
  gateway,
  ckbClient,
}: RgbppDataSourceDeps): RgbppDataSource {
  return {
    // ── Bitcoin: the gateway's half ──────────────────────────
    getTransactionHex: (txId) => gateway.getTransactionHex(txId),
    getTransaction: (txId) => gateway.getTransaction(txId),
    getUtxos: (address, params) => gateway.getUtxos(address, params),
    getBalance: (address, params) => gateway.getBalance(address, params),
    getRecommendedFee: () => gateway.getRecommendedFee(),
    sendTransaction: (txHex) => gateway.sendTransaction(txHex),
    getRgbppSpvProof: (btcTxId, confirmations) =>
      gateway.getRgbppSpvProof(btcTxId, confirmations),

    // ── RGB++ state: the indexer's half ──────────────────────
    async getRgbppCellOutputs(btcAddress: string): Promise<ccc.CellOutput[]> {
      const cells = await indexer.getAddressCells(btcAddress, { reconcile: true });
      return toCellOutputs(cells, ckbClient);
    },
  };
}
