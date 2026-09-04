#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  CHAIN_OWNS_V1,
  CONTRACT_SCHEMA_V1,
  CONTRACT_VERSION_V1,
  DATANET_OWNS_V1,
  DESIGNATED_HOST_EVIDENCE_GATES_V1,
  DISPOSABLE_LOCAL_STATE_V1,
  HOSTED_EVIDENCE_GATES_V1,
  LOCAL_STATE_REQUIRED_V1,
  MAX_ANCHOR_SET_RECORDS_V1,
  MAX_DATANET_SEGMENT_BYTES_V1,
  PAYMENT_RAILS_V1,
  REQUIRED_CHAIN_SUCCESSOR_V1,
  SOURCE_BINDINGS_V1,
  V4_DELETE_V1,
  V4_RETAIN_V1,
  VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_AUTHORITY_V1,
  VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1,
  buildDatanetContentAnchorV1,
  buildFulfillmentAnchorCandidateV1,
  canonicalPaymentIdentityV1,
  decideBuyVoidRecoveryV1,
  decideDatanetSegmentRecoveryV1,
  fulfillmentAnchorKeySha256V1,
  normalizeSourceChainV1,
  paymentIdentitySha256V1,
  paymentRailV1,
  resolveFinalizedChainTruthV1,
  validateChainAnchorContractPacketV1,
  validateFulfillmentAnchorSetV1,
  validateFulfillmentAnchorV1,
} from "./lib/void_buy_void_chain_anchor_contract_v1.mjs";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath =
  "fixtures/economic/buy-void-chain-anchor-contract-v1.example.json";
const schemaPath =
  "schemas/buy-void-chain-anchor-contract-v1.schema.json";
const modulePath =
  "scripts/lib/void_buy_void_chain_anchor_contract_v1.mjs";
const proofPath =
  "scripts/prove_void_buy_void_chain_anchor_contract_v1.mjs";
const docPath =
  "docs/architecture/buy-void-chain-anchor-and-datanet-boundary-v1.md";
const workflowPath =
  ".github/workflows/void-buy-void-chain-anchor-contract-v1.yml";

const changedPaths = Object.freeze([
  modulePath,
  proofPath,
  schemaPath,
  fixturePath,
  docPath,
  workflowPath,
]);

function read(relativePath) {
  return readFileSync(resolve(repo, relativePath), "utf8");
}

function parseJson(relativePath) {
  const bytes = read(relativePath);
  assert.ok(bytes.endsWith("\n"), `${relativePath} must end in one LF`);
  assert.ok(!bytes.endsWith("\n\n"), `${relativePath} must end in one LF`);
  return JSON.parse(bytes);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function clone(value) {
  return structuredClone(value);
}

const tests = [];
function test(name, body) {
  tests.push(Object.freeze({ name, body }));
}

const BASE_PAYMENT_TX = `0x${"11".repeat(32)}`;
const ETHEREUM_PAYMENT_TX = `0x${"22".repeat(32)}`;
const BASE_DELIVERY_TX = `0x${"33".repeat(32)}`;
const ETHEREUM_DELIVERY_TX = `0x${"44".repeat(32)}`;
const OTHER_DELIVERY_TX = `0x${"55".repeat(32)}`;
const BASE_DELIVERY_BLOCK_HASH = `0x${"66".repeat(32)}`;
const ETHEREUM_DELIVERY_BLOCK_HASH = `0x${"77".repeat(32)}`;
const VOID_TOKEN = `0x${"a1".repeat(20)}`;
const FULFILLMENT_WALLET = `0x${"b2".repeat(20)}`;
const DELIVERY_ADDRESS = `0x${"c3".repeat(20)}`;
const FINALITY_A = `voidfinal1_${"a".repeat(64)}`;
const FINALITY_B = `voidfinal1_${"b".repeat(64)}`;

function anchorInput(overrides = {}) {
  return {
    source_chain: "base",
    source_payment_transaction_hash: BASE_PAYMENT_TX,
    source_payment_log_index: "7",
    void_token_contract: VOID_TOKEN,
    fulfillment_wallet: FULFILLMENT_WALLET,
    delivery_address: DELIVERY_ADDRESS,
    void_amount_units: "2000000",
    delivery_transaction_hash: BASE_DELIVERY_TX,
    delivery_log_index: "0",
    delivery_block_number: "2050000",
    delivery_block_hash: BASE_DELIVERY_BLOCK_HASH,
    finality_kind: "accepted_checkpoint",
    finality_reference: FINALITY_A,
    ...overrides,
  };
}

function deliveryObservation(anchor, overrides = {}) {
  return {
    transaction_hash: anchor.delivery_transaction_hash,
    log_index: anchor.delivery_log_index,
    block_number: anchor.delivery_block_number,
    block_hash: anchor.delivery_block_hash,
    confirmation_state: "finalized",
    ...overrides,
  };
}

const fixture = parseJson(fixturePath);
const schema = parseJson(schemaPath);
const moduleSource = read(modulePath);
const proofSource = read(proofPath);
const architecture = read(docPath);
const workflow = read(workflowPath);

const baseIdentity = canonicalPaymentIdentityV1({
  source_chain: "base",
  transaction_hash: BASE_PAYMENT_TX,
  log_index: "7",
});
const ethereumIdentity = canonicalPaymentIdentityV1({
  source_chain: "ethereum",
  transaction_hash: ETHEREUM_PAYMENT_TX,
  log_index: "9",
});
const baseAnchor = buildFulfillmentAnchorCandidateV1(anchorInput());
const ethereumAnchor = buildFulfillmentAnchorCandidateV1(
  anchorInput({
    source_chain: "ethereum",
    source_payment_transaction_hash: ETHEREUM_PAYMENT_TX,
    source_payment_log_index: "9",
    delivery_transaction_hash: ETHEREUM_DELIVERY_TX,
    delivery_log_index: "1",
    delivery_block_number: "2050001",
    delivery_block_hash: ETHEREUM_DELIVERY_BLOCK_HASH,
    finality_kind: "protocol_finalized_state",
    finality_reference: FINALITY_B,
  }),
);

test("marker, schema, version, and authority are closed", () => {
  assert.equal(
    VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1,
    "VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1",
  );
  assert.equal(CONTRACT_SCHEMA_V1, fixture.schema);
  assert.equal(CONTRACT_VERSION_V1, 1);
  assert.deepEqual(
    Object.values(VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_AUTHORITY_V1),
    new Array(
      Object.keys(
        VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_AUTHORITY_V1,
      ).length,
    ).fill(false),
  );
});

test("accepted rails are exactly Base USDC and Ethereum USDC", () => {
  assert.deepEqual(PAYMENT_RAILS_V1, [
    { source_chain: "base", evm_chain_id: "8453", asset: "USDC" },
    {
      source_chain: "ethereum",
      evm_chain_id: "1",
      asset: "USDC",
    },
  ]);
  assert.equal(paymentRailV1("base").evm_chain_id, "8453");
  assert.equal(paymentRailV1("ethereum").evm_chain_id, "1");
});

test("eth alias canonicalizes to ethereum", () => {
  assert.equal(normalizeSourceChainV1("ETH"), "ethereum");
  assert.equal(
    canonicalPaymentIdentityV1({
      source_chain: "eth",
      transaction_hash: ETHEREUM_PAYMENT_TX.toUpperCase(),
      log_index: 9,
    }),
    ethereumIdentity,
  );
});

test("unsupported payment rails fail closed", () => {
  for (const value of ["arbitrum", "polygon", "bitcoin", "", "base-sepolia"]) {
    assert.throws(
      () => normalizeSourceChainV1(value),
      /unsupported_source_payment_chain/,
    );
  }
});

test("canonical Base payment identity is exact", () => {
  assert.equal(
    baseIdentity,
    `voidpay1:base:${BASE_PAYMENT_TX}:7`,
  );
});

test("canonical Ethereum payment identity is exact", () => {
  assert.equal(
    ethereumIdentity,
    `voidpay1:ethereum:${ETHEREUM_PAYMENT_TX}:9`,
  );
});

test("payment identity rejects malformed transaction and log index", () => {
  assert.throws(
    () =>
      canonicalPaymentIdentityV1({
        source_chain: "base",
        transaction_hash: "0x1234",
        log_index: "7",
      }),
    /payment_transaction_hash_invalid/,
  );
  for (const value of ["-1", "01", "1.0", "", Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(
      () =>
        canonicalPaymentIdentityV1({
          source_chain: "base",
          transaction_hash: BASE_PAYMENT_TX,
          log_index: value,
        }),
      /payment_log_index_invalid/,
    );
  }
});

test("fulfillment anchor key is domain separated", () => {
  const identityDigest = paymentIdentitySha256V1(baseIdentity);
  const anchorKey = fulfillmentAnchorKeySha256V1(baseIdentity);
  assert.match(identityDigest, /^[0-9a-f]{64}$/);
  assert.match(anchorKey, /^[0-9a-f]{64}$/);
  assert.notEqual(anchorKey, identityDigest);
  assert.notEqual(
    anchorKey,
    fulfillmentAnchorKeySha256V1(ethereumIdentity),
  );
});

test("Base fulfillment anchor validates", () => {
  const decision = validateFulfillmentAnchorV1(baseAnchor);
  assert.equal(decision.ok, true);
  assert.equal(decision.anchor.source_chain, "base");
  assert.equal(decision.anchor.source_chain_id, "8453");
  assert.equal(
    decision.anchor.canonical_payment_identity,
    baseIdentity,
  );
});

test("Ethereum fulfillment anchor validates", () => {
  const decision = validateFulfillmentAnchorV1(ethereumAnchor);
  assert.equal(decision.ok, true);
  assert.equal(decision.anchor.source_chain, "ethereum");
  assert.equal(decision.anchor.source_chain_id, "1");
  assert.equal(
    decision.anchor.canonical_payment_identity,
    ethereumIdentity,
  );
});

test("fulfillment anchor is closed to unknown fields", () => {
  const mutated = clone(baseAnchor);
  mutated.unreviewed = true;
  const decision = validateFulfillmentAnchorV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "fulfillment_anchor_keys_mismatch");
});

test("fulfillment anchor rejects derived-field substitution", () => {
  const mutated = clone(baseAnchor);
  mutated.source_chain_id = "1";
  const decision = validateFulfillmentAnchorV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(
    decision.reason,
    "fulfillment_anchor_derived_field_mismatch",
  );
});

test("fulfillment anchor rejects non-finalized records", () => {
  const mutated = clone(baseAnchor);
  mutated.finalized = false;
  const decision = validateFulfillmentAnchorV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(
    decision.reason,
    "fulfillment_anchor_constant_mismatch",
  );
});

test("identical anchor replay is idempotent", () => {
  const decision = validateFulfillmentAnchorSetV1([
    baseAnchor,
    clone(baseAnchor),
  ]);
  assert.deepEqual(decision, {
    ok: true,
    status: "VALID",
    unique_count: 1,
    duplicate_count: 1,
  });
});

test("one payment cannot map to two fulfillment events", () => {
  const conflict = buildFulfillmentAnchorCandidateV1(
    anchorInput({
      delivery_transaction_hash: OTHER_DELIVERY_TX,
    }),
  );
  const decision = validateFulfillmentAnchorSetV1([
    baseAnchor,
    conflict,
  ]);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "payment_anchor_conflict");
});

test("one delivery event cannot satisfy two payments", () => {
  const reusedDelivery = buildFulfillmentAnchorCandidateV1(
    anchorInput({
      source_chain: "ethereum",
      source_payment_transaction_hash: ETHEREUM_PAYMENT_TX,
      source_payment_log_index: "9",
      delivery_transaction_hash:
        baseAnchor.delivery_transaction_hash,
      delivery_log_index: baseAnchor.delivery_log_index,
      finality_kind: "protocol_finalized_state",
      finality_reference: FINALITY_B,
    }),
  );
  const decision = validateFulfillmentAnchorSetV1([
    baseAnchor,
    reusedDelivery,
  ]);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "delivery_event_reuse_conflict");
});

test("anchor-set cardinality is bounded before iteration", () => {
  const oversized = new Array(MAX_ANCHOR_SET_RECORDS_V1 + 1).fill(
    baseAnchor,
  );
  const decision = validateFulfillmentAnchorSetV1(oversized);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "fulfillment_anchor_set_too_large");
});

test("unfinalized source payment cannot advance fulfillment", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "observed",
    },
    delivery_observation: null,
    fulfillment_anchor: null,
    local_cache_claim: "fulfilled",
  });
  assert.equal(decision.status, "SOURCE_PAYMENT_NOT_FINAL_HOLD");
  assert.equal(decision.local_cache_conflict, true);
  assert.equal(decision.automatic_execution_authorized, false);
});

test("finalized payment without delivery is preparation-only", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: null,
    fulfillment_anchor: null,
    local_cache_claim: "not_fulfilled",
  });
  assert.equal(decision.status, "READY_FOR_BOUNDED_PREPARATION");
  assert.equal(decision.ok, true);
  assert.equal(decision.signing_authorized, false);
  assert.equal(decision.transaction_broadcast_authorized, false);
  assert.equal(decision.money_movement_authorized, false);
});

test("local fulfilled claim without chain anchor is held", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: null,
    fulfillment_anchor: null,
    local_cache_claim: "fulfilled",
  });
  assert.equal(
    decision.status,
    "LOCAL_FULFILLMENT_CLAIM_UNANCHORED_HOLD",
  );
  assert.equal(decision.local_cache_authoritative, false);
});

test("delivery receipt without payment-keyed anchor is held", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: deliveryObservation(baseAnchor, {
      confirmation_state: "confirmed",
    }),
    fulfillment_anchor: null,
    local_cache_claim: "unknown",
  });
  assert.equal(
    decision.status,
    "CORRELATION_ANCHOR_MISSING_HOLD",
  );
});

test("exact finalized anchor makes fulfillment idempotently complete", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: deliveryObservation(baseAnchor),
    fulfillment_anchor: baseAnchor,
    local_cache_claim: "not_fulfilled",
  });
  assert.equal(decision.status, "ALREADY_FULFILLED");
  assert.equal(decision.ok, true);
  assert.equal(decision.local_cache_conflict, true);
  assert.equal(decision.local_cache_authoritative, false);
});

test("anchor for another source payment is rejected", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "ethereum",
      transaction_hash: ETHEREUM_PAYMENT_TX,
      log_index: "9",
      finality: "finalized",
    },
    delivery_observation: null,
    fulfillment_anchor: baseAnchor,
    local_cache_claim: "unknown",
  });
  assert.equal(
    decision.status,
    "FULFILLMENT_ANCHOR_PAYMENT_MISMATCH_HOLD",
  );
});

test("anchor and observed delivery must identify the same event", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: BASE_PAYMENT_TX,
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: deliveryObservation(baseAnchor, {
      transaction_hash: OTHER_DELIVERY_TX,
    }),
    fulfillment_anchor: baseAnchor,
    local_cache_claim: "unknown",
  });
  assert.equal(
    decision.status,
    "FULFILLMENT_ANCHOR_DELIVERY_MISMATCH_HOLD",
  );
});

test("malformed recovery input fails without authority", () => {
  const decision = decideBuyVoidRecoveryV1({
    payment: {
      source_chain: "base",
      transaction_hash: "bad",
      log_index: "7",
      finality: "finalized",
    },
    delivery_observation: null,
    fulfillment_anchor: null,
    local_cache_claim: "unknown",
  });
  assert.equal(decision.status, "RECOVERY_INPUT_INVALID_HOLD");
  assert.equal(decision.money_movement_authorized, false);
});

test("finalized chain truth outranks conflicting local cache", () => {
  const decision = resolveFinalizedChainTruthV1({
    finalized_chain_value: {
      state: "fulfilled",
      delivery_transaction_hash: BASE_DELIVERY_TX,
    },
    local_cache_value: { state: "not_fulfilled" },
  });
  assert.equal(decision.source, "finalized_chain");
  assert.equal(decision.value.state, "fulfilled");
  assert.equal(decision.local_cache_conflict, true);
});

const datanetPayload = Buffer.from(
  "DataNet payload bound to Chain-2050\n",
  "utf8",
);
const datanetAnchor = buildDatanetContentAnchorV1({
  object_id: "void-object:example:1",
  content_sha256: sha256(datanetPayload),
  finality_reference: FINALITY_A,
});

test("DataNet recovery requires a finalized chain anchor", () => {
  const decision = decideDatanetSegmentRecoveryV1({
    chain_anchor: null,
    payload: datanetPayload,
  });
  assert.equal(decision.status, "CHAIN_ANCHOR_REQUIRED_HOLD");
  assert.equal(decision.byte_availability_proven, false);
});

test("chain commitment does not imply payload availability", () => {
  const decision = decideDatanetSegmentRecoveryV1({
    chain_anchor: datanetAnchor,
    payload: null,
  });
  assert.equal(decision.status, "PAYLOAD_UNAVAILABLE");
  assert.equal(decision.chain_truth_authoritative, true);
  assert.equal(decision.byte_availability_proven, false);
});

test("forged DataNet bytes fail digest verification", () => {
  const decision = decideDatanetSegmentRecoveryV1({
    chain_anchor: datanetAnchor,
    payload: Buffer.from("forged bytes\n", "utf8"),
  });
  assert.equal(decision.status, "PAYLOAD_DIGEST_MISMATCH_HOLD");
  assert.equal(decision.byte_availability_proven, false);
});

test("exact DataNet bytes verify against the chain commitment", () => {
  const decision = decideDatanetSegmentRecoveryV1({
    chain_anchor: datanetAnchor,
    payload: datanetPayload,
  });
  assert.equal(decision.status, "PAYLOAD_VERIFIED");
  assert.equal(decision.ok, true);
  assert.equal(decision.content_sha256, sha256(datanetPayload));
  assert.equal(decision.filesystem_mutation_authorized, false);
});

test("DataNet segment verification is bounded", () => {
  const decision = decideDatanetSegmentRecoveryV1({
    chain_anchor: datanetAnchor,
    payload: Buffer.alloc(MAX_DATANET_SEGMENT_BYTES_V1 + 1),
  });
  assert.equal(decision.status, "PAYLOAD_TOO_LARGE_HOLD");
  assert.equal(decision.maximum_bytes, 8 * 1024 * 1024);
});

test("example packet is exactly accepted", () => {
  const decision = validateChainAnchorContractPacketV1(fixture);
  assert.equal(decision.ok, true);
  assert.deepEqual(fixture.CHAIN_OWNS, CHAIN_OWNS_V1);
  assert.deepEqual(fixture.DATANET_OWNS, DATANET_OWNS_V1);
  assert.deepEqual(
    fixture.LOCAL_STATE_REQUIRED,
    LOCAL_STATE_REQUIRED_V1,
  );
  assert.deepEqual(
    fixture.DISPOSABLE_LOCAL_STATE,
    DISPOSABLE_LOCAL_STATE_V1,
  );
  assert.deepEqual(
    fixture.REQUIRED_CHAIN_SUCCESSOR,
    REQUIRED_CHAIN_SUCCESSOR_V1,
  );
  assert.deepEqual(fixture.V4_RETAIN_DELETE.retain, V4_RETAIN_V1);
  assert.deepEqual(fixture.V4_RETAIN_DELETE.delete, V4_DELETE_V1);
});

test("example packet rejects schema extension", () => {
  const mutated = clone(fixture);
  mutated.unreviewed = true;
  const decision = validateChainAnchorContractPacketV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "chain_anchor_contract_packet_keys_mismatch");
});

test("example packet rejects payment-rail narrowing", () => {
  const mutated = clone(fixture);
  mutated.accepted_payment_rails.pop();
  const decision = validateChainAnchorContractPacketV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "accepted_payment_rails_mismatch");
});

test("example packet rejects false current anchor claims", () => {
  const mutated = clone(fixture);
  mutated.current_source_state
    .on_chain_payment_to_fulfillment_anchor_present = true;
  const decision = validateChainAnchorContractPacketV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "current_source_state_mismatch");
});

test("example packet cannot grant authority", () => {
  const mutated = clone(fixture);
  mutated.authority.transaction_broadcast = true;
  const decision = validateChainAnchorContractPacketV1(mutated);
  assert.equal(decision.ok, false);
  assert.equal(decision.reason, "authority_mismatch");
});

test("JSON Schema is closed and binds every fixture property", () => {
  assert.equal(
    schema.$schema,
    "https://json-schema.org/draft/2020-12/schema",
  );
  assert.equal(schema.type, "object");
  assert.equal(schema.additionalProperties, false);
  assert.deepEqual(
    [...schema.required].sort(),
    Object.keys(fixture).sort(),
  );
  for (const [key, value] of Object.entries(fixture)) {
    assert.deepEqual(
      schema.properties[key].const,
      value,
      `schema const mismatch for ${key}`,
    );
  }
});

test("source bindings reflect current Buy VOID implementation", () => {
  const autoFulfillment = read(SOURCE_BINDINGS_V1.payment_identity);
  const dualRailProof = read(SOURCE_BINDINGS_V1.dual_payment_rail_proof);
  const delivery = read(SOURCE_BINDINGS_V1.delivery_transaction);
  const reconciler = read(
    SOURCE_BINDINGS_V1.delivery_receipt_reconciler,
  );
  const fulfillmentJoin = read(SOURCE_BINDINGS_V1.fulfillment_join);
  const finalityBoundary = read(SOURCE_BINDINGS_V1.finality_boundary);

  assert.match(
    autoFulfillment,
    /raw === "eth" \? "ethereum" : raw/,
  );
  assert.match(
    autoFulfillment,
    /return `voidpay1:\$\{chain\}:\$\{txHash\}:\$\{logIndex\.toString\(\)\}`/,
  );
  assert.match(
    dualRailProof,
    /allowed_chains:\s*\["base",\s*"ethereum"\]/,
  );
  assert.match(
    delivery,
    /TRANSFER_INTERFACE\.encodeFunctionData\("transfer",\s*\[/,
  );
  for (const method of [
    '"eth_chainId"',
    '"eth_getTransactionReceipt"',
    '"eth_blockNumber"',
  ]) {
    assert.ok(reconciler.includes(method), `missing ${method}`);
  }
  assert.ok(reconciler.includes("min_confirmations"));
  assert.ok(reconciler.includes("revalidationResponse"));
  assert.ok(fulfillmentJoin.includes("canonical_payment_identity"));
  assert.ok(fulfillmentJoin.includes("void_delivery_tx_hash"));
  assert.match(
    finalityBoundary,
    /not an actual HTTP route call, not fork choice, and not peer quorum/,
  );
});

test("module carries no runtime, filesystem, network, or wallet dependency", () => {
  assert.match(
    moduleSource,
    /^import \{ createHash \} from "node:crypto";/,
  );
  for (const forbidden of [
    'from "node:fs"',
    'from "node:http"',
    'from "node:https"',
    'from "node:net"',
    'from "node:child_process"',
    'from "ethers"',
    "process.env",
    "fetch(",
  ]) {
    assert.equal(
      moduleSource.includes(forbidden),
      false,
      `forbidden module capability: ${forbidden}`,
    );
  }
});

test("architecture document states the negative evidence", () => {
  const normalizedArchitecture = architecture
    .toLowerCase()
    .replace(/\s+/g, " ");
  for (const required of [
    "Base mainnet USDC",
    "Ethereum mainnet USDC",
    "## CHAIN_OWNS",
    "## DATANET_OWNS",
    "## LOCAL_STATE_REQUIRED",
    "## V4_RETAIN_DELETE",
    "payment-keyed fulfillment anchor",
    "A digest is not availability.",
    "does not activate a payment rail",
  ]) {
    assert.ok(
      normalizedArchitecture.includes(
        required.toLowerCase().replace(/\s+/g, " "),
      ),
      `architecture missing ${required}`,
    );
  }
});

test("focused workflow is exact, pinned, and three-major", () => {
  for (const expectedPath of changedPaths) {
    assert.ok(
      workflow.includes(`- "${expectedPath}"`),
      `workflow missing ${expectedPath}`,
    );
  }
  assert.ok(workflow.includes("permissions:\n  contents: read"));
  assert.ok(
    workflow.includes(
      "actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803",
    ),
  );
  assert.ok(
    workflow.includes(
      "actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38",
    ),
  );
  assert.ok(workflow.includes("node: [22, 24, 26]"));
  assert.ok(
    workflow.includes(
      "node scripts/prove_void_buy_void_chain_anchor_contract_v1.mjs",
    ),
  );
  assert.ok(workflow.includes("run: git diff --check"));
  assert.equal(/actions\/[a-z-]+@v[0-9]/.test(workflow), false);
});

test("artifacts stay within bounded review sizes", () => {
  const ceilings = {
    [modulePath]: 64 * 1024,
    [proofPath]: 64 * 1024,
    [schemaPath]: 16 * 1024,
    [fixturePath]: 16 * 1024,
    [docPath]: 32 * 1024,
    [workflowPath]: 8 * 1024,
  };
  for (const [relativePath, maximum] of Object.entries(ceilings)) {
    const size = statSync(resolve(repo, relativePath)).size;
    assert.ok(
      size > 0 && size <= maximum,
      `${relativePath} size ${size} exceeds ${maximum}`,
    );
  }
});

let passed = 0;
for (const entry of tests) {
  try {
    await entry.body();
    passed += 1;
    console.log(`PASS ${entry.name}`);
  } catch (error) {
    console.error(`FAIL ${entry.name}`);
    throw error;
  }
}

console.log(
  JSON.stringify(
    {
      marker: VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1,
      source_payment_rails: PAYMENT_RAILS_V1.map(
        (rail) => `${rail.source_chain}:USDC`,
      ),
      delivery_chain_id: "2050",
      hosted_cases_passed: passed,
      hosted_cases_total: tests.length,
      current_on_chain_payment_fulfillment_anchor: false,
      current_on_chain_finite_inventory_state: false,
      current_live_route_fork_choice_finality: false,
      chain_truth_implies_datanet_byte_availability: false,
      hosted_evidence_gates: HOSTED_EVIDENCE_GATES_V1.length,
      designated_host_evidence_gates:
        DESIGNATED_HOST_EVIDENCE_GATES_V1.length,
      source_mutation_authority: false,
      runtime_mutation_authority: false,
      money_movement_authority: false,
    },
    null,
    2,
  ),
);
console.log("VOID_BUY_VOID_CHAIN_ANCHOR_CONTRACT_V1_GREEN");
