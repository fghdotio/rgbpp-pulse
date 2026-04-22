/**
 * RGB++ Transaction Service
 *
 * Implements the three core operations (Leap to BTC, Transfer on BTC, Leap to CKB)
 * for both UDT and Spore assets. Based on the fghdotio/ccc feat/rgbpp-btc examples.
 *
 * Each operation returns a TransactionPipeline for real-time tracking.
 */
import type {
  TransactionPipeline,
  TransactionStep,
  UdtLeapToBtcParams,
  UdtTransferOnBtcParams,
  UdtLeapToCkbParams,
  SporeLeapToBtcParams,
  SporeTransferOnBtcParams,
  SporeLeapToCkbParams,
  RgbppOperation,
} from './types';
import { generateId } from '../utils/format';

/**
 * Create a fresh pipeline with the given steps.
 */
function createPipeline(
  operation: RgbppOperation,
  assetType: 'udt' | 'spore',
  assetName: string,
  stepLabels: string[],
): TransactionPipeline {
  return {
    id: generateId(),
    operation,
    assetType,
    assetName,
    status: 'active',
    createdAt: Date.now(),
    steps: stepLabels.map((label, i) => ({
      id: `step-${i}`,
      label,
      status: i === 0 ? 'active' : 'pending',
    })),
  };
}

/**
 * Simulate progressing through pipeline steps with delays.
 * In production, each step would invoke real SDK calls.
 */
async function simulatePipeline(
  pipeline: TransactionPipeline,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const steps = [...pipeline.steps];

  for (let i = 0; i < steps.length; i++) {
    steps[i] = { ...steps[i], status: 'active', timestamp: Date.now() };
    pipeline = { ...pipeline, steps: [...steps] };
    onUpdate(pipeline);

    // Simulate work
    await new Promise((r) => setTimeout(r, 1500 + Math.random() * 1000));

    const mockHash = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    steps[i] = {
      ...steps[i],
      status: 'done',
      timestamp: Date.now(),
      txHash: mockHash,
      chain: steps[i].label.toLowerCase().includes('btc') ? 'btc' : 'ckb',
    };
    pipeline = { ...pipeline, steps: [...steps] };
    onUpdate(pipeline);

    // Activate next step
    if (i + 1 < steps.length) {
      steps[i + 1] = { ...steps[i + 1], status: 'active' };
    }
  }

  pipeline = {
    ...pipeline,
    status: 'completed',
    completedAt: Date.now(),
    steps: [...steps],
  };
  onUpdate(pipeline);
  return pipeline;
}

// ─── UDT Operations ─────────────────────────────────────────

/**
 * UDT: Leap from CKB to BTC
 *
 * Real flow (from udt-leap-to-btc.ts):
 * 1. rgbppBtcWallet.prepareUtxoSeal()
 * 2. Build rgbppLock via rgbppUdtClient.buildRgbppLockScript(utxoSeal)
 * 3. udt.transfer(ckbSigner, [{ to: rgbppLock, amount }])
 * 4. udt.completeBy(tx, ckbSigner)
 * 5. tx.completeFeeBy(ckbSigner)
 * 6. ckbSigner.signTransaction(tx)
 * 7. ckbSigner.client.sendTransaction(signedTx)
 */
export async function udtLeapToBtc(
  _params: UdtLeapToBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('leap-to-btc', 'udt', 'UDT', [
    'Preparing UTXO Seal',
    'Building RGB++ Lock',
    'Composing CKB Transaction',
    'Signing CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

/**
 * UDT: Transfer on BTC
 *
 * Real flow (from rgbpp-udt-transfer-on-btc.ts):
 * 1. Build pseudo lock via rgbppUdtClient.buildPseudoRgbppLockScript()
 * 2. udt.transfer(ckbSigner, receivers mapped to pseudoLock)
 * 3. udt.completeChangeToLock(tx, ckbRgbppUnlockSigner, pseudoLock)
 * 4. rgbppBtcWallet.buildPsbt({ ckbPartialTx, ... })
 * 5. rgbppBtcWallet.signAndBroadcast(psbt) -> btcTxId
 * 6. rgbppUdtClient.injectTxIdToRgbppCkbTx(indexed, btcTxId)
 * 7. ckbRgbppUnlockSigner.signTransaction(injected)
 * 8. ckbSigner.signTransaction(rgbppSigned) -> sendTransaction
 */
export async function udtTransferOnBtc(
  _params: UdtTransferOnBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('transfer-on-btc', 'udt', 'UDT', [
    'Building CKB Partial Transaction',
    'Collecting UDT Inputs',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting BTC TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

/**
 * UDT: Leap from BTC to CKB
 *
 * Real flow (from rgbpp-udt-leap-to-ckb.ts):
 * 1. Build BTC time lock via rgbppUdtClient.buildBtcTimeLockScript(address)
 * 2. udt.transfer(ckbSigner, receivers mapped to timeLock)
 * 3. Build pseudo lock, completeChangeToLock
 * 4. buildPsbt + signAndBroadcast
 * 5. injectTxIdToRgbppCkbTx + sign + send
 */
export async function udtLeapToCkb(
  _params: UdtLeapToCkbParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('leap-to-ckb', 'udt', 'UDT', [
    'Building BTC Time Lock',
    'Composing CKB Partial Transaction',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

// ─── Spore Operations ───────────────────────────────────────

/**
 * Spore: Leap from CKB to BTC
 *
 * Real flow (from 5-spore-ckb-to-btc.ts):
 * 1. rgbppBtcWallet.prepareUtxoSeal()
 * 2. spore.transferSpore({ signer, id, to: buildRgbppLockScript(utxoSeal) })
 * 3. tx.completeFeeBy(ckbSigner)
 * 4. sign + send CKB tx
 */
export async function sporeLeapToBtc(
  _params: SporeLeapToBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('leap-to-btc', 'spore', 'Spore', [
    'Preparing UTXO Seal',
    'Transferring Spore to RGB++ Lock',
    'Completing CKB Fee',
    'Signing CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

/**
 * Spore: Transfer on BTC
 *
 * Real flow (from 3-spore-btc-transfer.ts):
 * 1. spore.transferSpore({ signer, id, to: pseudoRgbppLock })
 * 2. rgbppBtcWallet.buildPsbt(...)
 * 3. signAndBroadcast(psbt)
 * 4. injectTxIdToRgbppCkbTx
 * 5. sign RGB++ + CKB, send
 */
export async function sporeTransferOnBtc(
  _params: SporeTransferOnBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('transfer-on-btc', 'spore', 'Spore', [
    'Transferring Spore (CKB Partial)',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

/**
 * Spore: Leap from BTC to CKB
 *
 * Real flow (from 4-spore-btc-to-ckb.ts):
 * 1. spore.transferSpore({ signer, id, to: buildBtcTimeLockScript(address) })
 * 2. buildPsbt + signAndBroadcast
 * 3. injectTxIdToRgbppCkbTx + sign + send
 */
export async function sporeLeapToCkb(
  _params: SporeLeapToCkbParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const pipeline = createPipeline('leap-to-ckb', 'spore', 'Spore', [
    'Building BTC Time Lock',
    'Transferring Spore',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for Confirmation',
  ]);
  onUpdate(pipeline);
  return simulatePipeline(pipeline, onUpdate);
}

export type { TransactionStep };
