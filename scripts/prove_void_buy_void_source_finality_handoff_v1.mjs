#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  AUTHORITY_V1,
  CANONICAL_ECONOMICS_V1,
  FINALITY_ATTESTATION_MARKER,
  FINALITY_ATTESTATION_MARKER_V2,
  SOURCE_FINALITY_BLOCK_EVIDENCE_MARKER_V1,
  MARKER,
  POLICY_MARKER,
  UPSTREAM_BINDINGS_V1,
  buildFinalizedSourcePaymentHandoffV1,
  buildFinalizedSourcePaymentHandoffV2,
  deriveSourcePolicyCommitmentsV1,
  normalizeFinalityAdmissionV1,
  normalizePolicyGenerationV1,
  normalizeSourceFinalityBlockEvidenceV2,
  normalizeVerifiedPaymentBindingV1,
  sourceFinalityAttestationPreimageV1,
  sourceFinalityAttestationPreimageV2,
  sourceFinalityAttestationSha256V1,
  sourceFinalityAttestationSha256V2,
  validateFinalizedSourcePaymentProjectionV1,
} from "./lib/void_buy_void_source_finality_handoff_v1.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modulePath = "scripts/lib/void_buy_void_source_finality_handoff_v1.mjs";
const proofPath = "scripts/prove_void_buy_void_source_finality_handoff_v1.mjs";
const docPath = "docs/architecture/buy-void-source-finality-handoff-v1.md";
const workflowPath = ".github/workflows/void-buy-void-source-finality-handoff-v1.yml";
const moduleSource = readFileSync(resolve(root, modulePath), "utf8");
const doc = readFileSync(resolve(root, docPath), "utf8");
const workflow = readFileSync(resolve(root, workflowPath), "utf8");

const BASE_TX = `0x${"11".repeat(32)}`;
const ETH_TX = `0x${"22".repeat(32)}`;
const BASE_USDC = `0x${"a1".repeat(20)}`;
const BASE_RECEIVE = `0x${"b2".repeat(20)}`;
const BASE_PAYER = `0x${"c3".repeat(20)}`;
const ETH_USDC = `0x${"d4".repeat(20)}`;
const ETH_RECEIVE = `0x${"e5".repeat(20)}`;
const ETH_PAYER = `0x${"f6".repeat(20)}`;
const BASE_RECEIPT_BLOCK_HASH = `0x${"31".repeat(32)}`;
const BASE_FINALIZED_BLOCK_HASH = `0x${"32".repeat(32)}`;
const ETH_RECEIPT_BLOCK_HASH = `0x${"41".repeat(32)}`;
const ETH_FINALIZED_BLOCK_HASH = `0x${"42".repeat(32)}`;

function clone(value) {
  return structuredClone(value);
}
function expectCode(fn, code) {
  assert.throws(fn, (error) => error?.code === code, `expected ${code}`);
}
function policyCore() {
  return {
    marker: POLICY_MARKER,
    version: 1,
    rail_order: ["base", "ethereum"],
    rails: [
      {
        source_chain: "base",
        evm_chain_id: "8453",
        usdc_contract: BASE_USDC,
        receive_address: BASE_RECEIVE,
        rpc_identity: "base-rpc-v1",
        finality_adapter_id: "base-finality-v1",
        min_confirmations: "12",
        finalized_reference_block: "1000",
      },
      {
        source_chain: "ethereum",
        evm_chain_id: "1",
        usdc_contract: ETH_USDC,
        receive_address: ETH_RECEIVE,
        rpc_identity: "ethereum-rpc-v1",
        finality_adapter_id: "ethereum-finality-v1",
        min_confirmations: "64",
        finalized_reference_block: "2000",
      },
    ],
    economics: clone(CANONICAL_ECONOMICS_V1),
  };
}
function policyGeneration() {
  const core = policyCore();
  const derived = deriveSourcePolicyCommitmentsV1(core);
  return {
    ...core,
    policy_id: derived.policy_id,
    stable_config_sha256: derived.stable_config_sha256,
    observation_sha256: derived.observation_sha256,
  };
}
function baseVerified(overrides = {}) {
  return {
    schema: "void_buy_void_verified_payment_binding_v1",
    upstream_marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    payment_verified: true,
    payment_identity_input_complete: true,
    source_chain: "base",
    transaction_hash: BASE_TX,
    log_index: "7",
    block_number: "989",
    usdc_contract: BASE_USDC,
    from_address: BASE_PAYER,
    receive_address: BASE_RECEIVE,
    delivery_address: BASE_PAYER,
    amount_units: "1000000",
    requested_units: "1000000",
    ...overrides,
  };
}
function baseFinality(policy = policyGeneration(), overrides = {}) {
  return {
    ok: true,
    status: "source_payment_finality_admitted",
    source_chain: "base",
    evm_chain_id: "8453",
    payment_identity: `voidpay1:base:${BASE_TX}:7`,
    transaction_hash: BASE_TX,
    log_index: "7",
    receipt_block_number: "989",
    finalized_reference_block: "1000",
    confirmations_observed: "12",
    finality_adapter_id: "base-finality-v1",
    policy_id: policy.policy_id,
    stable_config_sha256: policy.stable_config_sha256,
    observation_sha256: policy.observation_sha256,
    fulfillment_authority_granted: false,
    inventory_mutation_authority_granted: false,
    signing_or_broadcast_authority_granted: false,
    ...overrides,
  };
}
function ethVerified(overrides = {}) {
  return {
    schema: "void_buy_void_verified_payment_binding_v1",
    upstream_marker: "VOID_BUY_VOID_VERIFIED_PAYMENT_V2",
    payment_verified: true,
    payment_identity_input_complete: true,
    source_chain: "ethereum",
    transaction_hash: ETH_TX,
    log_index: "9",
    block_number: "1937",
    usdc_contract: ETH_USDC,
    from_address: ETH_PAYER,
    receive_address: ETH_RECEIVE,
    delivery_address: ETH_PAYER,
    amount_units: "2500000",
    requested_units: "2500000",
    ...overrides,
  };
}
function ethFinality(policy = policyGeneration(), overrides = {}) {
  return {
    ok: true,
    status: "source_payment_finality_admitted",
    source_chain: "ethereum",
    evm_chain_id: "1",
    payment_identity: `voidpay1:ethereum:${ETH_TX}:9`,
    transaction_hash: ETH_TX,
    log_index: "9",
    receipt_block_number: "1937",
    finalized_reference_block: "2000",
    confirmations_observed: "64",
    finality_adapter_id: "ethereum-finality-v1",
    policy_id: policy.policy_id,
    stable_config_sha256: policy.stable_config_sha256,
    observation_sha256: policy.observation_sha256,
    fulfillment_authority_granted: false,
    inventory_mutation_authority_granted: false,
    signing_or_broadcast_authority_granted: false,
    ...overrides,
  };
}
function baseBlockEvidence(overrides = {}) {
  return {
    schema: "void_buy_void_source_chain_finality_block_evidence_v1",
    marker: SOURCE_FINALITY_BLOCK_EVIDENCE_MARKER_V1,
    source_chain: "base",
    evm_chain_id: "8453",
    receipt_block_number: "989",
    receipt_block_hash: BASE_RECEIPT_BLOCK_HASH,
    finalized_reference_block: "1000",
    finalized_reference_block_hash: BASE_FINALIZED_BLOCK_HASH,
    finalized_tag: "finalized",
    provider_consistency_verified: true,
    ...overrides,
  };
}
function ethBlockEvidence(overrides = {}) {
  return {
    schema: "void_buy_void_source_chain_finality_block_evidence_v1",
    marker: SOURCE_FINALITY_BLOCK_EVIDENCE_MARKER_V1,
    source_chain: "ethereum",
    evm_chain_id: "1",
    receipt_block_number: "1937",
    receipt_block_hash: ETH_RECEIPT_BLOCK_HASH,
    finalized_reference_block: "2000",
    finalized_reference_block_hash: ETH_FINALIZED_BLOCK_HASH,
    finalized_tag: "finalized",
    provider_consistency_verified: true,
    ...overrides,
  };
}

function baseInput(overrides = {}) {
  const policy = overrides.policy_generation || policyGeneration();
  return {
    policy_generation: policy,
    verified_payment: overrides.verified_payment || baseVerified(),
    finality_admission: overrides.finality_admission || baseFinality(policy),
  };
}

function baseInputV2(overrides = {}) {
  const v1 = baseInput(overrides);
  return {
    ...v1,
    block_evidence:
      overrides.block_evidence || baseBlockEvidence(),
  };
}

const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test("authority is source-only and non-operational", () => {
  assert.equal(AUTHORITY_V1.source_only_reference_adapter, true);
  for (const [key, value] of Object.entries(AUTHORITY_V1)) {
    if (key === "source_only_reference_adapter") continue;
    assert.equal(value, false, key);
  }
});

test("upstream bindings pin exact reviewed generations", () => {
  assert.equal(UPSTREAM_BINDINGS_V1.main_base_sha, "090cd3ef1d60852f614c29cb7aee9ebdacde3e1b");
  assert.equal(UPSTREAM_BINDINGS_V1.pr_1463_head_sha, "35ce04e34320be7ab5f7773066de7c6c6384b034");
  assert.equal(UPSTREAM_BINDINGS_V1.pr_1465_head_sha, "846be5fceedc6ef1139bec546578e7cde6fbc8f4");
  assert.equal(UPSTREAM_BINDINGS_V1.pr_1463_finality_log_index_bound, "u32");
  assert.equal(UPSTREAM_BINDINGS_V1.pr_1465_payment_log_index_bound, "u64");
});

test("policy generation recomputes exact stable and observation commitments", () => {
  const policy = policyGeneration();
  const normalized = normalizePolicyGenerationV1(policy);
  assert.equal(normalized.policy_id, `void-buy-void-dual-rail-policy-v1-${normalized.stable_config_sha256}`);
  assert.match(normalized.stable_config_sha256, /^[0-9a-f]{64}$/);
  assert.match(normalized.observation_sha256, /^[0-9a-f]{64}$/);
});

test("policy stable fingerprint excludes moving reference height but observation changes", () => {
  const before = policyGeneration();
  const core = policyCore();
  core.rails[0].finalized_reference_block = "1001";
  const afterCommitments = deriveSourcePolicyCommitmentsV1(core);
  assert.equal(afterCommitments.stable_config_sha256, before.stable_config_sha256);
  assert.notEqual(afterCommitments.observation_sha256, before.observation_sha256);
});

test("policy stable fingerprint changes on USDC contract drift", () => {
  const before = policyGeneration();
  const core = policyCore();
  core.rails[0].usdc_contract = `0x${"77".repeat(20)}`;
  const after = deriveSourcePolicyCommitmentsV1(core);
  assert.notEqual(after.stable_config_sha256, before.stable_config_sha256);
});

test("policy generation rejects forged stable fingerprint", () => {
  const p = policyGeneration();
  p.stable_config_sha256 = "0".repeat(64);
  expectCode(() => normalizePolicyGenerationV1(p), "POLICY_STABLE_CONFIG_SHA256_MISMATCH");
});

test("policy generation rejects forged observation fingerprint", () => {
  const p = policyGeneration();
  p.observation_sha256 = "0".repeat(64);
  expectCode(() => normalizePolicyGenerationV1(p), "POLICY_OBSERVATION_SHA256_MISMATCH");
});

test("policy generation rejects rail reordering", () => {
  const p = policyGeneration();
  p.rails.reverse();
  expectCode(() => normalizePolicyGenerationV1(p), "POLICY_RAIL_ORDER_MISMATCH");
});

test("verified payment requires exact payer equals delivery", () => {
  const p = baseVerified({ delivery_address: `0x${"99".repeat(20)}` });
  expectCode(() => normalizeVerifiedPaymentBindingV1(p), "VERIFIED_PAYMENT_PAYER_DELIVERY_MISMATCH");
});

test("verified payment requires exact amount", () => {
  const p = baseVerified({ requested_units: "999999" });
  expectCode(() => normalizeVerifiedPaymentBindingV1(p), "VERIFIED_PAYMENT_NOT_EXACT");
});

test("finality admission grants no fulfillment or mutation authority", () => {
  const f = baseFinality(policyGeneration(), { fulfillment_authority_granted: true });
  expectCode(() => normalizeFinalityAdmissionV1(f), "FINALITY_GRANTED_FULFILLMENT_AUTHORITY");
});

test("finality admission rejects source log index above #1463 u32 bound", () => {
  const f = baseFinality(policyGeneration(), {
    log_index: "4294967296",
    payment_identity: `voidpay1:base:${BASE_TX}:4294967296`,
  });
  expectCode(() => normalizeFinalityAdmissionV1(f), "INVALID_FINALITY_LOG_INDEX");
});

test("Base handoff produces #1465 finalized source payment shape", () => {
  const result = buildFinalizedSourcePaymentHandoffV1(baseInput());
  validateFinalizedSourcePaymentProjectionV1(result);
  assert.equal(result.source_chain, "base");
  assert.equal(result.source_chain_id, "8453");
  assert.equal(result.payer_address, BASE_PAYER);
  assert.equal(result.delivery_address, BASE_PAYER);
  assert.equal(result.payment_usdc_atoms, "1000000");
  assert.equal(result.finality_status, "finalized");
  assert.equal(result.exact_payment_verified, true);
});

test("Ethereum handoff produces #1465 finalized source payment shape", () => {
  const policy = policyGeneration();
  const result = buildFinalizedSourcePaymentHandoffV1({
    policy_generation: policy,
    verified_payment: ethVerified(),
    finality_admission: ethFinality(policy),
  });
  validateFinalizedSourcePaymentProjectionV1(result);
  assert.equal(result.source_chain, "ethereum");
  assert.equal(result.source_chain_id, "1");
  assert.equal(result.payment_usdc_atoms, "2500000");
});

test("source policy fingerprint maps directly to #1463 combined stable config", () => {
  const input = baseInput();
  const result = buildFinalizedSourcePaymentHandoffV1(input);
  assert.equal(result.source_policy_fingerprint_sha256, input.policy_generation.stable_config_sha256);
});

test("source finality attestation is deterministic and domain separated", () => {
  const input = baseInput();
  const a = sourceFinalityAttestationSha256V1(input.finality_admission);
  const b = sourceFinalityAttestationSha256V1(clone(input.finality_admission));
  assert.equal(a, b);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, input.policy_generation.stable_config_sha256);
});

test("finality attestation preimage includes exact policy and observation generation", () => {
  const input = baseInput();
  const preimage = sourceFinalityAttestationPreimageV1(input.finality_admission);
  assert.equal(preimage.marker, FINALITY_ATTESTATION_MARKER);
  assert.equal(preimage.policy_id, input.policy_generation.policy_id);
  assert.equal(preimage.stable_config_sha256, input.policy_generation.stable_config_sha256);
  assert.equal(preimage.observation_sha256, input.policy_generation.observation_sha256);
  assert.equal(preimage.receipt_block_number, "989");
  assert.equal(preimage.finalized_reference_block, "1000");
});

test("attestation changes when receipt block changes", () => {
  const input = baseInput();
  const changed = baseFinality(input.policy_generation, {
    receipt_block_number: "988",
    confirmations_observed: "13",
  });
  assert.notEqual(
    sourceFinalityAttestationSha256V1(input.finality_admission),
    sourceFinalityAttestationSha256V1(changed),
  );
});

test("V1 attestation remains the reviewed height-only generation", () => {
  const input = baseInput();
  const preimage =
    sourceFinalityAttestationPreimageV1(
      input.finality_admission,
    );
  assert.equal(preimage.marker, FINALITY_ATTESTATION_MARKER);
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      preimage,
      "receipt_block_hash",
    ),
    false,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      preimage,
      "finalized_reference_block_hash",
    ),
    false,
  );
});

test("V2 block evidence is closed and hash-bound", () => {
  const evidence =
    normalizeSourceFinalityBlockEvidenceV2(
      baseBlockEvidence(),
    );
  assert.equal(
    evidence.receipt_block_hash,
    BASE_RECEIPT_BLOCK_HASH,
  );
  assert.equal(
    evidence.finalized_reference_block_hash,
    BASE_FINALIZED_BLOCK_HASH,
  );
  assert.equal(evidence.finalized_tag, "finalized");
  assert.equal(evidence.provider_consistency_verified, true);

  const unknown = {
    ...baseBlockEvidence(),
    unreviewed: true,
  };
  expectCode(
    () => normalizeSourceFinalityBlockEvidenceV2(unknown),
    "SOURCE_FINALITY_BLOCK_EVIDENCE_SHAPE_V2",
  );
});

test("V2 attestation preimage binds receipt and finalized hashes", () => {
  const input = baseInputV2();
  const preimage = sourceFinalityAttestationPreimageV2(
    input.finality_admission,
    input.block_evidence,
  );
  assert.equal(
    preimage.marker,
    FINALITY_ATTESTATION_MARKER_V2,
  );
  assert.equal(preimage.version, 2);
  assert.equal(
    preimage.receipt_block_hash,
    BASE_RECEIPT_BLOCK_HASH,
  );
  assert.equal(
    preimage.finalized_reference_block_hash,
    BASE_FINALIZED_BLOCK_HASH,
  );
  assert.equal(preimage.finalized_tag, "finalized");
  assert.equal(
    preimage.provider_consistency_verified,
    true,
  );
});

test("V2 handoff preserves payment key and policy fingerprint", () => {
  const input = baseInputV2();
  const v1 = buildFinalizedSourcePaymentHandoffV1({
    policy_generation: input.policy_generation,
    verified_payment: input.verified_payment,
    finality_admission: input.finality_admission,
  });
  const v2 = buildFinalizedSourcePaymentHandoffV2(input);
  validateFinalizedSourcePaymentProjectionV1(v2);
  assert.equal(
    v2.canonical_payment_identity,
    v1.canonical_payment_identity,
  );
  assert.equal(
    v2.payment_key_sha256,
    v1.payment_key_sha256,
  );
  assert.equal(
    v2.source_policy_fingerprint_sha256,
    v1.source_policy_fingerprint_sha256,
  );
  assert.notEqual(
    v2.source_finality_attestation_sha256,
    v1.source_finality_attestation_sha256,
  );
});

test("V2 finality digest changes on receipt block hash change", () => {
  const input = baseInputV2();
  const changed = {
    ...input.block_evidence,
    receipt_block_hash: `0x${"51".repeat(32)}`,
  };
  assert.notEqual(
    sourceFinalityAttestationSha256V2(
      input.finality_admission,
      input.block_evidence,
    ),
    sourceFinalityAttestationSha256V2(
      input.finality_admission,
      changed,
    ),
  );
});

test("V2 finality digest changes on finalized block hash change", () => {
  const input = baseInputV2();
  const changed = {
    ...input.block_evidence,
    finalized_reference_block_hash:
      `0x${"52".repeat(32)}`,
  };
  assert.notEqual(
    sourceFinalityAttestationSha256V2(
      input.finality_admission,
      input.block_evidence,
    ),
    sourceFinalityAttestationSha256V2(
      input.finality_admission,
      changed,
    ),
  );
});

test("V2 rejects block evidence source-chain mismatch", () => {
  const input = baseInputV2({
    block_evidence: {
      ...baseBlockEvidence(),
      source_chain: "ethereum",
      evm_chain_id: "1",
    },
  });
  expectCode(
    () => buildFinalizedSourcePaymentHandoffV2(input),
    "SOURCE_FINALITY_V2_SOURCE_CHAIN_MISMATCH",
  );
});

test("V2 rejects receipt-height mismatch", () => {
  const input = baseInputV2({
    block_evidence: {
      ...baseBlockEvidence(),
      receipt_block_number: "988",
    },
  });
  expectCode(
    () => buildFinalizedSourcePaymentHandoffV2(input),
    "SOURCE_FINALITY_V2_RECEIPT_BLOCK_MISMATCH",
  );
});

test("V2 rejects finalized-reference-height mismatch", () => {
  const input = baseInputV2({
    block_evidence: {
      ...baseBlockEvidence(),
      finalized_reference_block: "1001",
    },
  });
  expectCode(
    () => buildFinalizedSourcePaymentHandoffV2(input),
    "SOURCE_FINALITY_V2_REFERENCE_BLOCK_MISMATCH",
  );
});

test("V2 requires finalized tag and provider consistency", () => {
  expectCode(
    () =>
      normalizeSourceFinalityBlockEvidenceV2({
        ...baseBlockEvidence(),
        finalized_tag: "latest",
      }),
    "SOURCE_FINALITY_BLOCK_EVIDENCE_TAG_V2",
  );
  expectCode(
    () =>
      normalizeSourceFinalityBlockEvidenceV2({
        ...baseBlockEvidence(),
        provider_consistency_verified: false,
      }),
    "SOURCE_FINALITY_BLOCK_EVIDENCE_CONSISTENCY_V2",
  );
});

test("V2 Ethereum handoff remains #1465-shape compatible", () => {
  const policy = policyGeneration();
  const result = buildFinalizedSourcePaymentHandoffV2({
    policy_generation: policy,
    verified_payment: ethVerified(),
    finality_admission: ethFinality(policy),
    block_evidence: ethBlockEvidence(),
  });
  validateFinalizedSourcePaymentProjectionV1(result);
  assert.equal(result.source_chain, "ethereum");
  assert.equal(result.source_chain_id, "1");
  assert.equal(result.payment_usdc_atoms, "2500000");
});

test("handoff rejects verified USDC contract outside admitted rail", () => {
  const input = baseInput({ verified_payment: baseVerified({ usdc_contract: `0x${"77".repeat(20)}` }) });
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_USDC_CONTRACT_MISMATCH");
});

test("handoff rejects verified receive address outside admitted rail", () => {
  const input = baseInput({ verified_payment: baseVerified({ receive_address: `0x${"88".repeat(20)}` }) });
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_RECEIVE_ADDRESS_MISMATCH");
});

test("handoff rejects source-chain mismatch", () => {
  const input = baseInput();
  input.verified_payment = { ...input.verified_payment, source_chain: "ethereum" };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_SOURCE_CHAIN_MISMATCH");
});

test("handoff rejects transaction mismatch", () => {
  const input = baseInput({ verified_payment: baseVerified({ transaction_hash: `0x${"66".repeat(32)}` }) });
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_TRANSACTION_HASH_MISMATCH");
});

test("handoff rejects log-index mismatch", () => {
  const input = baseInput({ verified_payment: baseVerified({ log_index: "8" }) });
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_LOG_INDEX_MISMATCH");
});

test("handoff rejects receipt-block mismatch", () => {
  const input = baseInput({ verified_payment: baseVerified({ block_number: "988" }) });
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_RECEIPT_BLOCK_MISMATCH");
});

test("handoff rejects policy-id mismatch", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, policy_id: "other-policy" };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_POLICY_ID_MISMATCH");
});

test("handoff rejects stable policy fingerprint mismatch", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, stable_config_sha256: "0".repeat(64) };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_STABLE_CONFIG_MISMATCH");
});

test("handoff rejects observation generation mismatch", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, observation_sha256: "0".repeat(64) };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_OBSERVATION_MISMATCH");
});

test("handoff rejects finality adapter mismatch", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, finality_adapter_id: "wrong-adapter" };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_FINALITY_ADAPTER_MISMATCH");
});

test("handoff rejects finalized reference generation mismatch", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, finalized_reference_block: "1001", confirmations_observed: "13" };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_FINALITY_REFERENCE_MISMATCH");
});

test("handoff recomputes confirmation count", () => {
  const input = baseInput();
  input.finality_admission = { ...input.finality_admission, confirmations_observed: "13" };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_CONFIRMATION_COUNT_MISMATCH");
});

test("handoff independently enforces admitted minimum finality threshold", () => {
  const p = policyGeneration();
  p.rails[0].min_confirmations = "13";
  const d = deriveSourcePolicyCommitmentsV1({
    marker: p.marker, version: p.version, rail_order: p.rail_order,
    rails: p.rails, economics: p.economics,
  });
  p.policy_id = d.policy_id;
  p.stable_config_sha256 = d.stable_config_sha256;
  p.observation_sha256 = d.observation_sha256;
  const input = {
    policy_generation: p,
    verified_payment: baseVerified(),
    finality_admission: baseFinality(p),
  };
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_FINALITY_THRESHOLD_NOT_MET");
});

test("handoff input is closed to unknown fields", () => {
  const input = baseInput();
  input.unreviewed = true;
  expectCode(() => buildFinalizedSourcePaymentHandoffV1(input), "HANDOFF_INPUT_SHAPE");
});

test("finality admission is closed to unknown fields", () => {
  const f = baseFinality(policyGeneration());
  f.unreviewed = true;
  expectCode(() => normalizeFinalityAdmissionV1(f), "FINALITY_ADMISSION_SHAPE");
});

test("verified payment binding is closed to unknown fields", () => {
  const p = baseVerified();
  p.unreviewed = true;
  expectCode(() => normalizeVerifiedPaymentBindingV1(p), "VERIFIED_PAYMENT_SHAPE");
});

test("payment key uses unchanged #1463/#1465 domain-framed algorithm", () => {
  const result = buildFinalizedSourcePaymentHandoffV1(baseInput());
  assert.match(result.payment_key_sha256, /^[0-9a-f]{64}$/);
  assert.equal(result.canonical_payment_identity, `voidpay1:base:${BASE_TX}:7`);
  assert.match(moduleSource, /VOID_BUY_VOID_FULFILLMENT_ANCHOR_V1\\0/);
  assert.match(moduleSource, /length\.writeUInt32BE\(bytes\.length, 0\)/);
});

test("projection validator accepts target shape and rejects unknown fields", () => {
  const result = buildFinalizedSourcePaymentHandoffV1(baseInput());
  validateFinalizedSourcePaymentProjectionV1(result);
  const changed = { ...result, unknown: true };
  expectCode(() => validateFinalizedSourcePaymentProjectionV1(changed), "FINALIZED_PAYMENT_PROJECTION_SHAPE");
});

test("module has no runtime, network, filesystem, wallet, signer or ethers capability", () => {
  for (const forbidden of [
    'from "node:fs"', 'from "node:http"', 'from "node:https"',
    'from "node:net"', 'from "node:child_process"', 'from "ethers"',
    "process.env", "fetch(",
  ]) {
    assert.equal(moduleSource.includes(forbidden), false, forbidden);
  }
});

test("documentation states deterministic mapping and non-authority boundary", () => {
  const normalized = doc.toLowerCase().replace(/\s+/g, " ");
  for (const phrase of [
    "source_policy_fingerprint_sha256 = stable_config_sha256",
    "source_finality_attestation_sha256",
    "caller-written json is not production authority",
    "confirmation count alone is not finality",
    "u32",
    "u64",
    "does not authenticate live rpc",
  ]) {
    assert.ok(normalized.includes(phrase.toLowerCase()), phrase);
  }
});

test("workflow is pinned, three-major, exact path-scoped and diff-clean", () => {
  for (const path of [modulePath, proofPath, docPath, workflowPath]) {
    assert.ok(workflow.includes(`- "${path}"`), path);
  }
  assert.ok(workflow.includes("node: [22, 24, 26]"));
  assert.ok(workflow.includes("permissions:\n  contents: read"));
  assert.ok(workflow.includes("actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803"));
  assert.ok(workflow.includes("actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38"));
  assert.ok(workflow.includes("run: git diff --check"));
  assert.equal(/actions\/[a-z-]+@v[0-9]/.test(workflow), false);
});

let passed = 0;
for (const entry of tests) {
  try {
    await entry.fn();
    passed += 1;
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    console.error(`FAIL ${entry.name}`);
    throw error;
  }
}

console.log(JSON.stringify({
  marker: MARKER,
  cases_passed: passed,
  cases_total: tests.length,
  policy_fingerprint_mapping: "stable_config_sha256",
  finality_attestation_domain: FINALITY_ATTESTATION_MARKER,
  hash_bound_finality_attestation_domain:
    FINALITY_ATTESTATION_MARKER_V2,
  receipt_block_hash_bound_v2: true,
  finalized_reference_block_hash_bound_v2: true,
  v1_attestation_behavior_preserved: true,
  pr_1463_finality_log_index_bound: UPSTREAM_BINDINGS_V1.pr_1463_finality_log_index_bound,
  pr_1465_payment_log_index_bound: UPSTREAM_BINDINGS_V1.pr_1465_payment_log_index_bound,
  live_rpc_authenticated: false,
  chain_mutation_authority: false,
  money_movement_authority: false,
}, null, 2));
console.log("VOID_BUY_VOID_SOURCE_FINALITY_HANDOFF_V1_GREEN");
