import assert from "node:assert/strict";
import fs from "node:fs";

const files = [
  "src/economic/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.ts",
  "scripts/buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.ts",
  "scripts/prove_buy_void_fresh_candidate_auto_claim_activation_operator_console_v1.ts",
  "docs/operators/buy-void-fresh-candidate-auto-claim-activation-operator-console-v1.md",
  ".github/workflows/buy-void-fresh-candidate-auto-claim-activation-operator-console-v1.yml",
];

for (const file of files) {
  assert.equal(fs.existsSync(file), true, `missing ${file}`);
}

const moduleSource = fs.readFileSync(files[0], "utf8");
const cliSource = fs.readFileSync(files[1], "utf8");
const combined = `${moduleSource}\n${cliSource}`;

const required = [
  "exact_operator_approval_confirmation_required: true",
  "exact_consumer_confirmation_required: true",
  "maximum_admission_packet_invocations: 1",
  "maximum_approval_envelope_invocations: 1",
  "maximum_approval_consumer_invocations: 1",
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
  'const completed = spawnSync(',
  'admissionPacketInvocationCount = 1',
  'approvalEnvelopeInvocationCount = 1',
  'approvalConsumerInvocationCount = 1',
  '"--approve"',
  '"--execute"',
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
  "exactly one generic child spawn site required",
);

const admissionIndex = cliSource.indexOf(
  "admissionPacketInvocationCount = 1",
);
const approvalIndex = cliSource.indexOf(
  "approvalEnvelopeInvocationCount = 1",
);
const consumerIndex = cliSource.indexOf(
  "approvalConsumerInvocationCount = 1",
);

assert.equal(admissionIndex >= 0, true);
assert.equal(approvalIndex >= 0, true);
assert.equal(consumerIndex >= 0, true);
assert.equal(
  admissionIndex < approvalIndex
  && approvalIndex < consumerIndex,
  true,
  "child invocation order must be admission, approval, consumer",
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
    `forbidden operator-console authority: ${pattern}`,
  );
}

console.log(
  "VOID_BUY_VOID_FRESH_CANDIDATE_AUTO_CLAIM_ACTIVATION_OPERATOR_CONSOLE_GUARD_V1_GREEN",
);
console.log("generic_child_spawn_sites=1");
console.log("admission_before_approval_before_consumer=1");
console.log("maximum_admission_packet_invocations=1");
console.log("maximum_approval_envelope_invocations=1");
console.log("maximum_approval_consumer_invocations=1");
console.log("automatic_retry=0");
console.log("persistent_config_write=0");
console.log("persistent_config_delete=0");
console.log("systemctl=0");
console.log("service_restart=0");
console.log("direct_native_execution=0");
console.log("direct_native_delivery=0");
console.log("direct_wallet_credential=0");
console.log("direct_transaction_broadcast=0");
