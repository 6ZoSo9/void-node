import assert from "node:assert/strict";
import fs from "node:fs";

const DOC =
  "docs/validators/validator-registration-positive-readiness-public-release-v1.md";
const JSON_PATH =
  "public/public-node/validators/validator-registration-positive-readiness-public-evidence-v1.json";
const GENERATOR =
  "ops/mainnet0/validator-registration-positive-readiness-public-evidence-v1.py";
const SOURCE_DOC =
  "docs/validators/validator-registration-positive-readiness-public-evidence-v1.md";

const doc = fs.readFileSync(DOC, "utf8");
const raw = fs.readFileSync(JSON_PATH, "utf8");
const generator = fs.readFileSync(GENERATOR, "utf8");
const sourceDoc = fs.readFileSync(SOURCE_DOC, "utf8");
const evidence = JSON.parse(raw);

assert.equal(
  evidence.marker,
  "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1",
);
assert.equal(evidence.schema_version, 1);
assert.equal(
  evidence.subject,
  "validator_registration_positive_readiness_without_live_execution",
);
assert.equal(
  evidence.status,
  "exact_green_with_recovered_wrapper_cleanup_failure",
);

assert.deepEqual(evidence.checkpoint, {
  claims_remote_main_deployed: false,
  tag:
    "ckpt-validator-positive-readiness-wallet-recovery-v11-final-closeout-exact-green-20260720T070906Z",
  target_commit: "8b961e919148e4035d03e32e20b12685df119beb",
  targets_exact_deployed_runtime: true,
});

const claims = evidence.claims;
assert.equal(claims.positive_readiness_core_proof_green, true);
assert.equal(claims.positive_readiness_wrapper_exact_green, false);
assert.equal(claims.wrapper_cleanup_failure_recovered, true);
assert.equal(claims.proof_status_mode_read_only, true);
assert.equal(claims.readiness_gates_green_during_proof, true);
assert.equal(claims.submit_live_kill_switch_remained_off, true);
assert.equal(claims.submit_live_transaction_sent, false);
assert.equal(claims.double_submit_reservation_created, false);
assert.equal(claims.production_wallet_store_restored_exact, true);
assert.equal(claims.production_wallet_json_file_count, 44);
assert.equal(claims.proof_wallet_absent_after_recovery, true);
assert.equal(claims.temporary_recovery_artifacts_absent, true);
assert.equal(claims.validator_live_execution_final, false);
assert.equal(claims.validator_signer_selected_final, false);
assert.equal(claims.validator_status_proof_mode_final, false);
assert.equal(claims.submit_intent_journal_entries_final, 4);
assert.equal(claims.submit_intent_journal_changed_by_recovery, false);
assert.equal(claims.transaction_signing_or_broadcast_performed, false);
assert.equal(claims.validator_registration_or_admission_performed, false);
assert.equal(claims.active_validator_set_mutation_performed, false);
assert.equal(claims.remote_boxes_green_at_final_closeout, true);
assert.equal(claims.runtime_checkpoint_tag_verified, true);
assert.equal(claims.checkpoint_claims_remote_main_deployed, false);
assert.equal(
  claims.public_validator_registration_enabled_by_this_evidence,
  false,
);

assert.equal(
  evidence.interpretation.proves,
  "positive readiness could be observed without enabling live execution",
);
assert.equal(
  evidence.interpretation.does_not_prove,
  "public validator registration is enabled",
);

const expectedEvidence = new Map([
  [
    "positive_readiness_core",
    "ff4bd98d306af268d1d42817489d2f071a9ddc428c73afe50ebada4f47b181c2",
  ],
  [
    "wallet_recovery_v11",
    "7ade6714c8559642ea4fad8e24c5253871dfd11daa868645751b827f9d58cebe",
  ],
  [
    "wallet_recovery_final_closeout",
    "af4a2e3e99a401a5616feab5e2d09169319e9ec3592024d72caeb712a7d51c21",
  ],
  [
    "runtime_checkpoint_tag",
    "6242e5ecf3cfc829962e20778383622455ebee6a83dd65fce8fbf59af821cad3",
  ],
]);

assert.equal(evidence.evidence.length, expectedEvidence.size);

for (const row of evidence.evidence) {
  assert.equal(row.receipt_contract_green, true);
  assert.equal(row.sha256, expectedEvidence.get(row.kind));
  expectedEvidence.delete(row.kind);
}

assert.equal(expectedEvidence.size, 0);

for (const forbidden of [
  "/home/",
  "/tmp/",
  "0x3B42877c154a722E1c1A261B0E7cA31DcD5C72Af",
  "private_key",
  "privateKey",
  "passphrase",
  "wallet_path",
  "receipt_path",
]) {
  assert.equal(raw.includes(forbidden), false, `forbidden output value: ${forbidden}`);
}

assert.match(
  doc,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_RELEASE_V1/,
);
assert.match(doc, /public validator registration is enabled/);
assert.match(doc, /does not claim/i);
assert.match(doc, /44-record production wallet store/);
assert.match(doc, /PR #642 was squash-merged and checkpointed/);
assert.match(
  doc,
  /ckpt-validator-positive-readiness-public-evidence-v1-post-merge-exact-green-20260720T153049Z/,
);
assert.match(doc, /ba47e31a393f32ed80bad80b013277e9d5010624/);
assert.match(doc, /PROTECT THE CORE/);

assert.match(
  generator,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1/,
);
assert.match(generator, /positive_readiness_wrapper_exact_green": False/);
assert.match(generator, /wrapper_cleanup_failure_recovered": True/);
assert.match(
  generator,
  /public_validator_registration_enabled_by_this_evidence": False/,
);
assert.match(
  sourceDoc,
  /positive readiness without live execution/i,
);

assert.equal(
  fs.statSync(JSON_PATH).mode & 0o777,
  0o644,
);
assert.equal(
  fs.statSync(DOC).mode & 0o777,
  0o644,
);

console.log(
  "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_RELEASE_V1_GREEN",
);
