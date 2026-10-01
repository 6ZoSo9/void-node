#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import * as activationContract from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts";
import {
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_AUTHORITY_V1,
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_REVIEWED_MAIN_V1,
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
  evaluateGateSourceInventoryV1,
  evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1,
} from "../tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs";

const dormant = {
  parent_runtime: "1",
  claimed_runtime: "0",
  full_runtime: "0",
  admitted_guarded_runtime: "0",
  full_runtime_apply: "0",
};

const gateSources = [
  {
    path: "/home/zoso/.config/systemd/user/void-node-live.service.d/70-buy-void-runtime-integration-v1.conf",
    sha256:
      "4b9221fcce60c29b22cbc2c61899f551086dea50b1d12c32d3f3e6505324aca5",
    assignments: {
      VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED: "1",
    },
  },
  {
    path: "/home/zoso/.config/systemd/user/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf",
    sha256:
      "d244e9e6a8e2fc14179861676fa7843a7be6cc5e05b3481afd7bf72eb6ef3e9c",
    assignments: {
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "0",
      VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
    },
  },
  {
    path: "/home/zoso/.config/systemd/user/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf",
    sha256:
      "2445f07932a367b28c0db7a9743f8467d49c08c18d6ceaf5038bb5aae626a325",
    assignments: {
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED:
        "0",
      VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED:
        "0",
    },
  },
];

const runtimeStatus = {
  parent_enabled: true,
  root_dir: "/home/zoso/dev/void-node/data_a/buy_void_v1/runtime-integration-v1",
  full_runtime_enabled: false,
  full_runtime_apply_enabled: false,
  policy_configured: true,
  signing_dependency_env_configured: true,
  full_runtime_policy_fingerprint_sha256:
    "b56c0abde0ea767711053a15975863ee012758c07907e729ca016f2a3190bd92",
  runtime_policy_fingerprint_sha256:
    "ba23302c2af292e78c07692d58d8bb03090ad695943cdbb15d6b9af394aa7c88",
  preparation_policy_fingerprint_sha256:
    "3f4361d0ac5dac407e4ab1ae3f47b86e497f5af3db481a586c2c3f92b8f85da5",
  receipt_policy_fingerprint_sha256:
    "23fac2c2de846eb99bc3647bfe54a83f704a5bc95a336eb1cc6edf54664390e4",
  history_carrier_authority_id:
    "d4c9e22f0d619e7377ec0388bb8cdc19ef8d3782138ec87c3fe5ef271040af81",
  history_carrier_generation: 1,
  history_carrier_activation_ready: true,
  history_carrier_activation_hold_reason: "",
  claimed_runtime_enabled: false,
  admitted_runtime_enabled: false,
  claimed_full_runtime_enabled: false,
  claimed_full_runtime_apply_enabled: false,
};

const postgresQualification = {
  status: "POSTGRES_FACTORY_AND_SCHEMA_ADMITTED_DORMANT",
  configuration_fingerprint_sha256:
    "8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40",
  schema_fingerprint_sha256:
    "89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1",
  credential_read_performed: true,
  credential_content_output: false,
  loopback_postgres_tls_connect_performed: true,
  schema_query_performed: true,
  database_mutation_performed: false,
  full_runtime_enabled: false,
  full_runtime_apply_enabled: false,
  claimed_runtime_enabled: false,
  admitted_guarded_runtime_enabled: false,
  worker_invoked: false,
  transaction_broadcast_performed: false,
  funds_movement_performed: false,
};

function snapshot(overrides = {}) {
  return {
    marker: VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
    version: 1,
    host: {
      hostname: "zoso-Precision-Tower-7810",
      repo_root: "/home/zoso/dev/void-node",
      branch: "main",
      head_sha:
        VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_REVIEWED_MAIN_V1,
      worktree_clean: true,
      service_unit: "void-node-live.service",
      active_state: "active",
      sub_state: "running",
      main_pid: 2994,
      process_cwd: "/home/zoso/dev/void-node",
    },
    gate_sources: structuredClone(gateSources),
    configured_gates: { ...dormant },
    process_gates: { ...dormant },
    runtime_status: { ...runtimeStatus },
    postgres_qualification: { ...postgresQualification },
    ...overrides,
  };
}

assert.equal(
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1,
  "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_AUTHORITY_V1,
  {
    designated_host_read_only_preflight: true,
    repository_identity_read: true,
    process_environment_read_safe_keys_only: true,
    systemd_dropin_gate_assignment_read: true,
    loopback_status_read: true,
    postgres_qualification_receipt_read: true,
    activation_generation_derivation: true,
    exact_dropin_bytes_derivation: true,
    source_mutation: false,
    dropin_write: false,
    dropin_remove: false,
    daemon_reload: false,
    service_stop: false,
    service_start: false,
    service_restart: false,
    runtime_gate_mutation: false,
    credential_read: false,
    database_connection: false,
    database_mutation: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    public_presale_activation: false,
    market_activation: false,
    funds_movement: false,
  },
);

const inventory = evaluateGateSourceInventoryV1(gateSources);
assert.equal(inventory.reviewed.length, 3);
assert.equal(inventory.unreviewed.length, 0);
assert.equal(inventory.complete, true);

const green =
  await evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
    snapshot(),
    activationContract,
  );
assert.equal(green.status, "ATOMIC_ACTIVATION_PREFLIGHT_GREEN_NOT_AUTHORIZED");
assert.equal(green.activation_ready, true);
assert.equal(green.activation_authorized, false);
assert.equal(green.unreviewed_gate_sources.length, 0);
assert.match(green.live_configuration_generation_id, /^voidbvpcg1_[0-9a-f]{64}$/u);
assert.match(green.live_configuration_sha256, /^[0-9a-f]{64}$/u);
assert.match(green.live_dropin_sha256, /^[0-9a-f]{64}$/u);
assert.match(green.dormant_configuration_generation_id, /^voidbvpcg1_[0-9a-f]{64}$/u);
assert.match(green.dormant_configuration_sha256, /^[0-9a-f]{64}$/u);
assert.match(green.dormant_dropin_sha256, /^[0-9a-f]{64}$/u);
assert.notEqual(
  green.live_configuration_sha256,
  green.dormant_configuration_sha256,
);
assert.notEqual(green.live_dropin_sha256, green.dormant_dropin_sha256);

for (const line of [
  "Environment=VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=1",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=1",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=1",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=1",
]) {
  assert(green.live_dropin_bytes.includes(line), line);
}
for (const line of [
  "Environment=VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED=1",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED=0",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED=0",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED=0",
  "Environment=VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED=0",
]) {
  assert(green.dormant_dropin_bytes.includes(line), line);
}

const incompleteInventory =
  evaluateGateSourceInventoryV1(gateSources.slice(0, 2));
assert.equal(incompleteInventory.unreviewed.length, 0);
assert.equal(incompleteInventory.complete, false);

const incompleteHold =
  await evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
    snapshot({
      gate_sources: gateSources.slice(0, 2),
      runtime_status: {},
      postgres_qualification: {},
    }),
    activationContract,
  );
assert.equal(incompleteHold.status, "HOLD_GATE_SOURCE_INVENTORY_INCOMPLETE");
assert.equal(incompleteHold.activation_ready, false);
assert.equal(incompleteHold.gate_source_inventory_complete, false);
assert.equal(incompleteHold.credential_read_performed, false);
assert.equal(incompleteHold.database_connection_performed, false);

const lateDormant = {
  path: "/home/zoso/.config/systemd/user/void-node-live.service.d/~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~BUY-VOID-PK-DORMANT-V1.conf",
  sha256: "a".repeat(64),
  assignments: {
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED: "0",
    VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED: "0",
  },
};
const hold =
  await evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
    snapshot({
      gate_sources: [...structuredClone(gateSources), lateDormant],
      runtime_status: {},
      postgres_qualification: {},
    }),
    activationContract,
  );
assert.equal(hold.status, "HOLD_UNRECONCILED_GATE_ASSIGNMENT_SOURCES");
assert.equal(hold.activation_ready, false);
assert.equal(hold.unreviewed_gate_sources.length, 1);
assert.equal(hold.unreviewed_gate_sources[0].path, lateDormant.path);
assert.equal(hold.gate_source_inventory_complete, false);
assert.equal(hold.credential_read_performed, false);
assert.equal(hold.database_connection_performed, false);

const wrongKnownHash = structuredClone(gateSources);
wrongKnownHash[1].sha256 = "b".repeat(64);
const wrongHashInventory = evaluateGateSourceInventoryV1(wrongKnownHash);
assert.equal(wrongHashInventory.reviewed.length, 2);
assert.equal(wrongHashInventory.unreviewed.length, 1);

await assert.rejects(
  () =>
    evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
      snapshot({
        host: {
          ...snapshot().host,
          head_sha: "0".repeat(40),
        },
      }),
      activationContract,
    ),
  /host_source_or_service_alignment_required/u,
);

await assert.rejects(
  () =>
    evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
      snapshot({
        process_gates: {
          ...dormant,
          full_runtime: "1",
        },
      }),
      activationContract,
    ),
  /configured_or_process_gate_state_not_dormant/u,
);

await assert.rejects(
  () =>
    evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
      snapshot({
        runtime_status: {
          ...runtimeStatus,
          history_carrier_activation_ready: false,
        },
      }),
      activationContract,
    ),
  /runtime_status_not_activation_ready_dormant/u,
);

await assert.rejects(
  () =>
    evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
      snapshot({
        postgres_qualification: {
          ...postgresQualification,
          schema_fingerprint_sha256: "f".repeat(64),
        },
      }),
      activationContract,
    ),
  /postgres_qualification_invalid/u,
);

await assert.rejects(
  () =>
    evaluateVoidBuyVoidPrecisionAtomicActivationPreflightV1(
      snapshot({
        runtime_status: {
          ...runtimeStatus,
          root_dir: "/tmp/not-the-canonical-buy-void-root",
        },
      }),
      activationContract,
    ),
  /runtime_status_not_activation_ready_dormant/u,
);

const toolSource = fs.readFileSync(
  "tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "systemctl --user daemon-reload",
  "systemctl --user restart",
  "systemctl --user stop",
  "systemctl --user start",
  "eth_sendRawTransaction",
  "sign_transaction",
  "new Wallet(",
]) {
  assert.equal(toolSource.includes(forbidden), false, forbidden);
}

const wrapperSource = fs.readFileSync(
  "ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh",
  "utf8",
);
const inventoryPosition = wrapperSource.indexOf(
  '--gate-sources "$gate_sources_json"',
);
const qualifierPosition = wrapperSource.indexOf(
  "postgres_requalification_credential_read_inside_reviewed_factory=true",
);
assert(inventoryPosition >= 0);
assert(qualifierPosition > inventoryPosition);
assert(
  wrapperSource.includes(
    'expected_tool_blob="4b39fbf8eda9053d8bca0765fb1525e6af3491f3"',
  ),
  "preflight tool blob pin missing",
);
assert(
  wrapperSource.includes("preflight_tool_blob_mismatch"),
  "preflight tool mismatch HOLD missing",
);
for (const forbidden of [
  "systemctl --user daemon-reload",
  "systemctl --user restart",
  "systemctl --user stop",
  "systemctl --user start",
  "mv ",
  "cp ",
  "install ",
]) {
  assert.equal(wrapperSource.includes(forbidden), false, forbidden);
}

const workflow = fs.readFileSync(
  ".github/workflows/buy-void-precision-atomic-activation-preflight-v1.yml",
  "utf8",
);
const workflowDependencies = [
  ".github/workflows/buy-void-precision-atomic-activation-preflight-v1.yml",
  "docs/operators/buy-void-precision-atomic-activation-preflight-v1.md",
  "ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh",
  "scripts/prove_buy_void_precision_atomic_activation_preflight_v1.mjs",
  "tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json",
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  "ops/precision/void_precision_buy_void_postgres_host_qualification_v1.sh",
  "tools/void-precision-buy-void-postgres-host-qualification-v1.mjs",
  "ops/systemd/void-node-live.service.d/91-buy-void-payment-keyed-production-dormant-v1.conf.example",
  "ops/systemd/void-node-live.service.d/94-buy-void-claimed-postgres-precision-reconcile-v1.conf.example",
  "src/economic/buy_void_runtime_integration_v1.ts",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_connection_factory_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_schema_admission_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_store_v1.ts",
  "package.json",
  "package-lock.json",
];
const prStart = workflow.indexOf("  pull_request:\n");
const pushStart = workflow.indexOf("  push:\n");
const permissionsStart = workflow.indexOf("\npermissions:\n");
assert(prStart >= 0 && pushStart > prStart && permissionsStart > pushStart);
const prBlock = workflow.slice(prStart, pushStart);
const pushBlock = workflow.slice(pushStart, permissionsStart);
for (const dependency of workflowDependencies) {
  const token = `- "${dependency}"`;
  assert.equal(
    prBlock.split(token).length - 1,
    1,
    `PR trigger mismatch: ${dependency}`,
  );
  assert.equal(
    pushBlock.split(token).length - 1,
    1,
    `push trigger mismatch: ${dependency}`,
  );
}
assert.match(workflow, /uses: actions\/checkout@[0-9a-f]{40}/u);
assert.match(workflow, /uses: actions\/setup-node@[0-9a-f]{40}/u);
assert.doesNotMatch(
  workflow,
  /uses: actions\/(?:checkout|setup-node)@v[0-9]/u,
);
assert.match(workflow, /persist-credentials:\s*false/u);
assert.match(workflow, /fetch-depth:\s*0/u);
for (const required of [
  "npm ci --ignore-scripts --no-audit --no-fund",
  "bash -n ops/precision/void_precision_buy_void_atomic_activation_preflight_v1.sh",
  "node --check tools/void-buy-void-precision-atomic-activation-preflight-v1.mjs",
  "node --check scripts/prove_buy_void_precision_atomic_activation_preflight_v1.mjs",
  "npm exec -- tsx scripts/prove_buy_void_precision_atomic_activation_preflight_v1.mjs",
  "npm run typecheck",
]) {
  assert(workflow.includes(required), required);
}

console.log(
  "VOID_BUY_VOID_PRECISION_ATOMIC_ACTIVATION_PREFLIGHT_V1_PROOF_GREEN",
);
console.log("reviewed_gate_inventory_green=true");
console.log("complete_gate_inventory_required_green=true");
console.log("late_dormant_override_hold_green=true");
console.log("credential_read_blocked_before_inventory_green=true");
console.log("preflight_tool_blob_pin_green=true");
console.log("configured_process_dormant_match_green=true");
console.log("runtime_policy_fingerprints_bound_green=true");
console.log("canonical_runtime_root_bound_green=true");
console.log("postgres_qualification_fingerprints_bound_green=true");
console.log("atomic_live_generation_derived_green=true");
console.log("atomic_dormant_generation_derived_green=true");
console.log("exact_live_dropin_bytes_derived_green=true");
console.log("exact_dormant_dropin_bytes_derived_green=true");
console.log("focused_workflow_self_enforcement_green=true");
console.log("activation_authorized=false");
console.log("runtime_gate_mutation=false");
console.log("service_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
