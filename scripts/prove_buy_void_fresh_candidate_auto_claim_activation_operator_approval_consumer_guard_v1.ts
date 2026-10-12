import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_operator_approval_consumer_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-operator-approval-consumer-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-operator-approval-consumer-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "buyVoidConsumeFreshCandidateAutoClaimActivationOperatorApprovalOneShot",
  "exact_consumer_confirmation_required: true",
  "consumption_intent_before_ceremony: true",
  "maximum_ceremony_invocations: 1",
  "maximum_issuer_invocations: 1",
  "maximum_runner_invocations: 1",
  "automatic_retry: false",
  "persistent_config_write: false",
  "request_journal_write: false",
  "inventory_reservation: false",
  "inventory_decrement: false",
  "direct_rpc_call: false",
  "direct_claim_write: false",
  "direct_wallet_access: false",
  "direct_signing: false",
  "direct_transaction_broadcast: false",
  "direct_money_movement: false",
  'fs.openSync(file, "wx", 0o600)',
  "const completed = spawnSync(",
  '"--activate"',
  '"--issuer-confirmation"',
  '"--execution-confirmation"',
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
  "exactly one ceremony spawn site required",
);
assert.equal(
  (cliSource.match(/openSync\s*\(/g) || []).length,
  1,
  "exactly one exclusive writer helper required",
);

const intentIndex = cliSource.indexOf(
  "consumptionIntentWritten = true",
);
const spawnIndex = cliSource.indexOf(
  "const completed = spawnSync(",
);
assert.equal(intentIndex >= 0, true);
assert.equal(spawnIndex >= 0, true);
assert.equal(
  intentIndex < spawnIndex,
  true,
  "consumption intent must precede ceremony spawn",
);

const forbidden = [
  /systemctl/,
  /service restart/i,
  /setInterval\s*\(/,
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
    `forbidden approval-consumer authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_APPROVAL_CONSUMER_GUARD_V1_GREEN",
);
console.log("ceremony_spawn_sites=1");
console.log("exclusive_writer_helpers=1");
console.log("consumption_intent_before_ceremony=1");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("direct_native_execution=0");
console.log("direct_native_delivery=0");
console.log("direct_wallet_credential=0");
console.log("direct_transaction_broadcast=0");
