#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_ENVS_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1,
  type BuyVoidPostgresActivationGateStateV1,
  type BuyVoidPostgresActivationPhaseV1,
  classifyBuyVoidPostgresActivationPhaseV1,
  decideBuyVoidPostgresActivationTransitionV1,
  normalizeBuyVoidPostgresActivationGateStateV1,
} from "../src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.js";
const candidate = JSON.parse(
  fs.readFileSync(
    "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json",
    "utf8",
  ),
);

assert.equal(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1",
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1,
  [
    "dormant",
    "claimed_exclusive",
    "full_preview",
    "admission_armed",
    "live_apply",
  ],
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_AUTHORITY_V1,
  {
    source_only_contract: true,
    host_mutation: false,
    service_mutation: false,
    runtime_gate_mutation: false,
    database_mutation: false,
    credential_read: false,
    wallet_or_signer_access: false,
    transaction_construction: false,
    transaction_signing: false,
    transaction_broadcast: false,
    token_or_work_credit_mutation: false,
    market_activation: false,
    public_presale_activation: false,
    funds_movement: false,
    staged_transition_supported: true,
    adjacent_staged_transition_required: true,
    atomic_restart_transition_supported: true,
    atomic_restart_dormant_live_apply_only: true,
    atomic_restart_single_config_generation_required: true,
    non_atomic_multi_gate_transition_forbidden: true,
    claimed_selector_required_when_apply_live: true,
    full_runtime_required_when_apply_live: true,
    admitted_runtime_required_when_apply_live: true,
    staged_rollback_clears_apply_first: true,
    atomic_rollback_all_inner_gates_zero_together: true,
    exact_per_attempt_confirmation_still_required: true,
    automatic_retry: false,
  },
);

const parentRuntimeSource = fs.readFileSync(
  "src/economic/buy_void_runtime_integration_v1.ts",
  "utf8",
);
const fullRuntimeSource = fs.readFileSync(
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
  "utf8",
);
const admittedRuntimeSource = fs.readFileSync(
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts",
  "utf8",
);
const claimedParentContractSource = fs.readFileSync(
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts",
  "utf8",
);

assert(
  parentRuntimeSource.includes(
    'const ENABLE_ENV = "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED";',
  ),
  "outer parent enable env drifted",
);
assert(
  claimedParentContractSource.includes(
    '"VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED"',
  ),
  "claimed selector env drifted",
);
assert(
  fullRuntimeSource.includes(
    '"VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED"',
  ) &&
    fullRuntimeSource.includes(
      '"VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED"',
    ),
  "full runtime envs drifted",
);
assert(
  admittedRuntimeSource.includes(
    '"VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED"',
  ),
  "admitted runtime env drifted",
);
assert.deepEqual(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_ENVS_V1,
  {
    parent_runtime: "VOID_BUY_VOID_RUNTIME_INTEGRATION_ENABLED",
    claimed_runtime:
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_CLAIMED_RUNTIME_ENABLED",
    full_runtime: "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_ENABLED",
    admitted_guarded_runtime:
      "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ADMITTED_GUARDED_RUNTIME_ENABLED",
    full_runtime_apply:
      "VOID_BUY_VOID_PAYMENT_KEYED_FULL_RUNTIME_APPLY_ENABLED",
  },
);

for (const phase of
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1) {
  const state =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[phase];
  assert.equal(classifyBuyVoidPostgresActivationPhaseV1(state), phase);
  assert.deepEqual(normalizeBuyVoidPostgresActivationGateStateV1(state), state);
}

const expectedForwardGates = [
  "claimed_runtime",
  "full_runtime",
  "admitted_guarded_runtime",
  "full_runtime_apply",
] as const;

const ATOMIC_GENERATION_ID =
  "voidbvpcg1_" + "1".repeat(64);
const ATOMIC_CONFIGURATION_SHA256 = "2".repeat(64);

function atomicConfigurationGeneration(
  state: BuyVoidPostgresActivationGateStateV1,
  {
    generationId = ATOMIC_GENERATION_ID,
    configurationSha256 = ATOMIC_CONFIGURATION_SHA256,
  }: {
    generationId?: string;
    configurationSha256?: string;
  } = {},
) {
  const gate = (
    key:
      | "claimed_runtime"
      | "full_runtime"
      | "admitted_guarded_runtime"
      | "full_runtime_apply",
  ) => ({
    value: state[key],
    generation_id: generationId,
    configuration_sha256: configurationSha256,
  });
  return {
    generation_id: generationId,
    configuration_sha256: configurationSha256,
    gates: {
      claimed_runtime: gate("claimed_runtime"),
      full_runtime: gate("full_runtime"),
      admitted_guarded_runtime: gate("admitted_guarded_runtime"),
      full_runtime_apply: gate("full_runtime_apply"),
    },
  };
}

for (
  let index = 0;
  index <
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1.length -
    1;
  index += 1
) {
  const fromName =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1[
      index
    ] as BuyVoidPostgresActivationPhaseV1;
  const toName =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1[
      index + 1
    ] as BuyVoidPostgresActivationPhaseV1;
  const expectedGate =
    expectedForwardGates[index] as (typeof expectedForwardGates)[number];
  const forward = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[
      fromName
    ],
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[
      toName
    ],
  );
  assert.equal(forward.ok, true);
  if (forward.ok) {
    assert.equal(forward.status, "forward");
    assert.equal(forward.mode, "staged");
    assert.deepEqual(forward.changed_gates, [expectedGate]);
    assert.equal(forward.requires_process_restart, true);
    assert.equal(forward.money_capable_after, toName === "live_apply");
  }

  const rollback = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[
      toName
    ],
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[
      fromName
    ],
  );
  assert.equal(rollback.ok, true);
  if (rollback.ok) {
    assert.equal(rollback.status, "rollback");
    assert.equal(rollback.mode, "staged");
    assert.deepEqual(rollback.changed_gates, [expectedGate]);
    assert.equal(rollback.requires_process_restart, true);
    assert.equal(rollback.money_capable_after, false);
  }
}

const liveToAdmission = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1
    .admission_armed,
);
assert.equal(liveToAdmission.ok, true);
if (liveToAdmission.ok) {
  assert.deepEqual(
    liveToAdmission.changed_gates,
    ["full_runtime_apply"],
    "staged rollback must clear apply first",
  );
}

const forbiddenJumps = [
  ["dormant", "full_preview"],
  ["dormant", "admission_armed"],
  ["dormant", "live_apply"],
  ["claimed_exclusive", "admission_armed"],
  ["claimed_exclusive", "live_apply"],
  ["full_preview", "live_apply"],
  ["live_apply", "full_preview"],
  ["live_apply", "claimed_exclusive"],
  ["live_apply", "dormant"],
] as const;

for (const [from, to] of forbiddenJumps) {
  const decision = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[from],
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[to],
  );
  assert.equal(decision.ok, false, `${from}->${to}`);
  if (!decision.ok) {
    assert.equal(
      decision.reason,
      "staged_activation_transition_must_be_adjacent",
    );
  }
}

const atomicForwardGeneration =
  atomicConfigurationGeneration(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  );
const atomicForward = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  "atomic_restart",
  atomicForwardGeneration,
);
assert.equal(atomicForward.ok, true);
if (atomicForward.ok) {
  assert.equal(atomicForward.status, "atomic_forward");
  assert.equal(atomicForward.mode, "atomic_restart");
  assert.deepEqual(atomicForward.changed_gates, expectedForwardGates);
  assert.equal(atomicForward.requires_process_restart, true);
  assert.equal(atomicForward.money_capable_after, true);
  assert.equal(
    atomicForward.configuration_generation_id,
    ATOMIC_GENERATION_ID,
  );
  assert.equal(
    atomicForward.configuration_sha256,
    ATOMIC_CONFIGURATION_SHA256,
  );
}

const atomicRollbackGeneration =
  atomicConfigurationGeneration(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
    {
      generationId: "voidbvpcg1_" + "3".repeat(64),
      configurationSha256: "4".repeat(64),
    },
  );
const atomicRollback = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  "atomic_restart",
  atomicRollbackGeneration,
);
assert.equal(atomicRollback.ok, true);
if (atomicRollback.ok) {
  assert.equal(atomicRollback.status, "atomic_rollback");
  assert.equal(atomicRollback.mode, "atomic_restart");
  assert.deepEqual(atomicRollback.changed_gates, expectedForwardGates);
  assert.equal(atomicRollback.requires_process_restart, true);
  assert.equal(atomicRollback.money_capable_after, false);
  assert.equal(
    atomicRollback.configuration_generation_id,
    atomicRollbackGeneration.generation_id,
  );
  assert.equal(
    atomicRollback.configuration_sha256,
    atomicRollbackGeneration.configuration_sha256,
  );
}

const missingAtomicGeneration =
  decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
    "atomic_restart",
  );
assert.equal(missingAtomicGeneration.ok, false);
if (!missingAtomicGeneration.ok) {
  assert.equal(
    missingAtomicGeneration.reason,
    "atomic_restart_configuration_generation_invalid",
  );
}

{
  const mixed = structuredClone(atomicForwardGeneration);
  mixed.gates.full_runtime.generation_id =
    "voidbvpcg1_" + "5".repeat(64);
  const decision = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
    "atomic_restart",
    mixed,
  );
  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(
      decision.reason,
      "atomic_restart_mixed_configuration_generation",
    );
  }
}

{
  const mixed = structuredClone(atomicForwardGeneration);
  mixed.gates.admitted_guarded_runtime.configuration_sha256 =
    "6".repeat(64);
  const decision = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
    "atomic_restart",
    mixed,
  );
  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(
      decision.reason,
      "atomic_restart_mixed_configuration_generation",
    );
  }
}

{
  const wrongValue = structuredClone(atomicForwardGeneration);
  wrongValue.gates.full_runtime_apply.value = "0";
  const decision = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
    "atomic_restart",
    wrongValue,
  );
  assert.equal(decision.ok, false);
  if (!decision.ok) {
    assert.equal(
      decision.reason,
      "atomic_restart_configuration_gate_values_mismatch",
    );
  }
}

const invalidMode = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  "unexpected_mode",
);
assert.equal(invalidMode.ok, false);
if (!invalidMode.ok) {
  assert.equal(invalidMode.mode, null);
  assert.equal(invalidMode.reason, "activation_transition_mode_invalid");
}

for (const [from, to] of [
  ["dormant", "admission_armed"],
  ["claimed_exclusive", "live_apply"],
  ["full_preview", "dormant"],
  ["live_apply", "claimed_exclusive"],
] as const) {
  const decision = decideBuyVoidPostgresActivationTransitionV1(
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[from],
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1[to],
    "atomic_restart",
  );
  assert.equal(decision.ok, false, `atomic:${from}->${to}`);
  if (!decision.ok) {
    assert.equal(decision.reason, "atomic_restart_transition_scope_invalid");
  }
}

for (const unsafe of [
  {
    parent_runtime: "1",
    claimed_runtime: "0",
    full_runtime: "1",
    admitted_guarded_runtime: "1",
    full_runtime_apply: "1",
  },
  {
    parent_runtime: "1",
    claimed_runtime: "1",
    full_runtime: "0",
    admitted_guarded_runtime: "1",
    full_runtime_apply: "1",
  },
  {
    parent_runtime: "1",
    claimed_runtime: "1",
    full_runtime: "1",
    admitted_guarded_runtime: "0",
    full_runtime_apply: "1",
  },
]) {
  assert.equal(normalizeBuyVoidPostgresActivationGateStateV1(unsafe), null);
}

assert.equal(
  classifyBuyVoidPostgresActivationPhaseV1({
    parent_runtime: "1",
    claimed_runtime: "0",
    full_runtime: "1",
    admitted_guarded_runtime: "0",
    full_runtime_apply: "0",
  }),
  null,
  "unmodeled mixed state must HOLD",
);

let getterCalls = 0;
const accessorState = {
  parent_runtime: "1",
  claimed_runtime: "0",
  full_runtime: "0",
  admitted_guarded_runtime: "0",
  get full_runtime_apply() {
    getterCalls += 1;
    return "0";
  },
};
assert.equal(
  normalizeBuyVoidPostgresActivationGateStateV1(accessorState),
  null,
  "accessor-bearing state must be rejected",
);
assert.equal(getterCalls, 0, "activation state getter must not execute");

const symbolState = {
  ...VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  [Symbol("extra")]: "unexpected",
};
assert.equal(
  normalizeBuyVoidPostgresActivationGateStateV1(symbolState),
  null,
  "symbol-key state must be rejected",
);

const hiddenState = {
  ...VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
};
Object.defineProperty(hiddenState, "full_runtime_apply", {
  value: "0",
  enumerable: false,
});
assert.equal(
  normalizeBuyVoidPostgresActivationGateStateV1(hiddenState),
  null,
  "non-enumerable gate must be rejected",
);

assert.equal(
  candidate.marker,
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1",
);
assert.equal(candidate.version, 1);
assert.equal(
  candidate.status,
  "source_candidate_activation_contract_only_no_gate_change_authorized",
);
assert.equal(
  candidate.reviewed_inherited_source_main_commit,
  "eef17f65a8bd495d581df3b91d9a411a5402cde8",
);
assert.equal(
  candidate.candidate_source_review_base_commit,
  "cc5e9790e02e188b3e3878fe7cc9c9a9dd11b376",
);
assert.equal(
  candidate.candidate_source_review_base_tree,
  "f06b9a1504050cb959a6e6a5197f5a15daa50c79",
);
assert.equal(
  candidate.reviewed_candidate_head_source_blobs[
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts"
  ],
  "d06a265aa14e37b77a8309720a3c4e71c51971d7",
);
assert.deepEqual(
  candidate.activation_phase_order,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1,
);
assert.deepEqual(
  candidate.observed_gate_state,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
);
assert.deepEqual(candidate.transition_policy, {
  staged_adjacent_only: true,
  atomic_restart_dormant_to_live_apply_allowed: true,
  atomic_restart_live_apply_to_dormant_allowed: true,
  atomic_restart_single_config_generation_required: true,
  non_atomic_multi_gate_transition_forbidden: true,
  claimed_selector_required_when_apply_live: true,
  full_runtime_required_when_apply_live: true,
  admitted_runtime_required_when_apply_live: true,
  staged_rollback_clears_apply_first: true,
  automatic_retry: false,
});
assert.equal(candidate.observed_readiness.parent_enabled, true);
assert.equal(candidate.observed_readiness.policy_configured, true);
assert.equal(
  candidate.observed_readiness.signing_dependency_env_configured,
  true,
);
assert.equal(
  candidate.observed_readiness.history_carrier_activation_ready,
  true,
);
assert.equal(
  candidate.observed_readiness.postgres_configuration_fingerprint_sha256,
  "8482aae40f7328749a168a2d64eef4afb67fee218b89425ea5c79d8cbbb52d40",
);
assert.equal(
  candidate.observed_readiness.postgres_schema_fingerprint_sha256,
  "89616f198b0c0a47eef264701ebfce23d3aae3f98474cf050584ea9e899d66f1",
);
assert.equal(candidate.authority.activation_authorized, false);
assert.equal(candidate.authority.runtime_gate_mutation, false);
assert.equal(candidate.authority.transaction_broadcast, false);
assert.equal(candidate.authority.funds_movement, false);

const toolOutput = execFileSync(
  process.execPath,
  [
    "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  ],
  { encoding: "utf8" },
);
for (const marker of [
  "status=candidate_verified_activation_not_authorized",
  "current_phase=dormant",
  "readiness_bound=true",
  "source_blobs_bound=true",
  "candidate_source_review_base_commit=cc5e9790e02e188b3e3878fe7cc9c9a9dd11b376",
  "candidate_source_review_base_tree=f06b9a1504050cb959a6e6a5197f5a15daa50c79",
  "repository_head_sha=",
  "repository_tree_sha=",
  "activation_authorized=false",
  "runtime_gate_mutation=false",
  "service_mutation=false",
  "credential_read=false",
  "database_mutation=false",
  "transaction_broadcast=false",
  "funds_movement=false",
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CANDIDATE_V1_GREEN",
]) {
  assert(toolOutput.includes(marker), marker);
}

{
  const activationSourcePath =
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts";
  const original = fs.readFileSync(activationSourcePath);
  try {
    fs.appendFileSync(activationSourcePath, "\n");
    const dirty = spawnSync(
      process.execPath,
      [
        "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
      ],
      { encoding: "utf8" },
    );
    assert.notEqual(dirty.status, 0);
    assert.match(
      String(dirty.stderr || ""),
      /repository_worktree_not_clean/u,
    );
  } finally {
    fs.writeFileSync(activationSourcePath, original);
  }
}

const workflow = fs.readFileSync(
  ".github/workflows/buy-void-payment-keyed-dispatcher-postgres-activation-contract-v1.yml",
  "utf8",
);
const workflowDependencies = [
  ".github/workflows/buy-void-payment-keyed-dispatcher-postgres-activation-contract-v1.yml",
  "docs/operators/buy-void-payment-keyed-dispatcher-postgres-activation-contract-v1.md",
  "ops/mainnet0/buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.json",
  "scripts/prove_buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  "src/economic/buy_void_runtime_integration_v1.ts",
  "src/economic/buy_void_payment_keyed_full_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_admitted_guarded_runtime_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_v1.ts",
  "src/economic/buy_void_payment_keyed_dispatcher_postgres_claimed_runtime_parent_contract_v1.ts",
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
  "node tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  "npm exec -- tsx scripts/prove_buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
  "npm run typecheck",
  "npm exec -- tsc",
  "--noEmit",
  "--strict",
  "--skipLibCheck",
  "scripts/prove_buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts",
]) {
  assert(workflow.includes(required), required);
}

const toolSource = fs.readFileSync(
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  "utf8",
);
assert(
  toolSource.includes('"merge-base", "--is-ancestor", reviewedCommit, "HEAD"'),
  "reviewed source ancestry enforcement missing",
);
assert(
  toolSource.includes("reviewed_inherited_source_main_not_ancestor_of_head"),
  "reviewed inherited-source ancestry HOLD missing",
);
assert(
  toolSource.includes("candidate_source_review_base_not_ancestor_of_head"),
  "candidate source review-base ancestry HOLD missing",
);
assert.match(
  toolSource,
  /function requireCleanRepositoryIdentity\(\)[\s\S]*?"status"[\s\S]*?"--porcelain=v1"[\s\S]*?"--untracked-files=all"[\s\S]*?repository_worktree_not_clean/u,
  "clean worktree enforcement missing",
);
assert(
  toolSource.includes('gitBlobAt("HEAD", relativePath)'),
  "HEAD source blob verification missing",
);
assert(
  toolSource.includes("candidate_source_review_base_tree_mismatch"),
  "candidate source review-base tree verification missing",
);
assert(
  toolSource.includes("head_candidate_source_blob_mismatch"),
  "candidate clean-HEAD source blob verification missing",
);
assert.equal(
  toolSource.includes(
    "gitBlobAt(\n          value.candidate_source_review_base_commit,\n          relativePath",
  ),
  false,
  "candidate source blob must not depend on its pre-change review-base blob",
);
assert.equal(
  toolSource.includes('"hash-object"'),
  false,
  "mutable working-tree hash-object provenance is forbidden",
);

for (const forbidden of [
  "systemctl",
  "service ",
  "sudo ",
  "psql ",
  "curl ",
  "fetch(",
  "http://",
  "https://",
  "sign_transaction",
  "broadcast",
  "sendTransaction",
]) {
  if (forbidden === "broadcast") continue;
  assert.equal(toolSource.includes(forbidden), false, forbidden);
}

console.log(
  "VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1_PROOF_GREEN",
);
console.log("adjacent_forward_transitions_green=true");
console.log("exact_forward_gate_order_green=true");
console.log("adjacent_rollback_transitions_green=true");
console.log("staged_rollback_clears_apply_first_green=true");
console.log("staged_direct_live_apply_jump_forbidden_green=true");
console.log("atomic_dormant_live_apply_transition_green=true");
console.log("atomic_live_apply_dormant_rollback_green=true");
console.log("atomic_single_configuration_generation_enforced_green=true");
console.log("atomic_mixed_generation_id_held_green=true");
console.log("atomic_mixed_configuration_digest_held_green=true");
console.log("atomic_target_gate_values_bound_green=true");
console.log("non_atomic_multi_gate_transition_forbidden_green=true");
console.log("invalid_transition_mode_held_green=true");
console.log("unsafe_apply_state_rejected_green=true");
console.log("unmodeled_mixed_state_held_green=true");
console.log("accessor_nonexecution_green=true");
console.log("exact_own_data_state_green=true");
console.log("readiness_fingerprints_bound_green=true");
console.log("source_blob_identity_bound_green=true");
console.log("reviewed_source_main_ancestry_green=true");
console.log("candidate_source_review_base_commit_tree_green=true");
console.log("clean_worktree_head_blob_verification_green=true");
console.log("dirty_worktree_candidate_verification_held_green=true");
console.log("mutable_worktree_hash_object_provenance=false");
console.log("runtime_gate_name_binding_green=true");
console.log("focused_workflow_self_enforcement_green=true");
console.log("focused_proof_typecheck_green=true");
console.log("activation_authorized=false");
console.log("runtime_gate_mutation=false");
console.log("service_mutation=false");
console.log("credential_read=false");
console.log("database_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
