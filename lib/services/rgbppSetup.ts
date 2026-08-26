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
import { IS_MAINNET } from './network';
import { createRgbppDataSource, gateway, indexer } from './providers';

/**
 * Lazily import the @ckb-ccc/rgbpp barrel.
 */
function loadRgbppModule() {
  return import('@ckb-ccc/rgbpp');
}

/**
 * Build the SDK's data source from the two providers that own its halves:
 * Bitcoin and SPV proofs come from the gateway, RGB++ cell ownership from the
 * indexer. See lib/services/providers/data-source.ts.
 *
 * Both providers address local proxy routes, so calls egress from the
 * deployment server rather than the user's browser and upstream tokens stay
 * server-side.
 */
function buildDataSource(ckbClient: ccc.Client) {
  return createRgbppDataSource({ indexer, gateway, ckbClient });
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
  const { createRgbppBrowserBtcWallet, buildNetworkConfig, PredefinedNetwork } =
    await loadRgbppModule();
  const networkConfig = buildNetworkConfig(
    IS_MAINNET ? PredefinedNetwork.BitcoinMainnet : PredefinedNetwork.BitcoinTestnet3,
  );
  return createRgbppBrowserBtcWallet(
    btcSigner,
    networkConfig,
    buildDataSource(btcSigner.client),
  );
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
  const { CkbRgbppUnlockSigner, ScriptManager, ClientScriptProvider } =
    await loadRgbppModule();
  const scriptManager = new ScriptManager(new ClientScriptProvider(ckbClient));
  const scriptInfos = await scriptManager.getRgbppScriptInfos();
  return new CkbRgbppUnlockSigner({
    ckbClient,
    rgbppBtcAddress: btcAddress,
    rgbppDataSource: buildDataSource(ckbClient),
    scriptInfos,
  });
}

/**
 * Check if a signer is a BTC signer (supports BTC PSBT signing).
 */
export function isBtcSigner(signer: ccc.Signer): signer is ccc.SignerBtc {
  return signer.type === ccc.SignerType.BTC;
}
