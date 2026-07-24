import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactLane = [
  ".github/workflows/buy-void-observe-and-claim-fixture-canary-gate-v1.yml",
  "docs/operators/buy-void-observe-and-claim-fixture-canary-gate-v1.md",
  "fixtures/buy-void/observe-and-claim-fixture-canary-gate-v1.example.json",
  "schemas/buy-void-observe-and-claim-fixture-canary-gate-v1.schema.json",
  "scripts/prove_buy_void_observe_and_claim_fixture_canary_gate_fixture_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_fixture_canary_gate_guard_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_fixture_canary_gate_v1.ts",
  "src/economic/buy_void_observe_and_claim_fixture_canary_gate_v1.ts",
];

for (const relative of exactLane) {
  assert.equal(
    fs.existsSync(path.join(root, relative)),
    true,
    `missing ${relative}`,
  );
}

const source = fs.readFileSync(
  path.join(
    root,
    "src/economic/"
      + "buy_void_observe_and_claim_fixture_canary_gate_v1.ts",
  ),
  "utf8",
);
const orchestratorRuntime = fs.readFileSync(
  path.join(
    root,
    "src/economic/"
      + "buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  ),
  "utf8",
);
const runtimeIntegration = fs.readFileSync(
  path.join(
    root,
    "src/economic/buy_void_runtime_integration_v1.ts",
  ),
  "utf8",
);

for (const marker of [
  "fixture_only_v1: true",
  "live_activation_mounted_v1: false",
  "disabled_by_default: true",
  "default_enabled_stage_count: 0",
  "default_exact_request_allowlist_count: 0",
  'candidate_stage: "observe_and_claim"',
  "allowed_stage_count_when_armed: 1",
  "exact_request_allowlist_required: true",
  "exact_request_allowlist_count_when_armed: 1",
  "server_derived_activation_plan_required: true",
  "exact_plan_fingerprint_echo_required: true",
  "exact_orchestrator_confirmation_required: true",
  "exact_delegated_confirmation_required: true",
  "exact_stage_confirmation_required: true",
  "exact_canary_confirmation_required: true",
  "maximum_successful_canary_mutations: 1",
  "automatic_retry: false",
  "auto_disable_after_terminal_outcome: true",
  "inventory_reservation: false",
  "execution_attempt_reservation: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "rpc_mutation: false",
  "money_movement: false",
  "background_loop: false",
  "startup_execution: false",
  "filesystem_write: false",
  '"observe_and_claim_canary_disabled"',
  '"exact_one_request_allowlist_required"',
  '"request_not_canary_allowlisted"',
  '"maximum_successful_canary_mutations_reached"',
]) {
  assert.equal(
    source.includes(marker),
    true,
    `fixture canary source missing ${marker}`,
  );
}

for (const forbidden of [
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
  "fs.writeFile",
  "fs.appendFile",
  "fetch(",
  "axios",
  "ethers",
  "web3",
]) {
  assert.equal(
    source.includes(forbidden),
    false,
    `fixture canary source contains ${forbidden}`,
  );
}

const moduleName =
  "buy_void_observe_and_claim_fixture_canary_gate_v1";

assert.equal(
  orchestratorRuntime.includes(moduleName),
  false,
  "fixture-only canary must not be mounted in orchestrator runtime",
);
assert.equal(
  runtimeIntegration.includes(moduleName),
  false,
  "fixture-only canary must not be mounted in runtime integration",
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("fixture_only=1");
console.log("live_activation_mounted=0");
console.log("default_enabled_stage_count=0");
console.log("default_exact_request_allowlist_count=0");
console.log("runtime_import_count=0");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("filesystem_write=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
