#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  DEFAULT_MIN_REMAINING_SECONDS_V1,
  VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1,
  assessCommittedBootstrapFreshnessV1,
} from "../tools/void-public-bootstrap-committed-freshness-v1.mjs";
import {
  objectWithId,
} from "./lib/void_public_seed_common_v1.mjs";

const NOW = Date.parse("2026-09-30T12:00:00.000Z");

function authorityFalse() {
  return {
    private_routes_exposed: false,
    wallet_authority: false,
    signer_authority: false,
    validator_authority: false,
    treasury_authority: false,
    work_credit_authority: false,
    money_movement_authority: false,
  };
}

function stableManifest(remainingSeconds, mutate = () => {}) {
  const manifest = {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "stable_https_seed",
    generated_at: new Date(NOW - 60 * 60 * 1000).toISOString(),
    expires_at: new Date(NOW + remainingSeconds * 1000).toISOString(),
    sync_endpoints: [{
      transport: "https",
      base: "https://seed.nullfeed.org",
      priority: 10,
      enabled: true,
      temporary: false,
      qualification_id: "voidpsq1_" + "a".repeat(64),
      qualified_at: new Date(NOW - 60_000).toISOString(),
      qualified_head: 1951058,
    }],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "fixture",
  };
  mutate(manifest);
  return objectWithId("voidpbm1_", manifest, "manifest_id");
}

const fresh = assessCommittedBootstrapFreshnessV1(
  stableManifest(DEFAULT_MIN_REMAINING_SECONDS_V1 + 1),
  { nowMs: NOW },
);
assert.equal(fresh.ok, true);
assert.equal(fresh.classification, "FRESH");

for (const remaining of [
  DEFAULT_MIN_REMAINING_SECONDS_V1,
  DEFAULT_MIN_REMAINING_SECONDS_V1 - 1,
]) {
  const result = assessCommittedBootstrapFreshnessV1(
    stableManifest(remaining),
    { nowMs: NOW },
  );
  assert.equal(result.ok, false);
  assert.equal(result.classification, "RENEWAL_REQUIRED");
}

const expired = assessCommittedBootstrapFreshnessV1(
  stableManifest(0),
  { nowMs: NOW },
);
assert.equal(expired.ok, false);
assert.equal(expired.classification, "EXPIRED");

const holdManifest = objectWithId(
  "voidpbm1_",
  {
    schema: "void_public_bootstrap_v1",
    network: "VOID Network",
    chain_id: 2050,
    status: "hold_no_stable_seed",
    generated_at: new Date(NOW - 1000).toISOString(),
    sync_endpoints: [],
    onion_endpoints: [],
    private_tailnet_endpoints_published: false,
    authority: authorityFalse(),
    notes: "hold fixture",
  },
  "manifest_id",
);
const hold = assessCommittedBootstrapFreshnessV1(
  holdManifest,
  { nowMs: NOW },
);
assert.equal(hold.ok, false);
assert.equal(hold.classification, "HOLD_NO_STABLE_SEED");

for (const [name, mutate, expected] of [
  ["authority", (m) => { m.authority.wallet_authority = true; }, /wallet_authority/],
  ["tailnet", (m) => { m.private_tailnet_endpoints_published = true; }, /private tailnet/],
  ["temporary", (m) => { m.sync_endpoints[0].temporary = true; }, /temporary=false/],
  ["transport", (m) => { m.sync_endpoints[0].transport = "http"; }, /must use HTTPS/],
  ["chain_type", (m) => { m.chain_id = "2050"; }, /network or chain mismatch/],
  ["extra_authority", (m) => { m.authority.future_authority = false; }, /authority keys mismatch/],
  ["missing_onion_array", (m) => { delete m.onion_endpoints; }, /keys mismatch|onion_endpoints/u],
  ["extra_endpoint_key", (m) => { m.sync_endpoints[0].future = false; }, /keys mismatch/u],
  ["onion_endpoint", (m) => { m.onion_endpoints.push({ transport: "tor" }); }, /must not publish onion endpoints/u],
]) {
  assert.throws(
    () => assessCommittedBootstrapFreshnessV1(
      stableManifest(DEFAULT_MIN_REMAINING_SECONDS_V1 + 1, mutate),
      { nowMs: NOW },
    ),
    expected,
    name,
  );
}

{
  const badManifestId = stableManifest(
    DEFAULT_MIN_REMAINING_SECONDS_V1 + 1,
  );
  badManifestId.manifest_id = "voidpbm1_" + "0".repeat(64);
  assert.throws(
    () => assessCommittedBootstrapFreshnessV1(
      badManifestId,
      { nowMs: NOW },
    ),
    /manifest ID/u,
  );
}

const committed = JSON.parse(
  fs.readFileSync("public/bootstrap/v1.json", "utf8"),
);
const committedAtGeneration = assessCommittedBootstrapFreshnessV1(
  committed,
  {
    nowMs: Date.parse(committed.generated_at) + 1000,
    minRemainingSeconds: DEFAULT_MIN_REMAINING_SECONDS_V1,
  },
);
assert.equal(committedAtGeneration.ok, true);
assert.equal(committedAtGeneration.classification, "FRESH");

const repeatedA = assessCommittedBootstrapFreshnessV1(
  stableManifest(DEFAULT_MIN_REMAINING_SECONDS_V1 + 5),
  { nowMs: NOW },
);
const repeatedB = assessCommittedBootstrapFreshnessV1(
  stableManifest(DEFAULT_MIN_REMAINING_SECONDS_V1 + 5),
  { nowMs: NOW },
);
assert.deepEqual(repeatedA, repeatedB);

const source = fs.readFileSync(
  "tools/void-public-bootstrap-committed-freshness-v1.mjs",
  "utf8",
);
for (const forbidden of [
  "writeFileSync",
  "appendFileSync",
  "child_process",
  "systemctl",
  "git push",
  "eth_sendRawTransaction",
]) {
  assert.equal(source.includes(forbidden), false, forbidden);
}

console.log(
  VOID_PUBLIC_BOOTSTRAP_COMMITTED_FRESHNESS_V1 + "_PROOF_GREEN",
);
console.log("fresh_above_threshold=true");
console.log("threshold_holds=true");
console.log("expired_holds=true");
console.log("hold_manifest_holds=true");
console.log("authority_boundary=true");
console.log("exact_chain_id_type=true");
console.log("exact_authority_keyset=true");
console.log("canonical_manifest_admission_reused=true");
console.log("content_derived_manifest_id_required=true");
console.log("exact_endpoint_keyset_required=true");
console.log("onion_array_required=true");
console.log("deterministic=true");
console.log("network_access=false");
console.log("repository_mutation=false");
