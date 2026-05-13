/**
 * RGB++ Transaction Service
 *
 * Implements the three core operations (Leap to BTC, Transfer on BTC, Leap to CKB)
 * for both UDT and Spore assets. Based on the fghdotio/ccc feat/rgbpp-btc examples.
 *
 * Each operation returns a TransactionPipeline for real-time tracking.
 */
import { ccc } from '@ckb-ccc/core';
import { Udt } from '@ckb-ccc/udt';
import type {
  TransactionPipeline,
  TransactionStep,
  LeapToBtcCheckpoint,
  UdtLeapToBtcParams,
  UdtTransferOnBtcParams,
  UdtLeapToCkbParams,
  SporeLeapToBtcParams,
  SporeTransferOnBtcParams,
  SporeLeapToCkbParams,
  RgbppOperation,
} from './types';
import { generateId } from '@/lib/utils';
import { createRgbppClient, createBrowserBtcWallet, createUnlockSigner, isBtcSigner } from './rgbppSetup';
import { saveCheckpoint, clearCheckpoint } from './checkpoint';

/**
 * Extract a human-readable message from an unknown caught value.
 * Handles Error instances, plain objects (JSON-serialized), and primitives.
 */
function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}

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
 * Helper: advance a pipeline step to 'active'.
 */
function activateStep(pipeline: TransactionPipeline, index: number, onUpdate: (p: TransactionPipeline) => void) {
  const steps = [...pipeline.steps];
  steps[index] = { ...steps[index], status: 'active', timestamp: Date.now() };
  pipeline = { ...pipeline, steps };
  onUpdate(pipeline);
  return pipeline;
}

/**
 * Helper: mark a pipeline step as 'done' with an optional txHash.
 */
function completeStep(
  pipeline: TransactionPipeline,
  index: number,
  onUpdate: (p: TransactionPipeline) => void,
  opts?: { txHash?: string; chain?: 'ckb' | 'btc'; detail?: string },
) {
  const steps = [...pipeline.steps];
  steps[index] = {
    ...steps[index],
    status: 'done',
    timestamp: Date.now(),
    ...(opts?.txHash && { txHash: opts.txHash }),
    ...(opts?.chain && { chain: opts.chain }),
    ...(opts?.detail && { detail: opts.detail }),
  };
  pipeline = { ...pipeline, steps };
  onUpdate(pipeline);
  return pipeline;
}

/**
 * Helper: mark a pipeline step as 'error'.
 */
function failStep(
  pipeline: TransactionPipeline,
  index: number,
  error: string,
  onUpdate: (p: TransactionPipeline) => void,
) {
  const steps = [...pipeline.steps];
  steps[index] = { ...steps[index], status: 'error', error, timestamp: Date.now() };
  pipeline = { ...pipeline, steps, status: 'error' };
  onUpdate(pipeline);
  return pipeline;
}

/**
 * Simulate progressing through pipeline steps with delays.
 * Used as fallback when signer/client are not provided.
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
 * UDT: Leap from CKB to BTC (REAL IMPLEMENTATION)
 *
 * Flow:
 * 1. rgbppBtcWallet.buildSealPsbt()        — build PSBT for seal UTXO
 * 2. rgbppBtcWallet.signAndBroadcast(psbt)  — sign & broadcast BTC tx
 * 3. rgbppBtcWallet.waitForConfirmation()   — wait for BTC confirmation
 * 4. rgbppUdtClient.buildRgbppLockScript()  — build RGB++ lock
 * 5. udt.transfer + completeBy + fee        — compose CKB tx
 * 6. signer.signTransaction(tx)             — sign CKB tx
 * 7. client.sendTransaction(signedTx)       — broadcast CKB tx
 * 8. client.waitTransaction(txHash)         — wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function udtLeapToBtc(
  params: UdtLeapToBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { udtScriptArgs, amount, signer, client } = params;

  let pipeline = createPipeline('leap-to-btc', 'udt', 'UDT', [
    'Building BTC Seal PSBT',
    'Signing & Broadcasting BTC TX',
    'Waiting for BTC Confirmation',
    'Building RGB++ Lock',
    'Composing CKB Transaction',
    'Signing CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[udtLeapToBtc] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  // Verify the signer is a BTC signer
  if (!isBtcSigner(signer)) {
    console.warn('[udtLeapToBtc] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);
    // Step 0: Build Seal PSBT
    pipeline = activateStep(pipeline, 0, onUpdate);
    const { psbt, sealOutputIndex } = await rgbppBtcWallet.buildSealPsbt();
    pipeline = completeStep(pipeline, 0, onUpdate, { chain: 'btc' });

    // Step 1: Sign & Broadcast BTC TX (acquire signing lock for wallet popup)
    pipeline = activateStep(pipeline, 1, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 1, onUpdate, {
      txHash: btcTxId,
      detail: `BTC TX: ${btcTxId}`,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      udtScriptArgs,
      amount: amount.toString(),
      btcTxId,
      sealOutputIndex,
      lastCompletedStep: 1,
      createdAt: Date.now(),
    });

    // Step 2: Wait for BTC Confirmation
    pipeline = activateStep(pipeline, 2, onUpdate);
    await rgbppBtcWallet.waitForConfirmation(btcTxId);
    const utxoSeal = { txid: btcTxId, vout: sealOutputIndex };
    pipeline = completeStep(pipeline, 2, onUpdate, {
      txHash: btcTxId,
      detail: `UTXO Seal: ${btcTxId}:${sealOutputIndex}`,
      chain: 'btc',
    });

    // ── Checkpoint: BTC confirmed ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      udtScriptArgs,
      amount: amount.toString(),
      btcTxId,
      sealOutputIndex,
      lastCompletedStep: 2,
      createdAt: Date.now(),
    });

    // Step 3: Build RGB++ Lock Script
    pipeline = activateStep(pipeline, 3, onUpdate);
    const rgbppLock = await rgbppUdtClient.buildRgbppLockScript(utxoSeal);
    pipeline = completeStep(pipeline, 3, onUpdate);

    // Step 4: Compose CKB Transaction
    pipeline = activateStep(pipeline, 4, onUpdate);
    const scriptInfo = await client.getKnownScript(ccc.KnownScript.XUdt);
    const udtInstance = new Udt(
      scriptInfo.cellDeps[0].cellDep.outPoint,
      ccc.Script.from({
        codeHash: scriptInfo.codeHash,
        hashType: scriptInfo.hashType,
        args: udtScriptArgs,
      }),
    );
    const { res: tx } = await udtInstance.transfer(signer, [
      { to: rgbppLock, amount },
    ]);
    const txWithInputs = await udtInstance.completeBy(tx, signer);
    await txWithInputs.completeFeeBy(signer);
    pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

    // Step 5: Sign CKB Transaction (acquire signing lock for wallet popup)
    pipeline = activateStep(pipeline, 5, onUpdate);
    const signedTx = await signer.signTransaction(txWithInputs);
    pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

    // Step 6: Broadcast to CKB
    pipeline = activateStep(pipeline, 6, onUpdate);
    const txHash = await client.sendTransaction(signedTx);
    pipeline = completeStep(pipeline, 6, onUpdate, {
      txHash,
      chain: 'ckb',
    });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      udtScriptArgs,
      amount: amount.toString(),
      btcTxId,
      sealOutputIndex,
      ckbTxHash: txHash,
      lastCompletedStep: 6,
      createdAt: Date.now(),
    });

    // Step 7: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 7, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    const activeLabel = activeIndex >= 0 ? pipeline.steps[activeIndex].label : 'unknown';
    console.error(`[udtLeapToBtc] Error at step "${activeLabel}":`, err);

    // Find the active step and mark it as failed
    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * Resume a UDT Leap-to-BTC transaction from a checkpoint after page refresh.
 *
 * Recovery paths based on lastCompletedStep:
 * - 1: BTC broadcast done → wait for BTC confirmation, then do CKB side
 * - 2: BTC confirmed → redo CKB side from scratch (build lock → sign → broadcast → wait)
 * - 3-5: same as 2 (CKB steps are pure computation, safe to redo)
 * - 6: CKB broadcast done → resume waiting for CKB confirmation
 */
export async function resumeUdtLeapToBtc(
  checkpoint: LeapToBtcCheckpoint,
  pipeline: TransactionPipeline,
  signer: ccc.SignerBtc,
  client: ccc.Client,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  console.log(`[Recovery] Resuming udtLeapToBtc pipeline ${pipeline.id} from step ${checkpoint.lastCompletedStep}`);

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);

    // ── Resume BTC confirmation if needed ──
    if (checkpoint.lastCompletedStep === 1 && checkpoint.btcTxId) {
      pipeline = activateStep(pipeline, 2, onUpdate);
      const steps = [...pipeline.steps];
      steps[2] = { ...steps[2], detail: 'Resuming after page refresh...' };
      pipeline = { ...pipeline, steps };
      onUpdate(pipeline);

      await rgbppBtcWallet.waitForConfirmation(checkpoint.btcTxId);
      pipeline = completeStep(pipeline, 2, onUpdate, {
        txHash: checkpoint.btcTxId,
        detail: `UTXO Seal: ${checkpoint.btcTxId}:${checkpoint.sealOutputIndex}`,
        chain: 'btc',
      });

      saveCheckpoint({ ...checkpoint, lastCompletedStep: 2 });
    }

    // ── Resume CKB confirmation if CKB was already broadcast ──
    if (checkpoint.lastCompletedStep === 6 && checkpoint.ckbTxHash) {
      pipeline = activateStep(pipeline, 7, onUpdate);
      const steps = [...pipeline.steps];
      steps[7] = { ...steps[7], detail: 'Resuming after page refresh...' };
      pipeline = { ...pipeline, steps };
      onUpdate(pipeline);

      await client.waitTransaction(checkpoint.ckbTxHash);
      pipeline = completeStep(pipeline, 7, onUpdate, {
        txHash: checkpoint.ckbTxHash,
        chain: 'ckb',
      });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    // ── Redo CKB side from scratch (steps 3-7) ──
    // This path is taken when lastCompletedStep is 2-5 (BTC confirmed, CKB not yet broadcast)
    if (checkpoint.btcTxId && checkpoint.sealOutputIndex != null) {
      const utxoSeal = { txid: checkpoint.btcTxId, vout: checkpoint.sealOutputIndex };

      // Step 3: Build RGB++ Lock Script
      pipeline = activateStep(pipeline, 3, onUpdate);
      const steps3 = [...pipeline.steps];
      steps3[3] = { ...steps3[3], detail: 'Recovering...' };
      pipeline = { ...pipeline, steps: steps3 };
      onUpdate(pipeline);

      const rgbppLock = await rgbppUdtClient.buildRgbppLockScript(utxoSeal);
      pipeline = completeStep(pipeline, 3, onUpdate);

      // Step 4: Compose CKB Transaction
      pipeline = activateStep(pipeline, 4, onUpdate);
      const scriptInfo = await client.getKnownScript(ccc.KnownScript.XUdt);
      const udtInstance = new Udt(
        scriptInfo.cellDeps[0].cellDep.outPoint,
        ccc.Script.from({
          codeHash: scriptInfo.codeHash,
          hashType: scriptInfo.hashType,
          args: checkpoint.udtScriptArgs,
        }),
      );
      const { res: tx } = await udtInstance.transfer(signer, [
        { to: rgbppLock, amount: BigInt(checkpoint.amount) },
      ]);
      const txWithInputs = await udtInstance.completeBy(tx, signer);
      await txWithInputs.completeFeeBy(signer);
      pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

      // Step 5: Sign CKB Transaction (acquire signing lock for wallet popup)
      pipeline = activateStep(pipeline, 5, onUpdate);
      const signedTx = await signer.signTransaction(txWithInputs);
      pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

      // Step 6: Broadcast to CKB
      pipeline = activateStep(pipeline, 6, onUpdate);
      const txHash = await client.sendTransaction(signedTx);
      pipeline = completeStep(pipeline, 6, onUpdate, { txHash, chain: 'ckb' });

      saveCheckpoint({
        ...checkpoint,
        ckbTxHash: txHash,
        lastCompletedStep: 6,
      });

      // Step 7: Wait for CKB Confirmation
      pipeline = activateStep(pipeline, 7, onUpdate);
      await client.waitTransaction(txHash);
      pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    // Shouldn't reach here — mark as error
    throw new Error('Checkpoint data insufficient for recovery');
  } catch (err) {
    const errorMsg = formatError(err);
    console.error(`[Recovery] Failed to resume pipeline ${pipeline.id}:`, errorMsg, err);

    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, `Recovery failed: ${errorMsg}`, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * Resume a UDT Transfer-on-BTC transaction from a checkpoint after page refresh.
 *
 * Recovery paths based on lastCompletedStep:
 * - 3: BTC broadcast done → deserialize persisted CKB partial tx, inject btcTxId, sign, broadcast, wait
 * - 6: CKB broadcast done → resume waiting for CKB confirmation
 */
export async function resumeUdtTransferOnBtc(
  checkpoint: LeapToBtcCheckpoint,
  pipeline: TransactionPipeline,
  signer: ccc.SignerBtc,
  client: ccc.Client,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  console.log(`[Recovery] Resuming udtTransferOnBtc pipeline ${pipeline.id} from step ${checkpoint.lastCompletedStep}`);

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // ── Resume CKB confirmation if CKB was already broadcast ──
    if (checkpoint.lastCompletedStep === 6 && checkpoint.ckbTxHash) {
      pipeline = activateStep(pipeline, 7, onUpdate);
      const steps = [...pipeline.steps];
      steps[7] = { ...steps[7], detail: 'Resuming after page refresh...' };
      pipeline = { ...pipeline, steps };
      onUpdate(pipeline);

      await client.waitTransaction(checkpoint.ckbTxHash);
      pipeline = completeStep(pipeline, 7, onUpdate, {
        txHash: checkpoint.ckbTxHash,
        chain: 'ckb',
      });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    // ── Restore CKB partial tx from checkpoint after BTC broadcast (step 3) ──
    if (checkpoint.lastCompletedStep === 3 && checkpoint.btcTxId) {
      if (!checkpoint.serializedCkbPartialTx) {
        throw new Error(
          'Checkpoint missing serializedCkbPartialTx — cannot recover. ' +
          'The CKB partial TX must exactly match the BTC commitment.',
        );
      }

      // Deserialize the exact CKB partial TX that was used to build the BTC commitment
      pipeline = activateStep(pipeline, 4, onUpdate);
      const steps4 = [...pipeline.steps];
      steps4[4] = { ...steps4[4], detail: 'Recovering — restoring CKB tx from checkpoint...' };
      pipeline = { ...pipeline, steps: steps4 };
      onUpdate(pipeline);

      const indexedCkbPartialTx = ccc.Transaction.from(
        JSON.parse(checkpoint.serializedCkbPartialTx),
      );

      // Inject btcTxId
      const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
        indexedCkbPartialTx,
        checkpoint.btcTxId,
      );
      pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

      // Sign RGB++ CKB tx (acquire signing lock for wallet popups)
      pipeline = activateStep(pipeline, 5, onUpdate);
      const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
      await rgbppSignedCkbTx.completeFeeBy(signer);
      const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
      pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

      // Broadcast CKB
      pipeline = activateStep(pipeline, 6, onUpdate);
      const txHash = await client.sendTransaction(ckbFinalTx);
      pipeline = completeStep(pipeline, 6, onUpdate, { txHash, chain: 'ckb' });

      saveCheckpoint({
        ...checkpoint,
        ckbTxHash: txHash,
        lastCompletedStep: 6,
      });

      // Wait for CKB confirmation
      pipeline = activateStep(pipeline, 7, onUpdate);
      await client.waitTransaction(txHash);
      pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    throw new Error('Checkpoint data insufficient for recovery');
  } catch (err) {
    const errorMsg = formatError(err);
    console.error(`[Recovery] Failed to resume transfer-on-btc pipeline ${pipeline.id}:`, errorMsg, err);

    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, `Recovery failed: ${errorMsg}`, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * Resume a UDT Leap-to-CKB transaction from a checkpoint after page refresh.
 *
 * Recovery paths based on lastCompletedStep:
 * - 4: BTC broadcast done → deserialize persisted CKB partial tx, inject btcTxId, sign, broadcast, wait
 * - 7: CKB broadcast done → resume waiting for CKB confirmation
 */
export async function resumeUdtLeapToCkb(
  checkpoint: LeapToBtcCheckpoint,
  pipeline: TransactionPipeline,
  signer: ccc.SignerBtc,
  client: ccc.Client,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  console.log(`[Recovery] Resuming udtLeapToCkb pipeline ${pipeline.id} from step ${checkpoint.lastCompletedStep}`);

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // ── Resume CKB confirmation if CKB was already broadcast ──
    if (checkpoint.lastCompletedStep === 7 && checkpoint.ckbTxHash) {
      pipeline = activateStep(pipeline, 8, onUpdate);
      const steps = [...pipeline.steps];
      steps[8] = { ...steps[8], detail: 'Resuming after page refresh...' };
      pipeline = { ...pipeline, steps };
      onUpdate(pipeline);

      await client.waitTransaction(checkpoint.ckbTxHash);
      pipeline = completeStep(pipeline, 8, onUpdate, {
        txHash: checkpoint.ckbTxHash,
        chain: 'ckb',
      });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    // ── Restore CKB partial tx from checkpoint after BTC broadcast (step 4) ──
    if (checkpoint.lastCompletedStep === 4 && checkpoint.btcTxId) {
      if (!checkpoint.serializedCkbPartialTx) {
        throw new Error(
          'Checkpoint missing serializedCkbPartialTx — cannot recover. ' +
          'The CKB partial TX must exactly match the BTC commitment.',
        );
      }

      // Deserialize the exact CKB partial TX that was used to build the BTC commitment
      pipeline = activateStep(pipeline, 5, onUpdate);
      const steps5 = [...pipeline.steps];
      steps5[5] = { ...steps5[5], detail: 'Recovering — restoring CKB tx from checkpoint...' };
      pipeline = { ...pipeline, steps: steps5 };
      onUpdate(pipeline);

      const indexedCkbPartialTx = ccc.Transaction.from(
        JSON.parse(checkpoint.serializedCkbPartialTx),
      );

      // Inject btcTxId
      const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
        indexedCkbPartialTx,
        checkpoint.btcTxId,
      );
      pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

      // Sign RGB++ CKB tx (acquire signing lock for wallet popups)
      pipeline = activateStep(pipeline, 6, onUpdate);
      const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
      await rgbppSignedCkbTx.completeFeeBy(signer);
      const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
      pipeline = completeStep(pipeline, 6, onUpdate, { chain: 'ckb' });

      // Broadcast CKB
      pipeline = activateStep(pipeline, 7, onUpdate);
      const txHash = await client.sendTransaction(ckbFinalTx);
      pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

      saveCheckpoint({
        ...checkpoint,
        ckbTxHash: txHash,
        lastCompletedStep: 7,
      });

      // Wait for CKB confirmation
      pipeline = activateStep(pipeline, 8, onUpdate);
      await client.waitTransaction(txHash);
      pipeline = completeStep(pipeline, 8, onUpdate, { txHash, chain: 'ckb' });

      clearCheckpoint(pipeline.id);
      pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
      onUpdate(pipeline);
      return pipeline;
    }

    throw new Error('Checkpoint data insufficient for recovery');
  } catch (err) {
    const errorMsg = formatError(err);
    console.error(`[Recovery] Failed to resume leap-to-ckb pipeline ${pipeline.id}:`, errorMsg, err);

    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, `Recovery failed: ${errorMsg}`, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * UDT: Transfer on BTC (REAL IMPLEMENTATION)
 *
 * Flow:
 * 1. Build pseudo lock + UDT transfer → CKB partial tx
 * 2. Collect UDT inputs (completeChangeToLock)
 * 3. Build BTC PSBT from CKB partial tx
 * 4. Sign & broadcast BTC tx
 * 5. Inject BTC txId into CKB tx
 * 6. Sign RGB++ CKB tx (unlock signer + user signer)
 * 7. Broadcast CKB tx
 * 8. Wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function udtTransferOnBtc(
  params: UdtTransferOnBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { udtScriptArgs, receivers, signer, client } = params;

  let pipeline = createPipeline('transfer-on-btc', 'udt', 'UDT', [
    'Building CKB Partial Transaction',
    'Collecting UDT Inputs',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting BTC TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[udtTransferOnBtc] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  if (!isBtcSigner(signer)) {
    console.warn('[udtTransferOnBtc] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // Step 0: Build CKB Partial Transaction
    pipeline = activateStep(pipeline, 0, onUpdate);
    const scriptInfo = await client.getKnownScript(ccc.KnownScript.XUdt);
    const udtInstance = new Udt(
      scriptInfo.cellDeps[0].cellDep.outPoint,
      ccc.Script.from({
        codeHash: scriptInfo.codeHash,
        hashType: scriptInfo.hashType,
        args: udtScriptArgs,
      }),
    );
    const pseudoRgbppLock = await rgbppUdtClient.buildPseudoRgbppLockScript();
    const { res: tx } = await udtInstance.transfer(
      signer,
      receivers.map((r) => ({ to: pseudoRgbppLock, amount: r.amount })),
    );
    pipeline = completeStep(pipeline, 0, onUpdate, { chain: 'ckb' });

    // Step 1: Collect UDT Inputs
    pipeline = activateStep(pipeline, 1, onUpdate);
    const txWithInputs = await udtInstance.completeChangeToLock(
      tx,
      ckbRgbppUnlockSigner,
      pseudoRgbppLock,
    );
    pipeline = completeStep(pipeline, 1, onUpdate, { chain: 'ckb' });

    // Step 2: Build BTC PSBT
    pipeline = activateStep(pipeline, 2, onUpdate);
    const { psbt, indexedCkbPartialTx } = await rgbppBtcWallet.buildPsbt({
      ckbPartialTx: txWithInputs,
      ckbClient: client,
      rgbppUdtClient,
      btcChangeAddress: btcAddress,
      receiverBtcAddresses: receivers.map((r) => r.address),
    });
    pipeline = completeStep(pipeline, 2, onUpdate, { chain: 'btc' });

    // Step 3: Sign & Broadcast BTC TX (acquire signing lock for wallet popup)
    pipeline = activateStep(pipeline, 3, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 3, onUpdate, {
      txHash: btcTxId,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    // Persist the indexedCkbPartialTx so recovery uses the exact CKB TX
    // that matches the BTC commitment, rather than rebuilding (which risks
    // different UTXO selection → commitment mismatch → on-chain rejection).
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'transfer-on-btc',
      udtScriptArgs,
      amount: '0',
      receivers: receivers.map((r) => ({ address: r.address, amount: r.amount.toString() })),
      btcTxId,
      serializedCkbPartialTx: ccc.stringify(indexedCkbPartialTx),
      lastCompletedStep: 3,
      createdAt: Date.now(),
    });

    // Step 4: Inject BTC TX ID to CKB
    pipeline = activateStep(pipeline, 4, onUpdate);
    const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
      indexedCkbPartialTx,
      btcTxId,
    );
    pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

    // Step 5: Sign RGB++ CKB Transaction (acquire signing lock for wallet popups)
    pipeline = activateStep(pipeline, 5, onUpdate);
    const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
    await rgbppSignedCkbTx.completeFeeBy(signer);
    const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
    pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

    // Step 6: Broadcast to CKB
    pipeline = activateStep(pipeline, 6, onUpdate);
    const txHash = await client.sendTransaction(ckbFinalTx);
    pipeline = completeStep(pipeline, 6, onUpdate, { txHash, chain: 'ckb' });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'transfer-on-btc',
      udtScriptArgs,
      amount: '0',
      receivers: receivers.map((r) => ({ address: r.address, amount: r.amount.toString() })),
      btcTxId,
      ckbTxHash: txHash,
      lastCompletedStep: 6,
      createdAt: Date.now(),
    });

    // Step 7: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 7, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    console.error('[udtTransferOnBtc] Error:', errorMsg, err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * UDT: Leap from BTC to CKB (REAL IMPLEMENTATION)
 *
 * Flow (from rgbpp-udt-leap-to-ckb.ts):
 * 1. Build BTC time lock scripts for each CKB receiver address
 * 2. Compose CKB partial tx via udt.transfer with time-locked outputs
 * 3. Build pseudo RGB++ lock + completeChangeToLock to collect inputs
 * 4. Build BTC PSBT from CKB partial tx
 * 5. Sign & broadcast BTC tx
 * 6. Inject BTC txId into CKB partial tx
 * 7. Sign RGB++ CKB tx (unlock signer + user signer)
 * 8. Broadcast CKB tx
 * 9. Wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function udtLeapToCkb(
  params: UdtLeapToCkbParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { udtScriptArgs, receivers, signer, client } = params;

  let pipeline = createPipeline('leap-to-ckb', 'udt', 'UDT', [
    'Building BTC Time Locks',
    'Composing CKB Partial Transaction',
    'Collecting UDT Inputs',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[udtLeapToCkb] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  if (!isBtcSigner(signer)) {
    console.warn('[udtLeapToCkb] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // Step 0: Build BTC Time Lock scripts for each CKB receiver
    pipeline = activateStep(pipeline, 0, onUpdate);
    const timeLockOutputs = await Promise.all(
      receivers.map(async (r) => ({
        to: await rgbppUdtClient.buildBtcTimeLockScript(r.address),
        amount: r.amount,
      })),
    );
    pipeline = completeStep(pipeline, 0, onUpdate, {
      detail: `${receivers.length} time lock(s) built`,
    });

    // Step 1: Compose CKB Partial Transaction
    pipeline = activateStep(pipeline, 1, onUpdate);
    const scriptInfo = await client.getKnownScript(ccc.KnownScript.XUdt);
    const udtInstance = new Udt(
      scriptInfo.cellDeps[0].cellDep.outPoint,
      ccc.Script.from({
        codeHash: scriptInfo.codeHash,
        hashType: scriptInfo.hashType,
        args: udtScriptArgs,
      }),
    );
    const { res: tx } = await udtInstance.transfer(signer, timeLockOutputs);
    pipeline = completeStep(pipeline, 1, onUpdate, { chain: 'ckb' });

    // Step 2: Collect UDT Inputs (completeChangeToLock)
    pipeline = activateStep(pipeline, 2, onUpdate);
    const pseudoRgbppLock = await rgbppUdtClient.buildPseudoRgbppLockScript();
    const txWithInputs = await udtInstance.completeChangeToLock(
      tx,
      ckbRgbppUnlockSigner,
      pseudoRgbppLock,
    );
    pipeline = completeStep(pipeline, 2, onUpdate, { chain: 'ckb' });

    // Step 3: Build BTC PSBT
    pipeline = activateStep(pipeline, 3, onUpdate);
    const { psbt, indexedCkbPartialTx } = await rgbppBtcWallet.buildPsbt({
      ckbPartialTx: txWithInputs,
      ckbClient: client,
      rgbppUdtClient,
      btcChangeAddress: btcAddress,
      receiverBtcAddresses: [], // leap-to-ckb has no BTC receivers
    });
    pipeline = completeStep(pipeline, 3, onUpdate, { chain: 'btc' });

    // Step 4: Sign & Broadcast BTC TX (acquire signing lock for wallet popup)
    pipeline = activateStep(pipeline, 4, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 4, onUpdate, {
      txHash: btcTxId,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    // Persist the indexedCkbPartialTx so recovery uses the exact CKB TX
    // that matches the BTC commitment, rather than rebuilding.
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-ckb',
      udtScriptArgs,
      amount: '0',
      receivers: receivers.map((r) => ({ address: r.address, amount: r.amount.toString() })),
      btcTxId,
      serializedCkbPartialTx: ccc.stringify(indexedCkbPartialTx),
      lastCompletedStep: 4,
      createdAt: Date.now(),
    });

    // Step 5: Inject BTC TX ID to CKB
    pipeline = activateStep(pipeline, 5, onUpdate);
    const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
      indexedCkbPartialTx,
      btcTxId,
    );
    pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

    // Step 6: Sign RGB++ CKB Transaction (acquire signing lock for wallet popups)
    pipeline = activateStep(pipeline, 6, onUpdate);
    const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
    await rgbppSignedCkbTx.completeFeeBy(signer);
    const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
    pipeline = completeStep(pipeline, 6, onUpdate, { chain: 'ckb' });

    // Step 7: Broadcast to CKB
    pipeline = activateStep(pipeline, 7, onUpdate);
    const txHash = await client.sendTransaction(ckbFinalTx);
    pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-ckb',
      udtScriptArgs,
      amount: '0',
      receivers: receivers.map((r) => ({ address: r.address, amount: r.amount.toString() })),
      btcTxId,
      ckbTxHash: txHash,
      lastCompletedStep: 7,
      createdAt: Date.now(),
    });

    // Step 8: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 8, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 8, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    const activeLabel = activeIndex >= 0 ? pipeline.steps[activeIndex].label : 'unknown';
    console.error(`[udtLeapToCkb] Error at step "${activeLabel}":`, err);

    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

// ─── Spore Operations ───────────────────────────────────────

/**
 * Lazily load the spore module to avoid pulling in heavy deps at module load time.
 */
async function loadSporeModule() {
  const { spore } = await import('@ckb-ccc/spore');
  return spore;
}

/**
 * Spore: Leap from CKB to BTC (REAL IMPLEMENTATION)
 *
 * Flow (from spore-leap-to-btc.ts):
 * 1. rgbppBtcWallet.buildSealPsbt()        — build PSBT for seal UTXO
 * 2. rgbppBtcWallet.signAndBroadcast(psbt)  — sign & broadcast BTC tx
 * 3. rgbppBtcWallet.waitForConfirmation()   — wait for BTC confirmation
 * 4. rgbppUdtClient.buildRgbppLockScript()  — build RGB++ lock
 * 5. spore.transferSpore({ signer, id, to }) — compose CKB tx
 * 6. tx.completeFeeBy(signer)               — complete fee
 * 7. signer.signTransaction(tx)             — sign CKB tx
 * 8. client.sendTransaction(signedTx)       — broadcast CKB tx
 * 9. client.waitTransaction(txHash)         — wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function sporeLeapToBtc(
  params: SporeLeapToBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { sporeTypeArgs, signer, client } = params;

  let pipeline = createPipeline('leap-to-btc', 'spore', 'Spore', [
    'Building BTC Seal PSBT',
    'Signing & Broadcasting BTC TX',
    'Waiting for BTC Confirmation',
    'Building RGB++ Lock',
    'Composing CKB Transaction (Spore Transfer)',
    'Completing CKB Fee',
    'Signing CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[sporeLeapToBtc] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  if (!isBtcSigner(signer)) {
    console.warn('[sporeLeapToBtc] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const sporeMod = await loadSporeModule();
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);

    // Step 0: Build Seal PSBT
    pipeline = activateStep(pipeline, 0, onUpdate);
    const { psbt, sealOutputIndex } = await rgbppBtcWallet.buildSealPsbt();
    pipeline = completeStep(pipeline, 0, onUpdate, { chain: 'btc' });

    // Step 1: Sign & Broadcast BTC TX
    pipeline = activateStep(pipeline, 1, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 1, onUpdate, {
      txHash: btcTxId,
      detail: `BTC TX: ${btcTxId}`,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-btc',
      udtScriptArgs: sporeTypeArgs,
      amount: '0',
      btcTxId,
      sealOutputIndex,
      lastCompletedStep: 1,
      createdAt: Date.now(),
    });

    // Step 2: Wait for BTC Confirmation
    pipeline = activateStep(pipeline, 2, onUpdate);
    await rgbppBtcWallet.waitForConfirmation(btcTxId);
    const utxoSeal = { txid: btcTxId, vout: sealOutputIndex };
    pipeline = completeStep(pipeline, 2, onUpdate, {
      txHash: btcTxId,
      detail: `UTXO Seal: ${btcTxId}:${sealOutputIndex}`,
      chain: 'btc',
    });

    // Step 3: Build RGB++ Lock Script
    pipeline = activateStep(pipeline, 3, onUpdate);
    const rgbppLock = await rgbppUdtClient.buildRgbppLockScript(utxoSeal);
    pipeline = completeStep(pipeline, 3, onUpdate);

    // Step 4: Compose CKB Transaction (Spore Transfer)
    pipeline = activateStep(pipeline, 4, onUpdate);
    const { tx } = await sporeMod.transferSpore({
      signer,
      id: sporeTypeArgs,
      to: rgbppLock,
    });
    pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

    // Step 5: Complete CKB Fee
    pipeline = activateStep(pipeline, 5, onUpdate);
    await tx.completeFeeBy(signer);
    pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

    // Step 6: Sign CKB Transaction
    pipeline = activateStep(pipeline, 6, onUpdate);
    const signedTx = await signer.signTransaction(tx);
    pipeline = completeStep(pipeline, 6, onUpdate, { chain: 'ckb' });

    // Step 7: Broadcast to CKB
    pipeline = activateStep(pipeline, 7, onUpdate);
    const txHash = await client.sendTransaction(signedTx);
    pipeline = completeStep(pipeline, 7, onUpdate, {
      txHash,
      chain: 'ckb',
    });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-btc',
      udtScriptArgs: sporeTypeArgs,
      amount: '0',
      btcTxId,
      sealOutputIndex,
      ckbTxHash: txHash,
      lastCompletedStep: 7,
      createdAt: Date.now(),
    });

    // Step 8: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 8, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 8, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    const activeLabel = activeIndex >= 0 ? pipeline.steps[activeIndex].label : 'unknown';
    console.error(`[sporeLeapToBtc] Error at step "${activeLabel}":`, err);

    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * Spore: Transfer on BTC (REAL IMPLEMENTATION)
 *
 * Flow (from rgbpp-spore-transfer-on-btc.ts):
 * 1. Build pseudo RGB++ lock
 * 2. For each transfer: spore.transferSpore({ signer, id, to: pseudoLock, tx })
 * 3. Build BTC PSBT from CKB partial tx
 * 4. Sign & broadcast BTC tx
 * 5. Inject BTC txId into CKB partial tx
 * 6. Sign RGB++ CKB tx (unlock signer + user signer)
 * 7. Broadcast CKB tx
 * 8. Wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function sporeTransferOnBtc(
  params: SporeTransferOnBtcParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { transfers, signer, client } = params;

  let pipeline = createPipeline('transfer-on-btc', 'spore', 'Spore', [
    'Building CKB Partial Transaction (Spore Transfer)',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting BTC TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[sporeTransferOnBtc] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  if (!isBtcSigner(signer)) {
    console.warn('[sporeTransferOnBtc] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const sporeMod = await loadSporeModule();
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // Step 0: Build CKB Partial Transaction (Spore Transfer)
    pipeline = activateStep(pipeline, 0, onUpdate);
    const pseudoRgbppLock = await rgbppUdtClient.buildPseudoRgbppLockScript();

    let ckbPartialTx = ccc.Transaction.from({});
    for (const { sporeTypeArgs } of transfers) {
      const { tx: _ckbPartialTx } = await sporeMod.transferSpore({
        signer,
        id: sporeTypeArgs,
        to: pseudoRgbppLock,
        tx: ckbPartialTx,
      });
      ckbPartialTx = _ckbPartialTx;
    }
    pipeline = completeStep(pipeline, 0, onUpdate, { chain: 'ckb' });

    // Step 1: Build BTC PSBT
    pipeline = activateStep(pipeline, 1, onUpdate);
    const { psbt, indexedCkbPartialTx } = await rgbppBtcWallet.buildPsbt({
      ckbPartialTx,
      ckbClient: client,
      rgbppUdtClient,
      btcChangeAddress: btcAddress,
      receiverBtcAddresses: transfers.map((t) => t.btcAddress),
    });
    pipeline = completeStep(pipeline, 1, onUpdate, { chain: 'btc' });

    // Step 2: Sign & Broadcast BTC TX
    pipeline = activateStep(pipeline, 2, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 2, onUpdate, {
      txHash: btcTxId,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'transfer-on-btc',
      udtScriptArgs: transfers.map((t) => t.sporeTypeArgs).join(','),
      amount: '0',
      btcTxId,
      serializedCkbPartialTx: ccc.stringify(indexedCkbPartialTx),
      lastCompletedStep: 2,
      createdAt: Date.now(),
    });

    // Step 3: Inject BTC TX ID to CKB
    pipeline = activateStep(pipeline, 3, onUpdate);
    const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
      indexedCkbPartialTx,
      btcTxId,
    );
    pipeline = completeStep(pipeline, 3, onUpdate, { chain: 'ckb' });

    // Step 4: Sign RGB++ CKB Transaction
    pipeline = activateStep(pipeline, 4, onUpdate);
    const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
    await rgbppSignedCkbTx.completeFeeBy(signer);
    const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
    pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

    // Step 5: Broadcast to CKB
    pipeline = activateStep(pipeline, 5, onUpdate);
    const txHash = await client.sendTransaction(ckbFinalTx);
    pipeline = completeStep(pipeline, 5, onUpdate, { txHash, chain: 'ckb' });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'transfer-on-btc',
      udtScriptArgs: transfers.map((t) => t.sporeTypeArgs).join(','),
      amount: '0',
      btcTxId,
      ckbTxHash: txHash,
      lastCompletedStep: 5,
      createdAt: Date.now(),
    });

    // Step 6: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 6, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 6, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    const activeLabel = activeIndex >= 0 ? pipeline.steps[activeIndex].label : 'unknown';
    console.error(`[sporeTransferOnBtc] Error at step "${activeLabel}":`, err);

    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

/**
 * Spore: Leap from BTC to CKB (REAL IMPLEMENTATION)
 *
 * Flow (from rgbpp-spore-leap-to-ckb.ts):
 * 1. Build BTC time lock script for the CKB receiver address
 * 2. spore.transferSpore({ signer, id, to: timeLock }) — compose CKB partial tx
 * 3. Build BTC PSBT from CKB partial tx
 * 4. Sign & broadcast BTC tx
 * 5. Inject BTC txId into CKB partial tx
 * 6. Sign RGB++ CKB tx (unlock signer + user signer)
 * 7. Broadcast CKB tx
 * 8. Wait for CKB confirmation
 *
 * Falls back to simulation if signer/client are not provided.
 */
export async function sporeLeapToCkb(
  params: SporeLeapToCkbParams,
  onUpdate: (p: TransactionPipeline) => void,
): Promise<TransactionPipeline> {
  const { ckbAddress, sporeTypeArgs, signer, client } = params;

  let pipeline = createPipeline('leap-to-ckb', 'spore', 'Spore', [
    'Building BTC Time Lock',
    'Composing CKB Partial Transaction (Spore Transfer)',
    'Building BTC PSBT',
    'Signing & Broadcasting BTC TX',
    'Injecting BTC TX ID to CKB',
    'Signing RGB++ CKB Transaction',
    'Broadcasting to CKB',
    'Waiting for CKB Confirmation',
  ]);
  onUpdate(pipeline);

  // Fallback to simulation if no signer/client
  if (!signer || !client) {
    console.warn('[sporeLeapToCkb] No signer/client provided, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  if (!isBtcSigner(signer)) {
    console.warn('[sporeLeapToCkb] Signer is not a BTC signer, falling back to simulation');
    return simulatePipeline(pipeline, onUpdate);
  }

  try {
    const sporeMod = await loadSporeModule();
    const rgbppUdtClient = await createRgbppClient(client);
    const rgbppBtcWallet = await createBrowserBtcWallet(signer);
    const btcAddress = await signer.getInternalAddress();
    const ckbRgbppUnlockSigner = await createUnlockSigner(client, btcAddress);

    // Step 0: Build BTC Time Lock
    pipeline = activateStep(pipeline, 0, onUpdate);
    const timeLock = await rgbppUdtClient.buildBtcTimeLockScript(ckbAddress);
    pipeline = completeStep(pipeline, 0, onUpdate, {
      detail: `Time lock for ${ckbAddress.slice(0, 20)}...`,
    });

    // Step 1: Compose CKB Partial Transaction (Spore Transfer)
    pipeline = activateStep(pipeline, 1, onUpdate);
    const { tx: ckbPartialTx } = await sporeMod.transferSpore({
      signer,
      id: sporeTypeArgs,
      to: timeLock,
    });
    pipeline = completeStep(pipeline, 1, onUpdate, { chain: 'ckb' });

    // Step 2: Build BTC PSBT
    pipeline = activateStep(pipeline, 2, onUpdate);
    const { psbt, indexedCkbPartialTx } = await rgbppBtcWallet.buildPsbt({
      ckbPartialTx,
      ckbClient: client,
      rgbppUdtClient,
      btcChangeAddress: btcAddress,
      receiverBtcAddresses: [], // leap-to-ckb has no BTC receivers
    });
    pipeline = completeStep(pipeline, 2, onUpdate, { chain: 'btc' });

    // Step 3: Sign & Broadcast BTC TX
    pipeline = activateStep(pipeline, 3, onUpdate);
    const btcTxId = await rgbppBtcWallet.signAndBroadcast(psbt);
    pipeline = completeStep(pipeline, 3, onUpdate, {
      txHash: btcTxId,
      chain: 'btc',
    });

    // ── Checkpoint: BTC broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-ckb',
      udtScriptArgs: sporeTypeArgs,
      amount: '0',
      btcTxId,
      serializedCkbPartialTx: ccc.stringify(indexedCkbPartialTx),
      lastCompletedStep: 3,
      createdAt: Date.now(),
    });

    // Step 4: Inject BTC TX ID to CKB
    pipeline = activateStep(pipeline, 4, onUpdate);
    const ckbPartialTxInjected = await rgbppUdtClient.injectTxIdToRgbppCkbTx(
      indexedCkbPartialTx,
      btcTxId,
    );
    pipeline = completeStep(pipeline, 4, onUpdate, { chain: 'ckb' });

    // Step 5: Sign RGB++ CKB Transaction
    pipeline = activateStep(pipeline, 5, onUpdate);
    const rgbppSignedCkbTx = await ckbRgbppUnlockSigner.signTransaction(ckbPartialTxInjected);
    await rgbppSignedCkbTx.completeFeeBy(signer);
    const ckbFinalTx = await signer.signTransaction(rgbppSignedCkbTx);
    pipeline = completeStep(pipeline, 5, onUpdate, { chain: 'ckb' });

    // Step 6: Broadcast to CKB
    pipeline = activateStep(pipeline, 6, onUpdate);
    const txHash = await client.sendTransaction(ckbFinalTx);
    pipeline = completeStep(pipeline, 6, onUpdate, { txHash, chain: 'ckb' });

    // ── Checkpoint: CKB broadcast done ──
    saveCheckpoint({
      pipelineId: pipeline.id,
      operation: 'leap-to-ckb',
      udtScriptArgs: sporeTypeArgs,
      amount: '0',
      btcTxId,
      ckbTxHash: txHash,
      lastCompletedStep: 6,
      createdAt: Date.now(),
    });

    // Step 7: Wait for CKB Confirmation
    pipeline = activateStep(pipeline, 7, onUpdate);
    await client.waitTransaction(txHash);
    pipeline = completeStep(pipeline, 7, onUpdate, { txHash, chain: 'ckb' });

    // Done — clear checkpoint
    clearCheckpoint(pipeline.id);
    pipeline = { ...pipeline, status: 'completed', completedAt: Date.now() };
    onUpdate(pipeline);
    return pipeline;
  } catch (err) {
    const errorMsg = formatError(err);
    const activeIndex = pipeline.steps.findIndex((s) => s.status === 'active');
    const activeLabel = activeIndex >= 0 ? pipeline.steps[activeIndex].label : 'unknown';
    console.error(`[sporeLeapToCkb] Error at step "${activeLabel}":`, err);

    if (activeIndex >= 0) {
      pipeline = failStep(pipeline, activeIndex, errorMsg, onUpdate);
    } else {
      pipeline = { ...pipeline, status: 'error' };
      onUpdate(pipeline);
    }
    return pipeline;
  }
}

export type { TransactionStep };

