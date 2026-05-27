/**
 * RGB++ BTC wallet compatibility.
 *
 * `signer.type === SignerType.BTC` is necessary but NOT sufficient: some BTC
 * signers in ccc are stubs. The RGB++ flow ultimately calls
 * `SignerBtc.signAndBroadcastPsbt` (see @ckb-ccc/rgbpp bitcoin/wallet.ts,
 * RgbppBrowserBtcWallet.signAndBroadcast), and the SDK itself notes that
 * "whether the signer fully implements signAndBroadcastPsbt" is the caller's
 * responsibility to enforce.
 *
 * Verified against the vendored ccc (1.0.x) signer implementations:
 *   UniSat          signPsbt ✅  signAndBroadcastPsbt ✅
 *   OKX Wallet      signPsbt ✅  signAndBroadcastPsbt ✅
 *   JoyID Passkey   signPsbt ✅  signAndBroadcastPsbt ✅ (atomic override)
 *   Xverse          signPsbt ✅  signAndBroadcastPsbt ✅ (atomic override)
 *   UTXO Global     signPsbt ❌ throws "not implemented yet"  → EXCLUDED
 *   Rei / Nostr / MetaMask / EVM   not a usable BTC signer    → EXCLUDED
 *
 * Names below are the wallet display names registered in
 * @ckb-ccc/ccc signersController. Verify with a runtime log of `wallet.name`
 * if a wallet unexpectedly disappears from the connect dialog.
 */

/** Wallets whose BTC signer fully supports RGB++ PSBT sign-and-broadcast. */
export const RGBPP_BTC_WALLETS = new Set<string>([
  'UniSat',
  'OKX Wallet',
  'JoyID Passkey',
  'Xverse',
]);

export function isRgbppCapableWallet(walletName: string): boolean {
  return RGBPP_BTC_WALLETS.has(walletName);
}
