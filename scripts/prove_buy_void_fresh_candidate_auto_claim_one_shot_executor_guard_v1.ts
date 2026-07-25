import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_one_shot_executor_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-one-shot-executor-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-one-shot-executor-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "buyVoidExecuteFreshCandidateAutoClaimOneShot",
  "maximum_claimant_invocations: 1",
  "ephemeral_enabled_config_only: true",
  "original_config_write: false",
  "ephemeral_config_delete_required: true",
  "automatic_retry: false",
  "systemd_change: false",
  "service_restart: false",
  "request_journal_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  'flag: "wx"',
  "fs.unlinkSync(ephemeralPath)",
];

for (const marker of required) {
  assert.equal(
    combined.includes(marker),
    true,
    `missing authority marker: ${marker}`,
  );
}

assert.equal(
  (cliSource.match(/spawnSync\s*\(/g) || []).length,
  1,
  "exactly one claimant spawn site required",
);

const forbidden = [
  /systemctl/,
  /service restart/i,
  /writeFileSync\s*\(\s*args[.]configFile/i,
  /renameSync\s*\([^)]*args[.]configFile/i,
  /unlinkSync\s*\(\s*args[.]configFile/i,
  /buy_void_native_execution/i,
  /buy_void_native_delivery/i,
  /broadcast_signed_transaction\s*\(/i,
  /sign_transaction\s*\(/i,
  /wallet_credential/i,
];

for (const pattern of forbidden) {
  assert.equal(
    pattern.test(combined),
    false,
    `forbidden executor authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_GUARD_V1_GREEN",
);
console.log("claimant_spawn_sites=1");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("native_execution=0");
console.log("native_delivery=0");
console.log("wallet_credential=0");
console.log("transaction_broadcast=0");
