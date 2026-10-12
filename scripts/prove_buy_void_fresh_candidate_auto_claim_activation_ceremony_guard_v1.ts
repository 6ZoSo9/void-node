import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_ceremony_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-ceremony-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-ceremony-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1",
  "buyVoidExecuteFreshCandidateAutoClaimActivationCeremonyOneShot",
  "separate_issuance_confirmation_required: true",
  "separate_execution_confirmation_required: true",
  "maximum_issuer_invocations: 1",
  "maximum_runner_invocations: 1",
  "maximum_credential_ttl_seconds: 900",
  "credential_content_printed: false",
  "sensitive_values_printed: false",
  "automatic_retry: false",
  "systemd_change: false",
  "service_restart: false",
  "persistent_config_write: false",
  "request_journal_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  '"--issue"',
  '"--confirmation"',
  '"--execute"',
  'fs.openSync(lockPath, "wx", 0o600)',
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
      /VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1/g,
    ) || []
  ).length >= 4,
  true,
  "issuer confirmation constant must be imported, exposed, validated, and delegated",
);

assert.equal(
  (cliSource.match(/spawnSync\s*\(/g) || []).length,
  2,
  "exactly two child-process spawn sites required",
);

const issuerPosition = cliSource.indexOf(
  "buy_void_fresh_candidate_auto_claim_activation_credential_issue_v1.ts",
);
const runnerPosition = cliSource.indexOf(
  "buy_void_fresh_candidate_auto_claim_activation_credential_runner_v1.ts",
);

assert.equal(issuerPosition >= 0, true);
assert.equal(runnerPosition >= 0, true);
assert.equal(
  issuerPosition < runnerPosition,
  true,
  "issuer invocation must precede runner invocation",
);

const forbidden = [
  /systemctl/,
  /service restart/i,
  /setInterval\s*\(/,
  /setTimeout\s*\(/,
  /while\s*\(\s*true\s*\)/,
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
    `forbidden activation-ceremony authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_GUARD_V1_GREEN",
);
console.log("child_process_spawn_sites=2");
console.log("issuer_before_runner=1");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("native_execution=0");
console.log("native_delivery=0");
console.log("wallet_credential=0");
console.log("transaction_broadcast=0");
