import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const cliPath = path.join(
  root,
  "scripts/"
    + "buy_void_observe_and_claim_candidate_readiness_v1.ts",
);
const fixturePath = path.join(
  root,
  "fixtures/buy-void/"
    + "observe-and-claim-candidate-readiness-v1.example.json",
);
const schemaPath = path.join(
  root,
  "schemas/"
    + "buy-void-observe-and-claim-candidate-readiness-v1.schema.json",
);

const cli = fs.readFileSync(cliPath, "utf8");
const fixture = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
) as Record<string, any>;
const schema = JSON.parse(
  fs.readFileSync(schemaPath, "utf8"),
) as Record<string, any>;

for (const marker of [
  "--require-exact-one",
  "process.exitCode = 3",
  "process.exitCode = 4",
  "apply: false",
  "deriveBuyVoidBoundedOrchestratorServerSnapshotV1",
  "runBuyVoidBoundedAutoFulfillmentOrchestratorV1",
  "evaluateBuyVoidBoundedOrchestratorApplyActivationV1",
  "summarizeBuyVoidObserveAndClaimCandidateReadinessV1",
  "activation_performed=false",
  "runtime_mutation_performed=false",
  "money_movement=false",
]) {
  assert.equal(
    cli.includes(marker),
    true,
    `CLI missing ${marker}`,
  );
}

for (const forbidden of [
  "apply: true",
  "setInterval(",
  "setTimeout(",
  "while (true)",
  "for (;;)",
  "eth_sendRawTransaction",
  "sendTransaction(",
  "signTransaction(",
  "privateKey",
  "mnemonic",
  "credential",
]) {
  assert.equal(
    cli.includes(forbidden),
    false,
    `CLI contains forbidden ${forbidden}`,
  );
}

assert.equal(
  fixture.schema,
  "void_buy_void_observe_and_claim_candidate_readiness_v1",
);
assert.equal(
  fixture.marker,
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_V1",
);
assert.equal(fixture.readiness_status, "none");
assert.equal(fixture.request_record_count, 2);
assert.equal(fixture.eligible_candidate_count, 0);
assert.deepEqual(fixture.eligible_request_ids, []);
assert.equal(fixture.recommended_request_id, null);
assert.equal(fixture.authority.read_only, true);
assert.equal(fixture.authority.runtime_import_mounted, false);
assert.equal(fixture.authority.apply_requested, false);
assert.equal(fixture.authority.wallet_access, false);
assert.equal(fixture.authority.money_movement, false);

assert.equal(schema.type, "object");
assert.equal(
  schema.properties.candidate_stage.const,
  "observe_and_claim",
);
assert.deepEqual(
  schema.properties.readiness_status.enum,
  ["none", "exact_one", "multiple"],
);
assert.equal(
  schema.properties.authority.properties.read_only.const,
  true,
);
assert.equal(
  schema.properties.authority.properties
    .runtime_import_mounted.const,
  false,
);
assert.equal(
  schema.properties.authority.properties
    .money_movement.const,
  false,
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_CANDIDATE_READINESS_CLI_V1_GREEN",
);
console.log("fixture_none_state=1");
console.log("require_exact_one_exit_codes=1");
console.log("server_derived_snapshot=1");
console.log("dry_run_only=1");
console.log("runtime_import_mounted=0");
console.log("wallet_access=0");
console.log("signing=0");
console.log("transaction_broadcast=0");
console.log("money_movement=0");
