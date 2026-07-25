import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const exactLane = [
  ".github/workflows/buy-void-observe-and-claim-candidate-watch-v1.yml",
  "docs/operators/buy-void-observe-and-claim-candidate-watch-v1.md",
  "examples/systemd/void-buy-void-observe-and-claim-candidate-watch-v1.service",
  "examples/systemd/void-buy-void-observe-and-claim-candidate-watch-v1.timer",
  "scripts/buy_void_observe_and_claim_candidate_watch_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_candidate_watch_guard_v1.ts",
  "scripts/prove_buy_void_observe_and_claim_candidate_watch_v1.ts",
  "src/economic/buy_void_observe_and_claim_candidate_watch_v1.ts",
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
      + "buy_void_observe_and_claim_candidate_watch_v1.ts",
  ),
  "utf8",
);
const cli = fs.readFileSync(
  path.join(
    root,
    "scripts/"
      + "buy_void_observe_and_claim_candidate_watch_v1.ts",
  ),
  "utf8",
);
const service = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/"
      + "void-buy-void-observe-and-claim-candidate-watch-v1.service",
  ),
  "utf8",
);
const timer = fs.readFileSync(
  path.join(
    root,
    "examples/systemd/"
      + "void-buy-void-observe-and-claim-candidate-watch-v1.timer",
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
const boundedRuntime = fs.readFileSync(
  path.join(
    root,
    "src/economic/"
      + "buy_void_bounded_auto_fulfillment_orchestrator_runtime_v1.ts",
  ),
  "utf8",
);
const index = fs.readFileSync(
  path.join(root, "src/index.ts"),
  "utf8",
);

for (const marker of [
  "network_state_write: false",
  "operator_local_state_write: true",
  "runtime_import_mounted: false",
  "apply_requested: false",
  "inventory_reservation: false",
  "execution_attempt_reservation: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "rpc_mutation: false",
  "money_movement: false",
  "background_loop: false",
  "startup_execution: false",
  '"multiple_eligible_candidates_require_operator_selection"',
  '"exact_one_candidate_already_alerted"',
  '"review_exact_one_candidate_for_separate_arming_lane"',
  '"buyVoidArmExactObserveAndClaimCanary"',
]) {
  assert.equal(
    source.includes(marker),
    true,
    `watch source missing ${marker}`,
  );
}

for (const marker of [
  "writeJsonAtomic",
  "writeJsonExclusive",
  "current-state.json",
  "alerts",
  "candidate readiness CLI failed",
  "activation_performed=false",
  "network_state_write=false",
  "money_movement=false",
]) {
  assert.equal(
    cli.includes(marker),
    true,
    `watch CLI missing ${marker}`,
  );
}

for (const forbidden of [
  "apply: true",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
  "credential",
  "setInterval(",
  "while (true)",
  "for (;;)",
]) {
  assert.equal(
    source.includes(forbidden) || cli.includes(forbidden),
    false,
    `watch lane contains forbidden ${forbidden}`,
  );
}

const moduleName =
  "buy_void_observe_and_claim_candidate_watch_v1";

for (const [label, text] of [
  ["runtime integration", runtimeIntegration],
  ["bounded runtime", boundedRuntime],
  ["index", index],
] as const) {
  assert.equal(
    text.includes(moduleName),
    false,
    `${label} imports watch module`,
  );
}

assert.equal(
  service.includes("Type=oneshot"),
  true,
);
assert.equal(
  service.includes("systemctl"),
  false,
);
assert.equal(
  service.includes("--state-dir"),
  true,
);
assert.equal(
  service.includes("ProtectSystem=strict"),
  true,
);
assert.equal(
  service.includes("NoNewPrivileges=true"),
  true,
);
assert.equal(
  timer.includes("OnUnitActiveSec=2min"),
  true,
);
assert.equal(
  timer.includes("Persistent=true"),
  true,
);
assert.equal(
  timer.includes("WantedBy=timers.target"),
  true,
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_WATCH_GUARD_V1_GREEN",
);
console.log("exact_lane_file_count=8");
console.log("runtime_import_count=0");
console.log("one_shot_worker=1");
console.log("timer_example_disabled_until_installed=1");
console.log("network_state_write=0");
console.log("operator_local_state_write=1");
console.log("background_loop=0");
console.log("startup_execution=0");
console.log("inventory_reservation=0");
console.log("execution_attempt_reservation=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("rpc_mutation=0");
console.log("money_movement=0");
