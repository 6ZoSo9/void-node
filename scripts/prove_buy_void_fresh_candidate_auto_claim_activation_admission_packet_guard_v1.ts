import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_admission_packet_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-admission-packet-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-admission-packet-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_CONFIRMATION_V1",
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CEREMONY_EXECUTION_CONFIRMATION_V1",
  "operator_approval_required: true",
  "automatic_execution: false",
  "maximum_credential_ttl_seconds: 900",
  "maximum_issuer_invocations: 1",
  "maximum_runner_invocations: 1",
  "process_spawn: false",
  "credential_created: false",
  "credential_consumed: false",
  "credential_content_printed: false",
  "sensitive_values_printed: false",
  "automatic_retry: false",
  "systemd_change: false",
  "service_restart: false",
  "persistent_config_write: false",
  "claim_write: false",
  "request_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
];

for (const marker of required) {
  assert.equal(
    combined.includes(marker),
    true,
    `missing authority marker: ${marker}`,
  );
}

const forbidden = [
  /spawnSync\s*\(/,
  /execFileSync\s*\(/,
  /execSync\s*\(/,
  /fork\s*\(/,
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
    `forbidden admission-packet authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_ADMISSION_PACKET_GUARD_V1_GREEN",
);
console.log("process_spawn_sites=0");
console.log("automatic_execution=0");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("native_execution=0");
console.log("native_delivery=0");
console.log("wallet_credential=0");
console.log("transaction_broadcast=0");
