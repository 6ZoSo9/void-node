import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const DOC =
  "docs/validators/validator-registration-positive-readiness-public-evidence-v1.md";
const GENERATOR =
  "ops/mainnet0/validator-registration-positive-readiness-public-evidence-v1.py";
const SELF =
  "scripts/prove_validator_registration_positive_readiness_public_evidence_v1.ts";

const doc = fs.readFileSync(DOC, "utf8");
const generator = fs.readFileSync(GENERATOR, "utf8");
const self = fs.readFileSync(SELF, "utf8");

assert.match(
  doc,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1/,
);
assert.match(doc, /positive readiness without live execution/i);
assert.match(doc, /wrapper cleanup failed and was recovered/i);
assert.match(doc, /all 44 production wallet records/i);
assert.match(doc, /live execution kill switch remained off/i);
assert.match(doc, /double-submit guard created no reservation/i);
assert.match(doc, /It may not claim:/);
assert.match(doc, /PROTECT THE CORE/);

for (const sha of [
  "ff4bd98d306af268d1d42817489d2f071a9ddc428c73afe50ebada4f47b181c2",
  "7ade6714c8559642ea4fad8e24c5253871dfd11daa868645751b827f9d58cebe",
  "af4a2e3e99a401a5616feab5e2d09169319e9ec3592024d72caeb712a7d51c21",
  "6242e5ecf3cfc829962e20778383622455ebee6a83dd65fce8fbf59af821cad3",
]) {
  assert.match(doc, new RegExp(sha));
  assert.match(generator, new RegExp(sha));
}

assert.match(
  generator,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_V1/,
);
assert.match(generator, /positive_readiness_wrapper_exact_green": False/);
assert.match(generator, /wrapper_cleanup_failure_recovered": True/);
assert.match(generator, /submit_live_transaction_sent": False/);
assert.match(generator, /double_submit_reservation_created": False/);
assert.match(generator, /validator_registration_or_admission_performed": False/);
assert.match(generator, /active_validator_set_mutation_performed": False/);
assert.match(
  generator,
  /public_validator_registration_enabled_by_this_evidence": False/,
);
assert.match(generator, /json\.dumps\(value, indent=2, sort_keys=True\)/);
assert.match(generator, /os\.replace\(temporary, resolved\)/);
assert.match(
  generator,
  /refusing to write inside a sensitive or generated directory/,
);

assert.doesNotMatch(generator, /\bsubprocess\b/);
assert.doesNotMatch(generator, /\brequests\b/);
assert.doesNotMatch(generator, /\burllib\b/);
assert.doesNotMatch(generator, /\bsocket\b/);
assert.doesNotMatch(generator, /\bsystemctl\b/);
assert.doesNotMatch(generator, /\btailscale\b/);
assert.doesNotMatch(generator, /\bcast\s+send\b/);
assert.doesNotMatch(generator, /\bgit\s+(?:push|tag|commit|checkout|reset)\b/);
assert.doesNotMatch(generator, /shell\s*=\s*True/);

const describe = spawnSync("python3", [GENERATOR, "--describe-contract"], {
  encoding: "utf8",
});
assert.equal(describe.status, 0, describe.stderr);
const contract = JSON.parse(describe.stdout);

assert.equal(
  contract.marker,
  "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_CONTRACT_V1",
);
assert.equal(contract.schema_version, 1);
assert.equal(
  contract.subject,
  "validator_registration_positive_readiness_without_live_execution",
);
assert.equal(contract.checkpoint.targets_exact_deployed_runtime, true);
assert.equal(contract.checkpoint.claims_remote_main_deployed, false);
assert.equal(
  contract.public_claims.positive_readiness_wrapper_exact_green,
  false,
);
assert.equal(contract.public_claims.wrapper_cleanup_failure_recovered, true);
assert.equal(contract.public_claims.submit_live_transaction_sent, false);
assert.equal(contract.public_claims.double_submit_reservation_created, false);
assert.equal(
  contract.public_claims.public_validator_registration_enabled_by_this_evidence,
  false,
);
assert.equal(contract.generator_authority.network_access, false);
assert.equal(contract.generator_authority.rpc_call, false);
assert.equal(contract.generator_authority.wallet_access, false);
assert.equal(contract.generator_authority.signer_access, false);
assert.equal(contract.generator_authority.service_control, false);
assert.equal(contract.generator_authority.git_mutation, false);
assert.equal(contract.generator_authority.transaction_signing, false);
assert.equal(contract.generator_authority.transaction_broadcast, false);
assert.equal(contract.generator_authority.validator_registration, false);
assert.equal(contract.generator_authority.validator_admission, false);
assert.equal(
  contract.generator_authority.active_validator_set_mutation,
  false,
);

const selfTest = spawnSync("python3", [GENERATOR, "--self-test"], {
  encoding: "utf8",
});
assert.equal(selfTest.status, 0, selfTest.stderr);
assert.match(
  selfTest.stdout,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_SELF_TEST_V1_GREEN/,
);

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "void-validator-public-evidence-proof-"),
);
try {
  const output = path.join(tempRoot, "evidence.json");
  assert.equal(fs.existsSync(output), false);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

assert.doesNotMatch(doc, /public validator registration is now enabled/i);
assert.doesNotMatch(doc, /validator was registered by this proof/i);
assert.doesNotMatch(
  doc,
  /remote main was deployed by the recovery checkpoint/i,
);

assert.match(
  self,
  /VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_PROOF_V1_GREEN/,
);

console.log(
  "VOID_VALIDATOR_REGISTRATION_POSITIVE_READINESS_PUBLIC_EVIDENCE_PROOF_V1_GREEN",
);
