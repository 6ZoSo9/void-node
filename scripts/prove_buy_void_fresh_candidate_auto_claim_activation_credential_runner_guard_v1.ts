import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-credential-runner-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-credential-runner-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "credential_ttl_max_ms: 900_000",
  "consumption_intent_before_execution: true",
  "maximum_executor_invocations: 1",
  "credential_one_use: true",
  "automatic_retry: false",
  "persistent_config_write: false",
  "request_journal_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "systemd_change: false",
  "service_restart: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  'flag: "wx"',
  '"--apply"',
  '"--confirmation"',
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1",
];

for (const marker of required) {
  assert.equal(
    combined.includes(marker),
    true,
    `missing authority marker: ${marker}`,
  );
}

assert.equal(
  (
    moduleSource.match(
      /VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ONE_SHOT_EXECUTOR_CONFIRMATION_V1/g,
    ) || []
  ).length >= 3,
  true,
  "executor confirmation constant must be imported, validated, and delegated",
);

assert.equal(
  moduleSource.includes(
    "required_executor_confirmation",
  ),
  true,
  "credential must bind the required executor confirmation",
);

assert.equal(
  (cliSource.match(/spawnSync\s*\(/g) || []).length,
  1,
  "exactly one one-shot executor spawn site required",
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
    `forbidden credential-runner authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_RUNNER_GUARD_V1_GREEN",
);
console.log("executor_spawn_sites=1");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("native_execution=0");
console.log("native_delivery=0");
console.log("wallet_credential=0");
console.log("transaction_broadcast=0");
