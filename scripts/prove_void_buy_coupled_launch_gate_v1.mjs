import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Wallet } from "ethers";

import {
  VOID_BUY_COUPLED_LAUNCH_ID_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
  VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
  VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
  VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1,
  VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1,
  VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1,
  VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1,
  buildBuyLaunchGenerationEventV1,
  buildBuyLaunchGenerationPublicationIntentV1,
  buyLaunchGenerationAuthorityLockPathV1,
  buyLaunchGenerationExternalAnchorPathV1,
  buyLaunchGenerationPublicationRetryMatchesV1,
  buyLaunchRequestAuthorityMatchesV1,
  buyLaunchLiveActivationReceiptIdV1,
  buyLaunchLiveActivationTypedDataV1,
  classifyBuyLaunchGateV1,
  classifyBuyLaunchGenerationAuthorityV1,
  classifyBuyLaunchGenerationPublicationRecoveryV1,
  classifyBuyLaunchRequestMutationAdmissionV1,
  classifyBuyLaunchGenerationJournalV1,
  classifyBuyLaunchLiveActivationLeaseV1,
  readBuyLaunchGateV1,
  readBuyLaunchLiveActivationV1,
  readBuyLaunchSourceGateV1,
  sameBuyLaunchGenerationAuthorityV1,
  testOnlyClassifyBuyLaunchGateWithVerifiedPaymentCapacityReadyV1,
  validateBuyLaunchGenerationPublicationTimeV1,
  verifyBuyLaunchLiveActivationSignatureV1,
  verifyBuyLaunchLiveActivationSovereignSignatureV1,
} from "../src/economic/buy_void_coupled_launch_gate_v1.mjs";
import {
  classifyVoidEconomicEvmSuccessorMigrationV1,
} from "../tools/void-economic-evm-successor-migration-v1.mjs";
import {
  VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1,
  classifyVoidWcVoidCoupledLaunchReadinessV1,
} from "../tools/void-wc-void-coupled-launch-readiness-v1.mjs";

const production = JSON.parse(
  fs.readFileSync("ops/mainnet0/wc-void-production-candidate-v1.json", "utf8"),
);
const coupled = JSON.parse(
  fs.readFileSync("ops/mainnet0/coupled-economic-successor-gate-candidate-v1.json", "utf8"),
);
const successor = JSON.parse(
  fs.readFileSync("ops/mainnet0/economic-evm-successor-migration-candidate-v1.json", "utf8"),
);

const currentSource = classifyBuyLaunchGateV1({ production, coupled, successor });
assert.equal(currentSource.ready, false);
assert.equal(currentSource.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.deepEqual(readBuyLaunchSourceGateV1(), currentSource);

const currentAdmission = readBuyLaunchGateV1({});
assert.equal(currentAdmission.ready, false);
assert.equal(currentAdmission.source_ready, false);
assert.equal(currentAdmission.live_activation_ready, false);
assert.equal(currentAdmission.live_activation_receipt_id, null);
assert.equal(currentAdmission.live_activation_signer, null);
assert.equal(currentAdmission.live_activation_sovereign_signer, null);
assert.equal(currentAdmission.request_authority, null);

const readyProduction = structuredClone(production);
Object.assign(readyProduction, {
  status: "source_ready",
  coupled_activation_ready: true,
  bounded_canary_green: true,
  wc_ledger_persistence_verified: true,
  quote_reserve_custody_verified: true,
  participant_opening_claim_policy_ready: true,
  duplicate_replay_protection_proven: true,
  market_vault_independently_verified: true,
  inventory_funded: true,
  inventory_lock_proven: true,
  market_vault_address: "0x1111111111111111111111111111111111111111",
  market_vault_runtime_code_sha256: "1".repeat(64),
});

const readyCoupled = structuredClone(coupled);
readyCoupled.status = "SOURCE_READY";
for (const key of Object.keys(readyCoupled.gates)) readyCoupled.gates[key] = true;

const currentSuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(successor);
assert.equal(currentSuccessorDecision.ok, false);
assert.equal(currentSuccessorDecision.status, "HOLD");

const readySuccessor = structuredClone(successor);
readySuccessor.status = "SOURCE_READY";
readySuccessor.public_verification.successor_state_root_public_void_anchor_ready = true;
readySuccessor.public_verification.public_balance_receipt_code_verification_ready = true;
const readySuccessorDecision =
  classifyVoidEconomicEvmSuccessorMigrationV1(readySuccessor);
assert.equal(readySuccessorDecision.ok, true);
assert.equal(readySuccessorDecision.status, "SOURCE_READY");

const canonicalReady = classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate: readyProduction,
  coupled_candidate: readyCoupled,
  successor_migration_candidate: readySuccessor,
});
assert.equal(canonicalReady.ok, true);
assert.equal(canonicalReady.status, "SOURCE_READY");
assert.equal(canonicalReady.marker, VOID_WC_VOID_COUPLED_LAUNCH_READINESS_V1);
assert.equal(
  VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1,
  false,
);
const capacityHeld = classifyBuyLaunchGateV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor: readySuccessor,
});
assert.equal(capacityHeld.ready, false);
assert.equal(
  capacityHeld.reason,
  "buy_void_verified_payment_capacity_admission_not_ready",
);
assert.equal(capacityHeld.composition_id, null);

const sourceReady =
  testOnlyClassifyBuyLaunchGateWithVerifiedPaymentCapacityReadyV1({
  production: readyProduction,
  coupled: readyCoupled,
  successor: readySuccessor,
});
assert.equal(sourceReady.ready, true);
assert.equal(sourceReady.id, VOID_BUY_COUPLED_LAUNCH_ID_V1);
assert.equal(sourceReady.composition_id, canonicalReady.composition_id);

// The historical false-positive class: every sampled top-level gate can be true
// while a nested reviewed policy binding has drifted. Canonical composition must
// reject it before the public-intake gate sees SOURCE_READY.
const nestedPolicyDrift = structuredClone(readyCoupled);
nestedPolicyDrift.opening_concentration_sybil_policy_contract
  .runtime_enforcement_verified = true;
for (const key of Object.keys(nestedPolicyDrift.gates)) {
  assert.equal(nestedPolicyDrift.gates[key], true);
}
const canonicalNestedDrift = classifyVoidWcVoidCoupledLaunchReadinessV1({
  production_candidate: readyProduction,
  coupled_candidate: nestedPolicyDrift,
  successor_migration_candidate: readySuccessor,
});
assert.equal(canonicalNestedDrift.ok, false);
assert.equal(canonicalNestedDrift.status, "HOLD");
assert.equal(
  canonicalNestedDrift.reason,
  "coupled_readiness_not_source_ready",
);
assert.match(
  String(canonicalNestedDrift.coupled_reason || ""),
  /opening_concentration_sybil_policy_contract_mismatch:runtime_enforcement_verified/,
);
assert.equal(
  testOnlyClassifyBuyLaunchGateWithVerifiedPaymentCapacityReadyV1({
    production: readyProduction,
    coupled: nestedPolicyDrift,
    successor: readySuccessor,
  }).ready,
  false,
);

// SOURCE_READY alone is explicitly not live activation authority.
const withoutLiveEvidence = readBuyLaunchLiveActivationV1(sourceReady, {});
assert.equal(withoutLiveEvidence.ready, false);
assert.equal(
  withoutLiveEvidence.reason,
  "live_coupled_activation_evidence_not_ready",
);

const syntheticActivationWallet = new Wallet(
  "0x1111111111111111111111111111111111111111111111111111111111111111",
);
const syntheticSovereignWallet = new Wallet(
  "0x2222222222222222222222222222222222222222222222222222222222222222",
);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "void-buy-live-"));
try {
  fs.chmodSync(tmp, 0o700);
  const receiptPath = path.join(tmp, "activation.json");
  const dataDir = path.join(tmp, "data");
  const economicDir = path.join(dataDir, "economic");
  fs.mkdirSync(economicDir, { recursive: true, mode: 0o700 });
  fs.chmodSync(dataDir, 0o700);
  fs.chmodSync(economicDir, 0o700);
  const journalPath = path.join(
    economicDir,
    "buy-void-coupled-live-generation-v1.jsonl",
  );
  const nowMs = 1791014400000;
  const activationGeneration = "0x" + "b".repeat(64);
  const activeEvent = buildBuyLaunchGenerationEventV1({
    sequence: 1,
    previous_event_sha256: null,
    generation: activationGeneration,
    state: "active",
    occurred_at_ms: nowMs - 1000,
  });
  const activeJournalBytes = Buffer.from(
    JSON.stringify(activeEvent) + "\n",
    "utf8",
  );
  fs.writeFileSync(journalPath, activeJournalBytes, {
    mode: 0o600,
    flag: "wx",
  });
  const activeGenerationState =
    classifyBuyLaunchGenerationAuthorityV1(
      activeJournalBytes,
      activeJournalBytes,
    );
  assert.equal(activeGenerationState.ready, true);
  assert.equal(activeGenerationState.external_anchor_verified, true);
  assert.equal(activeGenerationState.generation, activationGeneration);
  assert.equal(activeGenerationState.tip_sha256, activeEvent.event_sha256);
  assert.equal(
    sameBuyLaunchGenerationAuthorityV1(
      activeGenerationState,
      { ...activeGenerationState },
    ),
    true,
  );
  const genesisIntentBytes =
    buildBuyLaunchGenerationPublicationIntentV1({
      previous_bytes: Buffer.alloc(0),
      next_bytes: activeJournalBytes,
      state: "active",
      generation: activationGeneration,
      occurred_at_ms: nowMs - 1000,
    });
  const genesisRecoveryFromNoWrites =
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: null,
      anchor_bytes: null,
    });
  assert.equal(
    genesisRecoveryFromNoWrites.intent.marker,
    VOID_BUY_COUPLED_GENERATION_PUBLICATION_INTENT_V1,
  );
  assert.equal(
    genesisRecoveryFromNoWrites.next_state.tip_sha256,
    activeEvent.event_sha256,
  );
  assert.equal(genesisRecoveryFromNoWrites.phase, "intent_only");
  const exactRecoveryRetry = {
    state: "active",
    generation: activationGeneration,
    occurred_at_ms: nowMs - 1000,
  };
  assert.equal(
    buyLaunchGenerationPublicationRetryMatchesV1(
      genesisRecoveryFromNoWrites.intent,
      exactRecoveryRetry,
    ),
    true,
  );
  for (const patch of [
    { state: "revoked" },
    { generation: "0x" + "c".repeat(64) },
    { occurred_at_ms: nowMs - 999 },
  ]) {
    assert.equal(
      buyLaunchGenerationPublicationRetryMatchesV1(
        genesisRecoveryFromNoWrites.intent,
        { ...exactRecoveryRetry, ...patch },
      ),
      false,
    );
  }
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: null,
    }).next_state.tip_sha256,
    activeEvent.event_sha256,
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: null,
    }).phase,
    "journal_committed",
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).next_state.tip_sha256,
    activeEvent.event_sha256,
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).phase,
    "pair_committed",
  );
  assert.throws(
    () => classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: null,
      anchor_bytes: activeJournalBytes,
    }),
    /buy_launch_generation_publish_recovery_order_invalid/u,
  );
  assert.throws(
    () => buildBuyLaunchGenerationPublicationIntentV1({
      previous_bytes: Buffer.alloc(0),
      next_bytes: activeJournalBytes,
      state: "active",
      generation: activationGeneration,
      occurred_at_ms: nowMs,
    }),
    /buy_launch_generation_publish_intent_state_mismatch/u,
  );
  {
    const tamperedIntent = JSON.parse(genesisIntentBytes.toString("utf8"));
    tamperedIntent.prior_sha256 = "sha256:" + "f".repeat(64);
    assert.throws(
      () => classifyBuyLaunchGenerationPublicationRecoveryV1({
        intent_bytes: Buffer.from(
          JSON.stringify(tamperedIntent, null, 2) + "\n",
          "utf8",
        ),
        journal_bytes: activeJournalBytes,
        anchor_bytes: activeJournalBytes,
      }),
      /buy_launch_generation_publish_intent_state_invalid/u,
    );
  }
  assert.throws(
    () => classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: genesisIntentBytes,
      journal_bytes: Buffer.from("unknown\n", "utf8"),
      anchor_bytes: null,
    }),
    /buy_launch_generation_publish_recovery_order_invalid/u,
  );
  for (const patch of [
    { ready: false },
    { generation: "0x" + "d".repeat(64) },
    { tip_sha256: "sha256:" + "d".repeat(64) },
    { sequence: activeGenerationState.sequence + 1 },
    { external_anchor_sha256: "sha256:" + "e".repeat(64) },
    { external_anchor_verified: false },
  ]) {
    assert.equal(
      sameBuyLaunchGenerationAuthorityV1(
        activeGenerationState,
        { ...activeGenerationState, ...patch },
      ),
      false,
    );
  }
  const fixedAnchorPath = buyLaunchGenerationExternalAnchorPathV1();
  assert.equal(path.isAbsolute(fixedAnchorPath), true);
  assert.match(
    fixedAnchorPath,
    /\.local\/state\/void-node-authority-v1\/buy-void-coupled-live-generation-anchor-v1\.jsonl$/u,
  );
  assert.equal(fixedAnchorPath.startsWith(dataDir + path.sep), false);
  const authorityLockPath = buyLaunchGenerationAuthorityLockPathV1();
  assert.equal(path.dirname(authorityLockPath), path.dirname(fixedAnchorPath));
  assert.match(
    authorityLockPath,
    /buy-void-coupled-live-generation-authority-v1$/u,
  );
  const receiptBody = {
    activated_at_ms: nowMs,
    activation_generation: activationGeneration,
    activation_nonce: "0x" + "a".repeat(64),
    activation_signer: syntheticActivationWallet.address.toLowerCase(),
    sovereign_signer: syntheticSovereignWallet.address.toLowerCase(),
    buy_void_private_runtime_active: true,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    expires_at_ms: nowMs + 120_000,
    generation_tip_sha256: activeEvent.event_sha256,
    marker: VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_V1,
    public_buy_request_intake_authorized: true,
    public_presale_active: true,
    runtime_or_launch_evidence: true,
    same_launch_ceremony: true,
    source_composition_id: sourceReady.composition_id,
    source_ready_only: false,
    status: "COUPLED_PUBLIC_LAUNCH_ACTIVE",
    version: 1,
    wc_void_market_active: true,
  };
  const unsignedReceipt = {
    ...receiptBody,
    activation_receipt_id:
      buyLaunchLiveActivationReceiptIdV1(receiptBody),
  };
  const typed = buyLaunchLiveActivationTypedDataV1(unsignedReceipt);
  const activationSignature =
    await syntheticActivationWallet.signTypedData(
      typed.domain,
      typed.types,
      typed.value,
    );
  const sovereignSignature =
    await syntheticSovereignWallet.signTypedData(
      typed.domain,
      typed.types,
      typed.value,
    );
  const receipt = {
    ...unsignedReceipt,
    activation_signature: activationSignature,
    sovereign_signature: sovereignSignature,
  };

  const syntheticSignature =
    verifyBuyLaunchLiveActivationSignatureV1(
      receipt,
      syntheticActivationWallet.address,
    );
  assert.equal(syntheticSignature.verified, true);
  assert.equal(
    syntheticSignature.recovered_signer,
    syntheticActivationWallet.address.toLowerCase(),
  );
  assert.equal(
    verifyBuyLaunchLiveActivationSignatureV1(
      receipt,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1,
    ).verified,
    false,
  );
  const syntheticSovereignSignature =
    verifyBuyLaunchLiveActivationSovereignSignatureV1(
      receipt,
      syntheticSovereignWallet.address,
    );
  assert.equal(syntheticSovereignSignature.verified, true);
  assert.equal(
    syntheticSovereignSignature.recovered_signer,
    syntheticSovereignWallet.address.toLowerCase(),
  );
  assert.equal(
    verifyBuyLaunchLiveActivationSovereignSignatureV1(
      receipt,
      VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1,
    ).verified,
    false,
  );

  const receiptBytes = Buffer.from(
    JSON.stringify(receipt, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(receiptPath, receiptBytes, { mode: 0o600, flag: "wx" });
  const receiptSha256 =
    crypto.createHash("sha256").update(receiptBytes).digest("hex");
  const confirmation =
    "activate-coupled-public-buy-v1:" +
    receipt.activation_generation +
    ":" +
    receipt.generation_tip_sha256 +
    ":" +
    receipt.activation_receipt_id +
    ":" +
    receiptSha256;
  const liveEnv = {
    DATA_DIR: dataDir,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH: receiptPath,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256: receiptSha256,
    VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM: confirmation,
  };

  // The private descriptor reader must remain byte-bounded even if a file
  // grows after the pre-open/stat checks. Inject growth only after the first
  // descriptor read begins; the reader may consume at most maxBytes + 1.
  {
    const originalReadSync = fs.readSync;
    let growthInjected = false;
    let streamedBytes = 0;
    fs.readSync = function injectedReadSync(...args) {
      if (!growthInjected) {
        growthInjected = true;
        fs.appendFileSync(
          journalPath,
          Buffer.alloc(70 * 1024, 0x20),
        );
      }
      const count = originalReadSync.apply(fs, args);
      streamedBytes += count;
      return count;
    };
    try {
      const grown = readBuyLaunchLiveActivationV1(
        sourceReady,
        liveEnv,
        nowMs + 1,
      );
      assert.equal(grown.ready, false);
      assert.equal(growthInjected, true);
      assert.ok(fs.statSync(journalPath).size > 64 * 1024);
      assert.equal(streamedBytes, 64 * 1024 + 1);
    } finally {
      fs.readSync = originalReadSync;
      fs.writeFileSync(journalPath, activeJournalBytes, { mode: 0o600 });
      fs.chmodSync(journalPath, 0o600);
    }
  }

  // A self-created, content-addressed receipt is not production authority.
  // Even with valid EIP-712 structure and matching file/env bindings it must
  // remain closed unless signed by the fixed launch-controller identity.
  const live = readBuyLaunchLiveActivationV1(
    sourceReady,
    liveEnv,
    nowMs + 1,
  );
  assert.equal(live.ready, false);
  assert.equal(live.activation_signer, null);

  const liveLease = classifyBuyLaunchLiveActivationLeaseV1(
    receipt,
    activeGenerationState,
    nowMs + 1,
  );
  assert.equal(liveLease.ready, true);

  const requestAuthority = Object.freeze({
    marker: VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1,
    version: 1,
    coupled_launch_id: VOID_BUY_COUPLED_LAUNCH_ID_V1,
    source_composition_id: sourceReady.composition_id,
    activation_generation: activationGeneration,
    generation_tip_sha256: activeEvent.event_sha256,
    activation_receipt_id: receipt.activation_receipt_id,
    activation_receipt_sha256: receiptSha256,
    expires_at_ms: receipt.expires_at_ms,
  });
  const currentGateFixture = Object.freeze({
    ready: true,
    request_authority: requestAuthority,
  });
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      nowMs + 1,
    ),
    true,
  );
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      {
        ready: true,
        request_authority: {
          ...requestAuthority,
          activation_receipt_id: "voidbclive1_" + "d".repeat(64),
          activation_receipt_sha256: "e".repeat(64),
          expires_at_ms: requestAuthority.expires_at_ms + 60_000,
        },
      },
      nowMs + 1,
    ),
    true,
  );
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      requestAuthority.expires_at_ms,
    ),
    false,
  );

  // Gate derivation may begin while the request is live, but mutation admission
  // uses a fresh clock sampled after derivation.
  assert.equal(
    classifyBuyLaunchRequestMutationAdmissionV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      requestAuthority.expires_at_ms - 1,
      requestAuthority.expires_at_ms,
    ).ready,
    false,
  );
  assert.equal(
    classifyBuyLaunchRequestMutationAdmissionV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      requestAuthority.expires_at_ms - 2,
      requestAuthority.expires_at_ms - 1,
    ).ready,
    true,
  );
  assert.equal(
    classifyBuyLaunchRequestMutationAdmissionV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      requestAuthority.expires_at_ms,
      requestAuthority.expires_at_ms - 1,
    ).ready,
    false,
  );

  // Mutation admission must use a fresh clock sample after gate derivation.
  // Model a lease that is live when the gate read starts but expires before
  // the mutation is admitted under the shared generation-authority lock.
  const gateReadStartedAtMs = requestAuthority.expires_at_ms - 1;
  const mutationAdmissionNowMs = requestAuthority.expires_at_ms;
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      gateReadStartedAtMs,
    ),
    true,
  );
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      currentGateFixture,
      mutationAdmissionNowMs,
    ),
    false,
  );
  assert.equal(
    buyLaunchRequestAuthorityMatchesV1(
      { launch_authority: requestAuthority },
      {
        ready: true,
        request_authority: {
          ...requestAuthority,
          activation_generation: "0x" + "c".repeat(64),
        },
      },
      nowMs + 1,
    ),
    false,
  );
  for (const patch of [
    { activation_receipt_id: "voidbclive1_" + "0".repeat(64) },
    { activation_receipt_sha256: "0".repeat(64) },
    { expires_at_ms: requestAuthority.expires_at_ms + 1 },
  ]) {
    assert.equal(
      buyLaunchRequestAuthorityMatchesV1(
        { launch_authority: requestAuthority },
        {
          ready: true,
          request_authority: {
            ...requestAuthority,
            ...patch,
          },
        },
        nowMs + 1,
      ),
      false,
    );
  }

  // The same otherwise-valid signed receipt is no longer live after expiry.
  assert.equal(
    classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      activeGenerationState,
      receipt.expires_at_ms,
    ).ready,
    false,
  );

  // Durable journal revocation survives environment/config rollback.
  const revokedEvent = buildBuyLaunchGenerationEventV1({
    sequence: 2,
    previous_event_sha256: activeEvent.event_sha256,
    generation: activationGeneration,
    state: "revoked",
    occurred_at_ms: nowMs + 2,
  });
  const revokedJournalBytes = Buffer.from(
    JSON.stringify(activeEvent) + "\n" +
    JSON.stringify(revokedEvent) + "\n",
    "utf8",
  );
  const revokeIntentBytes =
    buildBuyLaunchGenerationPublicationIntentV1({
      previous_bytes: activeJournalBytes,
      next_bytes: revokedJournalBytes,
      state: "revoked",
      generation: activationGeneration,
      occurred_at_ms: nowMs + 2,
    });
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revokeIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).phase,
    "intent_only",
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revokeIntentBytes,
      journal_bytes: revokedJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).phase,
    "journal_committed",
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revokeIntentBytes,
      journal_bytes: revokedJournalBytes,
      anchor_bytes: revokedJournalBytes,
    }).phase,
    "pair_committed",
  );
  assert.throws(
    () => classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revokeIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: revokedJournalBytes,
    }),
    /buy_launch_generation_publish_recovery_order_invalid/u,
  );
  fs.writeFileSync(journalPath, revokedJournalBytes, { mode: 0o600 });
  const revokedState =
    classifyBuyLaunchGenerationAuthorityV1(
      revokedJournalBytes,
      revokedJournalBytes,
    );
  const revocationIntentBytes =
    buildBuyLaunchGenerationPublicationIntentV1({
      previous_bytes: activeJournalBytes,
      next_bytes: revokedJournalBytes,
      state: "revoked",
      generation: activationGeneration,
      occurred_at_ms: nowMs + 2,
    });
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revocationIntentBytes,
      journal_bytes: revokedJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).next_state.ready,
    false,
  );
  assert.equal(
    classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revocationIntentBytes,
      journal_bytes: activeJournalBytes,
      anchor_bytes: activeJournalBytes,
    }).next_state.tip_sha256,
    revokedEvent.event_sha256,
  );
  assert.throws(
    () => classifyBuyLaunchGenerationPublicationRecoveryV1({
      intent_bytes: revocationIntentBytes,
      journal_bytes: revokedJournalBytes,
      anchor_bytes: Buffer.from("not-the-prior-or-next\n", "utf8"),
    }),
    /buy_launch_generation_publish_recovery_order_invalid/u,
  );
  assert.equal(revokedState.ready, false);
  assert.equal(revokedState.external_anchor_verified, true);
  assert.throws(
    () => classifyBuyLaunchGenerationAuthorityV1(
      activeJournalBytes,
      revokedJournalBytes,
    ),
    /buy_launch_generation_external_anchor_mismatch/u,
  );
  assert.equal(
    classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      revokedState,
      nowMs + 3,
    ).ready,
    false,
  );

  const rotatedGeneration = "0x" + "c".repeat(64);
  const rotatedEvent = buildBuyLaunchGenerationEventV1({
    sequence: 3,
    previous_event_sha256: revokedEvent.event_sha256,
    generation: rotatedGeneration,
    state: "active",
    occurred_at_ms: nowMs + 4,
  });
  const rotatedJournalBytes = Buffer.from(
    JSON.stringify(activeEvent) + "\n" +
    JSON.stringify(revokedEvent) + "\n" +
    JSON.stringify(rotatedEvent) + "\n",
    "utf8",
  );
  const rotatedState =
    classifyBuyLaunchGenerationAuthorityV1(
      rotatedJournalBytes,
      rotatedJournalBytes,
    );
  assert.equal(rotatedState.ready, true);
  assert.equal(rotatedState.generation, rotatedGeneration);
  assert.equal(
    classifyBuyLaunchLiveActivationLeaseV1(
      receipt,
      rotatedState,
      nowMs + 5,
    ).ready,
    false,
  );

  const illegalEvent = buildBuyLaunchGenerationEventV1({
    sequence: 2,
    previous_event_sha256: activeEvent.event_sha256,
    generation: rotatedGeneration,
    state: "active",
    occurred_at_ms: nowMs + 2,
  });
  assert.throws(
    () => classifyBuyLaunchGenerationJournalV1(
      Buffer.from(
        JSON.stringify(activeEvent) + "\n" +
        JSON.stringify(illegalEvent) + "\n",
        "utf8",
      ),
    ),
    /buy_launch_generation_active_must_revoke/,
  );

  fs.writeFileSync(journalPath, revokedJournalBytes, { mode: 0o600 });

  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, {
      ...liveEnv,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM: "",
    }, nowMs + 1).ready,
    false,
  );
  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, {
      ...liveEnv,
      VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256: "0".repeat(64),
    }, nowMs + 1).ready,
    false,
  );
  assert.equal(
    readBuyLaunchLiveActivationV1(
      { ...sourceReady, composition_id: "sha256:" + "0".repeat(64) },
      liveEnv,
      nowMs + 1,
    ).ready,
    false,
  );

  fs.chmodSync(receiptPath, 0o644);
  assert.equal(
    readBuyLaunchLiveActivationV1(sourceReady, liveEnv, nowMs + 1).ready,
    false,
  );
  fs.chmodSync(receiptPath, 0o600);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

for (const mutate of [
  (p, _c, _s) => { p.status = "hold"; },
  (p, _c, _s) => { p.coupled_activation_ready = false; },
  (_p, c, _s) => { c.gates.bounded_canary_green = false; },
  (_p, c, _s) => {
    c.shared_post_discovery_reconciliation.coupled_launch_id =
      "sha256:" + "0".repeat(64);
  },
  (_p, c, _s) => { c.wc_void_opening.protocol_void_inventory_atoms = "1"; },
  (p, _c, _s) => { p.authority.market_activation = true; },
  (_p, c, _s) => { delete c.authority.funds_movement; },
  (_p, _c, s) => {
    s.public_verification.successor_state_root_public_void_anchor_ready = false;
  },
]) {
  const p = structuredClone(readyProduction);
  const c = structuredClone(readyCoupled);
  const s = structuredClone(readySuccessor);
  mutate(p, c, s);
  assert.equal(
    testOnlyClassifyBuyLaunchGateWithVerifiedPaymentCapacityReadyV1({
      production: p,
      coupled: c,
      successor: s,
    }).ready,
    false,
  );
}

assert.equal(
  validateBuyLaunchGenerationPublicationTimeV1(
    2_000_000_000_000 +
      VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1,
    2_000_000_000_000,
  ),
  2_000_000_000_000 +
    VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1,
);
assert.throws(
  () =>
    validateBuyLaunchGenerationPublicationTimeV1(
      2_000_000_000_000 +
        VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1 +
        1,
      2_000_000_000_000,
    ),
  /buy_launch_generation_publish_time_invalid/u,
);
assert.throws(
  () =>
    validateBuyLaunchGenerationPublicationTimeV1(
      2_000_000_000_000,
      0,
    ),
  /buy_launch_generation_publish_time_invalid/u,
);

const gateSource = fs.readFileSync(
  "src/economic/buy_void_coupled_launch_gate_v1.mjs",
  "utf8",
);
const generationPublisherSource = fs.readFileSync(
  "ops/precision/void-buy-coupled-live-generation-publish-v1.mjs",
  "utf8",
);
const bakeryLockSource = fs.readFileSync(
  "src/economic/buy_void_filesystem_bakery_lock_v1.ts",
  "utf8",
);
assert.match(gateSource, /classifyVoidWcVoidCoupledLaunchReadinessV1/);
assert.match(
  gateSource,
  /VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1[\s\S]*false/u,
);
assert.match(
  gateSource,
  /export function classifyBuyLaunchGateV1[\s\S]*VOID_BUY_VOID_VERIFIED_PAYMENT_CAPACITY_ADMISSION_READY_V1/u,
);
assert.match(
  gateSource,
  /export function testOnlyClassifyBuyLaunchGateWithVerifiedPaymentCapacityReadyV1/u,
);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_PATH/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_RECEIPT_SHA256/);
assert.match(gateSource, /buy-void-coupled-live-generation-v1\.jsonl/);
assert.match(gateSource, /void-node-authority-v1/);
assert.match(gateSource, /buy-void-coupled-live-generation-anchor-v1\.jsonl/);
assert.match(gateSource, /external_anchor_verified/);
assert.match(gateSource, /generation_tip_sha256/);
assert.doesNotMatch(gateSource, /fs\.readFileSync\(fileFd\)/);
assert.match(gateSource, /fs\.readSync\(\s*fileFd,/u);
assert.match(gateSource, /buy_launch_private_file_stream_size_exceeded/);
assert.match(gateSource, /VOID_BUY_COUPLED_REQUEST_AUTHORITY_V1/);
assert.match(gateSource, /buyLaunchRequestAuthorityMatchesV1/);
assert.match(gateSource, /classifyBuyLaunchRequestMutationAdmissionV1/);
assert.match(gateSource, /mutationAdmissionNowMs/);
assert.match(gateSource, /VOID_BUY_COUPLED_GENERATION_MAX_FUTURE_SKEW_MS_V1/);
assert.match(gateSource, /validateBuyLaunchGenerationPublicationTimeV1/);
assert.match(gateSource, /expires_at_ms/);
assert.match(gateSource, /LIVE_ACTIVATION_MAX_LEASE_MS/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_CONFIRM/);
assert.match(gateSource, /readBuyLaunchLiveActivationV1/);
assert.match(gateSource, /classifyBuyLaunchLiveActivationLeaseV1/);
assert.match(gateSource, /sameBuyLaunchGenerationAuthorityV1/);
assert.match(gateSource, /withBuyLaunchRequestAuthorityMutationV1/);
assert.match(gateSource, /withBuyLaunchGenerationTransitionPublicationV1/);
assert.doesNotMatch(
  gateSource,
  /export\s+async\s+function\s+withBuyLaunchGenerationTransitionPublicationV1/,
);
assert.match(gateSource, /publishBuyLaunchGenerationTransitionV1/);
const recoveryFunctionAt = gateSource.indexOf(
  "function recoverBuyLaunchGenerationPublicationV1",
);
const recoveryRetryGuardAt = gateSource.indexOf(
  "buy_launch_generation_pending_publication_retry_mismatch",
  recoveryFunctionAt,
);
const recoveryFirstWriteAt = gateSource.indexOf(
  "atomicWritePrivateGenerationBytesV1(",
  recoveryFunctionAt,
);
assert.ok(recoveryFunctionAt >= 0);
assert.ok(recoveryRetryGuardAt > recoveryFunctionAt);
assert.ok(recoveryFirstWriteAt > recoveryRetryGuardAt);
assert.match(gateSource, /buy_launch_generation_publication_pending/);
{
  const generationReaderAt = gateSource.indexOf(
    "export function readBuyLaunchGenerationJournalV1",
  );
  const generationReaderEnd = gateSource.indexOf(
    "function sha256IdBytes32",
    generationReaderAt,
  );
  assert.ok(generationReaderAt >= 0 && generationReaderEnd > generationReaderAt);
  const generationReaderSource = gateSource.slice(
    generationReaderAt,
    generationReaderEnd,
  );
  assert.equal(
    (generationReaderSource.match(/fs\.existsSync\(intentPath\)/gu) || []).length,
    2,
    "generation authority read must fence publication intent before and after the file snapshot",
  );
  const finalIntentCheck = generationReaderSource.lastIndexOf(
    "fs.existsSync(intentPath)",
  );
  assert.ok(
    generationReaderSource.indexOf(
      "const journalBytes = readStablePrivateFile(journalPath);",
    ) < finalIntentCheck,
  );
  assert.ok(
    generationReaderSource.indexOf(
      "const anchorBytes = readStablePrivateFile(anchorPath);",
    ) < finalIntentCheck,
  );
}
assert.match(gateSource, /buy_launch_generation_publish_recovery_order_invalid/);
assert.match(gateSource, /recovery\.phase === "intent_only"/);
assert.match(gateSource, /recovery\.phase === "journal_committed"/);
assert.match(
  gateSource,
  /buy-void-coupled-live-generation-publication-intent-v1\.json/,
);
assert.match(gateSource, /recoverBuyLaunchGenerationPublicationV1/);
assert.doesNotMatch(
  gateSource,
  /buy_launch_generation_publish_recovery_input_mismatch/,
);
assert.match(gateSource, /classifyBuyLaunchGenerationPublicationRecoveryV1/);
assert.match(gateSource, /buildBuyLaunchGenerationPublicationIntentV1/);
assert.match(gateSource, /atomicWritePrivateGenerationBytesV1\(intentPath, intentBytes\)/);
assert.match(gateSource, /atomicWritePrivateGenerationBytesV1\(journalPath, nextBytes\)/);
assert.match(gateSource, /atomicWritePrivateGenerationBytesV1\(anchorPath, nextBytes\)/);
{
  const intentAt = gateSource.indexOf(
    "atomicWritePrivateGenerationBytesV1(intentPath, intentBytes)",
  );
  const journalAt = gateSource.indexOf(
    "atomicWritePrivateGenerationBytesV1(journalPath, nextBytes)",
    intentAt,
  );
  const anchorAt = gateSource.indexOf(
    "atomicWritePrivateGenerationBytesV1(anchorPath, nextBytes)",
    journalAt,
  );
  assert.ok(intentAt >= 0 && journalAt > intentAt && anchorAt > journalAt);
}
assert.match(
  gateSource,
  /\.\.\/\.\.\/dist\/economic\/buy_void_filesystem_bakery_lock_v1\.js/,
);
assert.match(gateSource, /withBuyVoidFilesystemBakeryLockAsyncV1/);
assert.match(
  gateSource,
  /const gateReadStartedAtMs = now\(\);[\s\S]*readBuyLaunchGateV1\([\s\S]*gateReadStartedAtMs[\s\S]*const mutationAdmissionNowMs = now\(\);[\s\S]*classifyBuyLaunchRequestMutationAdmissionV1\([\s\S]*gateReadStartedAtMs,[\s\S]*mutationAdmissionNowMs/u,
);
assert.match(
  bakeryLockSource,
  /export async function withBuyVoidFilesystemBakeryLockAsyncV1/,
);
assert.match(bakeryLockSource, /return await operation\(\);/);
assert.match(
  bakeryLockSource,
  /finally \{[\s\S]*removeOwnClaim\(choosingPath\);[\s\S]*removeOwnClaim\(ticketPath\)/,
);
assert.match(
  generationPublisherSource,
  /publishBuyLaunchGenerationTransitionV1/,
);
assert.match(
  generationPublisherSource,
  /--confirm/,
);
assert.match(
  generationPublisherSource,
  /publishBuyLaunchGenerationTransitionV1/,
);
assert.match(
  generationPublisherSource,
  /async_aware_shared_lock=true/,
);
assert.doesNotMatch(
  generationPublisherSource,
  /writeFileSync|appendFileSync|renameSync/,
);
assert.equal(
  (gateSource.match(/withBuyLaunchGenerationAuthorityLockV1\(/gu) || []).length >= 3,
  true,
);
assert.equal(
  (gateSource.match(/readBuyLaunchGenerationJournalV1\(env\)/gu) || []).length,
  2,
  "live activation must read generation authority before and after receipt verification",
);
assert.match(
  gateSource,
  /buy_launch_generation_changed_during_activation_verification/,
);
assert.doesNotMatch(gateSource, /testOnlyReadBuyLaunchLiveActivationV1/);
assert.match(gateSource, /verifyTypedData/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1/);
assert.match(gateSource, /VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1/);
assert.match(gateSource, /verifyBuyLaunchLiveActivationSovereignSignatureV1/);

console.log("VOID_BUY_COUPLED_LAUNCH_GATE_V1_GREEN");
console.log("current_canonical_source_ready=false");
console.log("coupled_launch_id=" + VOID_BUY_COUPLED_LAUNCH_ID_V1);
console.log("canonical_coupled_launch_classifier_required=true");
console.log("verified_payment_capacity_admission_source_ready=false");
console.log("verified_payment_capacity_admission_test_override_only=true");
console.log("nested_policy_false_positive_blocked=true");
console.log("source_ready_alone_can_open_intake=false");
console.log("live_coupled_activation_receipt_required=true");
console.log("live_receipt_digest_binding_required=true");
console.log("live_activation_lease_expiry_required=true");
console.log("live_activation_generation_journal_required=true");
console.log("durable_generation_revocation_required=true");
console.log("generation_revalidated_after_receipt_verification=true");
console.log("mid_verification_generation_change_rejected=true");
console.log("shared_generation_authority_bakery_lock_required=true");
console.log("request_mutation_generation_lock_required=true");
console.log("request_mutation_fresh_post_gate_expiry_check=true");
console.log("generation_transition_publication_generation_lock_required=true");
console.log("canonical_generation_publisher_uses_shared_lock=true");
console.log("generation_publication_write_ahead_intent_required=true");
console.log("partial_generation_publication_crash_recoverable=true");
console.log("pending_publication_recovery_precedes_new_transition=true");
console.log("unknown_partial_generation_state_fails_closed=true");
console.log("async_generation_publication_lock_lifetime_safe=true");
console.log("external_generation_high_water_anchor_required=true");
console.log("private_file_descriptor_read_byte_bounded=true");
console.log("concurrent_private_file_growth_fails_at_max_plus_one=true");
console.log("data_dir_rollback_old_generation_replay=false");
console.log("configuration_rollback_old_generation_replay=false");
console.log("payment_request_bound_to_generation_tip=true");
console.log("payment_request_bound_to_exact_activation_receipt=true");
console.log("payment_request_bound_to_lease_expiry=true");
console.log("mutation_admission_fresh_clock_required=true");
console.log("future_generation_timestamp_skew_bounded=true");
console.log("pending_generation_publication_holds_runtime_reads=true");
console.log("generation_authority_snapshot_post_intent_fence=true");
console.log("generation_publication_exact_retry_required=true");
console.log("generation_publication_writer_order_recovery_bound=true");
console.log("generation_publication_event_timestamp_bound=true");
console.log("stale_live_activation_receipt_replay=false");
console.log("launch_controller_eip712_signature_required=true");
console.log("sovereign_eip712_cosignature_required=true");
console.log("fixed_launch_controller=" + VOID_BUY_COUPLED_LIVE_ACTIVATION_CONTROLLER_V1);
console.log("fixed_sovereign_cosigner=" + VOID_BUY_COUPLED_LIVE_SOVEREIGN_COSIGNER_V1);
console.log("explicit_operator_confirmation_required=true");
console.log("self_authored_receipt_cannot_open_intake=true");
console.log("synthetic_live_receipt_fixture_is_not_production_evidence=true");
console.log("funds_movement=false");
