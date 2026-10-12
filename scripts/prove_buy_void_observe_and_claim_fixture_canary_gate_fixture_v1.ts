import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const fixturePath = path.join(
  root,
  "fixtures/buy-void/"
    + "observe-and-claim-fixture-canary-gate-v1.example.json",
);
const schemaPath = path.join(
  root,
  "schemas/"
    + "buy-void-observe-and-claim-fixture-canary-gate-v1.schema.json",
);

const fixture = JSON.parse(
  fs.readFileSync(fixturePath, "utf8"),
) as Record<string, any>;
const schema = JSON.parse(
  fs.readFileSync(schemaPath, "utf8"),
) as Record<string, any>;

assert.equal(
  fixture.schema,
  "void_buy_void_observe_and_claim_fixture_canary_gate_v1",
);
assert.equal(
  fixture.marker,
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_V1",
);
assert.equal(fixture.version, 1);
assert.equal(fixture.fixture_only, true);
assert.equal(fixture.live_activation_mounted, false);
assert.equal(fixture.live_eligible_candidate_count, 0);
assert.equal(fixture.candidate_stage, "observe_and_claim");
assert.equal(fixture.policy.enabled, false);
assert.deepEqual(fixture.policy.exact_request_ids, []);
assert.equal(
  fixture.policy.maximum_successful_canary_mutations,
  1,
);
assert.equal(
  fixture.required_canary_controls.automatic_retry,
  false,
);
assert.equal(
  fixture.required_canary_controls
    .exact_request_allowlist_count_when_armed,
  1,
);
assert.equal(
  fixture.hard_forbidden_authority
    .reserve_inventory_and_attempt,
  true,
);
assert.equal(
  fixture.hard_forbidden_authority.execute_reserved_plan,
  true,
);
assert.equal(
  fixture.hard_forbidden_authority
    .reconcile_possible_broadcast,
  true,
);
assert.equal(
  fixture.hard_forbidden_authority
    .closeout_confirmed_delivery,
  true,
);
assert.equal(
  fixture.hard_forbidden_authority.money_movement,
  true,
);
assert.equal(fixture.activation_performed, false);

assert.equal(schema.type, "object");
assert.equal(schema.additionalProperties, false);
assert.equal(
  schema.properties.fixture_only.const,
  true,
);
assert.equal(
  schema.properties.live_activation_mounted.const,
  false,
);
assert.equal(
  schema.properties.live_eligible_candidate_count.const,
  0,
);
assert.equal(
  schema.properties.policy.properties.enabled.const,
  false,
);
assert.equal(
  schema.properties.policy.properties.exact_request_ids.maxItems,
  0,
);
assert.equal(
  schema.properties.activation_performed.const,
  false,
);

console.log(
  "VOID_BUY_VOID_OBSERVE_AND_CLAIM_FIXTURE_CANARY_GATE_FIXTURE_V1_GREEN",
);
console.log("fixture_only=1");
console.log("live_eligible_candidate_count=0");
console.log("default_enabled_stage_count=0");
console.log("default_exact_request_allowlist_count=0");
console.log("activation_performed=0");
console.log("money_movement=0");
