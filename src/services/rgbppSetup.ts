/**
 * RGB++ Infrastructure Setup
 *
 * Uses LAZY dynamic imports to avoid pulling in heavy Bitcoin dependencies
 * (ecpair, bitcoinjs-lib, secp256k1) at module load time — they fail in
 * browsers if imported eagerly.
 *
 * All factories return Promises and import modules on-demand.
 */
import { ccc } from '@ckb-ccc/core';

const BTC_ASSETS_API_URL = 'https://api-testnet.rgbpp.com';

/**
 * Lazily create a BtcAssetsApi data source.
 */
async function loadBtcDataSource() {
  const { BtcAssetsApi } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/data-source/btc-assets-api'
  );
  return new BtcAssetsApi({
    url: BTC_ASSETS_API_URL,
    isMainnet: false,
  });
}

/**
 * Lazily create an RgbppUdtClient.
 */
async function loadRgbppUdtClient(ckbClient: ccc.Client) {
  const { RgbppUdtClient } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/udt/client'
  );
  const { ClientScriptProvider } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/script/provider'
  );
  return new RgbppUdtClient(ckbClient, new ClientScriptProvider(ckbClient));
}

/**
 * Lazily create a RgbppBrowserBtcWallet for the connected BTC signer.
 */
async function loadBrowserBtcWallet(btcSigner: ccc.SignerBtc) {
  const { createRgbppBrowserBtcWallet, buildNetworkConfig, PredefinedNetwork } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/barrel'
  );
  const networkConfig = buildNetworkConfig(PredefinedNetwork.BitcoinTestnet3);
  const dataSource = await loadBtcDataSource();
  return createRgbppBrowserBtcWallet(btcSigner, networkConfig, dataSource);
}

// ─── Public API (all lazy) ────────────────────────────────────

export async function createRgbppClient(ckbClient: ccc.Client) {
  return loadRgbppUdtClient(ckbClient);
}

export async function createBrowserBtcWallet(btcSigner: ccc.SignerBtc) {
  return loadBrowserBtcWallet(btcSigner);
}

/**
 * Lazily create a CkbRgbppUnlockSigner for signing RGB++ unlock witnesses.
 * Required for transfer-on-btc and leap-to-ckb operations.
 */
export async function createUnlockSigner(ckbClient: ccc.Client, btcAddress: string) {
  const { CkbRgbppUnlockSigner } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/signer/index'
  );
  const { ScriptManager } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/script/manager'
  );
  const { ClientScriptProvider } = await import(
    /* @vite-ignore */
    '../../.scratch/fghdotio-ccc/packages/rgbpp/src/script/provider'
  );
  const dataSource = await loadBtcDataSource();
  const scriptManager = new ScriptManager(new ClientScriptProvider(ckbClient));
  const scriptInfos = await scriptManager.getRgbppScriptInfos();
  return new CkbRgbppUnlockSigner({
    ckbClient,
    rgbppBtcAddress: btcAddress,
    rgbppDataSource: dataSource,
    scriptInfos,
  });
}

/**
 * Check if a signer is a BTC signer (supports BTC PSBT signing).
 */
export function isBtcSigner(signer: ccc.Signer): signer is ccc.SignerBtc {
  return signer.type === ccc.SignerType.BTC;
}
