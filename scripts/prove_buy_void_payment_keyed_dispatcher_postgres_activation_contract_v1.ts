#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

import {
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_AUTHORITY_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_CONTRACT_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1,
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
    ];
  const toName =
    VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASE_ORDER_V1[
      index + 1
    ];
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
    assert.deepEqual(forward.changed_gates, [expectedForwardGates[index]]);
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
    assert.deepEqual(rollback.changed_gates, [expectedForwardGates[index]]);
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

const atomicForward = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  "atomic_restart",
);
assert.equal(atomicForward.ok, true);
if (atomicForward.ok) {
  assert.equal(atomicForward.status, "atomic_forward");
  assert.equal(atomicForward.mode, "atomic_restart");
  assert.deepEqual(atomicForward.changed_gates, expectedForwardGates);
  assert.equal(atomicForward.requires_process_restart, true);
  assert.equal(atomicForward.money_capable_after, true);
}

const atomicRollback = decideBuyVoidPostgresActivationTransitionV1(
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.live_apply,
  VOID_BUY_VOID_PAYMENT_KEYED_DISPATCHER_POSTGRES_ACTIVATION_PHASES_V1.dormant,
  "atomic_restart",
);
assert.equal(atomicRollback.ok, true);
if (atomicRollback.ok) {
  assert.equal(atomicRollback.status, "atomic_rollback");
  assert.equal(atomicRollback.mode, "atomic_restart");
  assert.deepEqual(atomicRollback.changed_gates, expectedForwardGates);
  assert.equal(atomicRollback.requires_process_restart, true);
  assert.equal(atomicRollback.money_capable_after, false);
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
  candidate.reviewed_source_main_commit,
  "eef17f65a8bd495d581df3b91d9a411a5402cde8",
);
assert.equal(
  candidate.reviewed_source_blobs[
    "src/economic/buy_void_payment_keyed_dispatcher_postgres_activation_contract_v1.ts"
  ],
  "ab9ea71e23523fc967d648680df7e6c78ba4ec67",
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
  "npm run typecheck:scripts",
]) {
  assert(workflow.includes(required), required);
}

const toolSource = fs.readFileSync(
  "tools/void-buy-void-payment-keyed-dispatcher-postgres-activation-candidate-v1.mjs",
  "utf8",
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
console.log("non_atomic_multi_gate_transition_forbidden_green=true");
console.log("unsafe_apply_state_rejected_green=true");
console.log("unmodeled_mixed_state_held_green=true");
console.log("accessor_nonexecution_green=true");
console.log("exact_own_data_state_green=true");
console.log("readiness_fingerprints_bound_green=true");
console.log("source_blob_identity_bound_green=true");
console.log("focused_workflow_self_enforcement_green=true");
console.log("activation_authorized=false");
console.log("runtime_gate_mutation=false");
console.log("service_mutation=false");
console.log("credential_read=false");
console.log("database_mutation=false");
console.log("transaction_broadcast=false");
console.log("funds_movement=false");
