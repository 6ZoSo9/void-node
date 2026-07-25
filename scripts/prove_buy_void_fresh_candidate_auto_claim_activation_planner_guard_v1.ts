import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_planner_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_plan_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_planner_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-planner-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-planner-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "buyVoidArmFreshCandidateAutoClaimOneShot",
  "maximum_claim_count: 1",
  "current_exact_one_readiness_required",
  "all_disabled_config_gates_required",
  "exact_alert_identity_required",
  "config_write: false",
  "unit_file_write: false",
  "service_change: false",
  "apply_requested: false",
  "rpc_call: false",
  "claim_write: false",
  "wallet_access: false",
  "transaction_broadcast: false",
  "money_movement: false",
];

for (const marker of required) {
  assert.equal(
    combined.includes(marker),
    true,
    `missing guard marker: ${marker}`,
  );
}

const forbidden = [
  /systemctl/,
  /child_process/,
  /spawnSync/,
  /execFile/,
  /writeFileSync\([^,]*config/i,
  /renameSync\([^,]*config/i,
  /--apply/,
  /buyVoidApplyFreshCandidateAutoClaim/,
  /runBuyVoidAutoClaimWorkerV1/,
  /buy_void_native_execution/i,
  /buy_void_native_delivery/i,
];

for (const pattern of forbidden) {
  assert.equal(
    pattern.test(combined),
    false,
    `forbidden planner authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_PLANNER_GUARD_V1_GREEN",
);
console.log("systemctl=0");
console.log("process_spawn=0");
console.log("config_write=0");
console.log("service_change=0");
console.log("apply=0");
console.log("claim_worker_call=0");
console.log("native_execution=0");
console.log("native_delivery=0");
