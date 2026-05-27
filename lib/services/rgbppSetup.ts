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
import { ASSETS_API_BASE, IS_MAINNET } from './network';

/**
 * Lazily import the @ckb-ccc/rgbpp barrel.
 */
function loadRgbppModule() {
  return import('@ckb-ccc/rgbpp');
}

/**
 * Lazily create a BtcAssetsApi data source.
 *
 * `url` points at the local server proxy so calls egress from the deployment
 * server, not the user's browser. `isMainnet: false` is intentional even on
 * mainnet: it only controls whether the SDK *requires a client-side token*.
 * We keep the token server-side and let the proxy inject the Authorization /
 * Origin headers; BTC network correctness comes from the network config passed
 * to buildNetworkConfig, not from this flag.
 */
async function loadBtcDataSource() {
  const { BtcAssetsApi } = await loadRgbppModule();
  return new BtcAssetsApi({
    url: ASSETS_API_BASE,
    isMainnet: false,
  });
}

/**
 * Lazily create an RgbppUdtClient.
 */
async function loadRgbppUdtClient(ckbClient: ccc.Client) {
  const { RgbppUdtClient, ClientScriptProvider } = await loadRgbppModule();
  return new RgbppUdtClient(ckbClient, new ClientScriptProvider(ckbClient));
}

/**
 * Lazily create a RgbppBrowserBtcWallet for the connected BTC signer.
 */
async function loadBrowserBtcWallet(btcSigner: ccc.SignerBtc) {
  const { createRgbppBrowserBtcWallet, buildNetworkConfig, PredefinedNetwork } = await loadRgbppModule();
  const networkConfig = buildNetworkConfig(
    IS_MAINNET ? PredefinedNetwork.BitcoinMainnet : PredefinedNetwork.BitcoinTestnet3,
  );
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
  const { CkbRgbppUnlockSigner, ScriptManager, ClientScriptProvider } = await loadRgbppModule();
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
