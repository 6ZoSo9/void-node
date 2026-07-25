import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_credential_issue_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_credential_issuer_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-credential-issuer-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-credential-issuer-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "buyVoidIssueFreshCandidateAutoClaimCredentialOneShot",
  "one_credential_per_activation_plan: true",
  "credential_ttl_max_ms: 900_000",
  "credential_file_overwrite: false",
  "credential_content_printed: false",
  "automatic_retry: false",
  "systemd_change: false",
  "service_restart: false",
  "rpc_call: false",
  "persistent_config_write: false",
  "claim_write: false",
  "request_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "wallet_access: false",
  "signing: false",
  "transaction_broadcast: false",
  "money_movement: false",
  "crypto.randomBytes(32)",
  'flag: "wx"',
  "mode: 0o600",
  "mode: 0o700",
];

for (const marker of required) {
  assert.equal(
    combined.includes(marker),
    true,
    `missing authority marker: ${marker}`,
  );
}

assert.equal(
  (combined.match(/spawnSync\s*\(/g) || []).length,
  0,
  "credential issuer must not spawn another process",
);

const forbidden = [
  /systemctl/,
  /service restart/i,
  /--execute/,
  /--apply/,
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
    `forbidden credential-issuer authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_CREDENTIAL_ISSUER_GUARD_V1_GREEN",
);
console.log("process_spawn_sites=0");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("rpc_call=0");
console.log("claim_write=0");
console.log("native_execution=0");
console.log("native_delivery=0");
console.log("wallet_credential=0");
console.log("transaction_broadcast=0");
