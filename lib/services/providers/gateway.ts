/**
 * RgbppGateway — TEMPORARY implementation on btc-assets-api.
 *
 * rgbpp-gateway does not exist yet. Everything below speaks btc-assets-api's
 * routes (`/bitcoin/v1/*` and `/rgbpp/v1/btc-spv/proof`), which are exactly the
 * surface the gateway will take over. When it ships, add a sibling file that
 * implements `RgbppGateway` against it and swap the factory in `./index.ts`;
 * nothing above this layer references btc-assets-api.
 *
 * Deliberately hand-rolled rather than reusing the SDK's `BtcAssetsApi` class:
 * that class also answers `/rgbpp/v1/address/{addr}/assets`, which now belongs
 * to rgbpp-indexer. Keeping the two apart is the whole point of this split.
 */
import { ccc } from '@ckb-ccc/core';
import type {
  BtcBalance,
  BtcBalanceParams,
  BtcRecommendedFeeRates,
  BtcTransaction,
  BtcUtxo,
  BtcUtxoParams,
  RgbppSpvProof,
} from '@ckb-ccc/rgbpp';
import { createHttpClient } from './http';
import type { BtcChainInfo, RgbppGateway } from './types';

/** btc-assets-api's SPV proof shape, before it is normalised for the SDK. */
interface WireSpvProof {
  proof: string;
  spv_client: { tx_hash: string; index: string };
}

export function createBtcAssetsApiGateway(baseUrl: string): RgbppGateway {
  const http = createHttpClient(baseUrl);

  return {
    getTransaction(txId: string): Promise<BtcTransaction> {
      return http.get<BtcTransaction>(`/bitcoin/v1/transaction/${txId}`);
    },

    async getTransactionHex(txId: string): Promise<string> {
      const { hex } = await http.get<{ hex: string }>(
        `/bitcoin/v1/transaction/${txId}/hex`,
      );
      return hex;
    },

    getUtxos(address: string, params?: BtcUtxoParams): Promise<BtcUtxo[]> {
      return http.get<BtcUtxo[]>(
        `/bitcoin/v1/address/${encodeURIComponent(address)}/unspent`,
        params,
      );
    },

    getBalance(address: string, params?: BtcBalanceParams): Promise<BtcBalance> {
      return http.get<BtcBalance>(
        `/bitcoin/v1/address/${encodeURIComponent(address)}/balance`,
        params,
      );
    },

    getRecommendedFee(): Promise<BtcRecommendedFeeRates> {
      return http.get<BtcRecommendedFeeRates>('/bitcoin/v1/fees/recommended');
    },

    async sendTransaction(txHex: string): Promise<string> {
      const { txid } = await http.post<{ txid: string }>('/bitcoin/v1/transaction', {
        txhex: txHex,
      });
      return txid;
    },

    /**
     * Null means "not available yet", which is a normal answer while the BTC
     * transaction accumulates confirmations — `pollForSpvProof` keeps asking.
     */
    async getRgbppSpvProof(
      btcTxId: string,
      confirmations: number,
    ): Promise<RgbppSpvProof | null> {
      const proof = await http.getOrNull<WireSpvProof>('/rgbpp/v1/btc-spv/proof', {
        btc_txid: btcTxId,
        confirmations,
      });
      if (!proof) return null;
      return {
        proof: ccc.hexFrom(proof.proof),
        spvClientOutpoint: ccc.OutPoint.from({
          txHash: proof.spv_client.tx_hash,
          index: proof.spv_client.index,
        }),
      };
    },

    getChainInfo(): Promise<BtcChainInfo> {
      return http.get<BtcChainInfo>('/bitcoin/v1/info');
    },
  };
}
