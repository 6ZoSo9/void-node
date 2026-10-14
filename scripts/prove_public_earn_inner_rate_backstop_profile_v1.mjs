#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_PUBLIC_EARN_INNER_CLAIM_BACKSTOP_PER_MINUTE_V1,
  VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_AUTHORITY_V1,
  VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
  VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1,
  VOID_PUBLIC_EARN_INNER_SUBMIT_BACKSTOP_PER_MINUTE_V1,
  classifyVoidPublicEarnInnerRateBackstopProfileV1,
} from "../tools/void-public-earn-inner-rate-backstop-profile-v1.mjs";
import {
  VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
  VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
  VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";

const profile = classifyVoidPublicEarnInnerRateBackstopProfileV1({
  mutation_ingress_mode: "dedicated_loopback",
  outer_proxy_v2_source_meter: true,
  environment: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
});

assert.equal(profile.ok, true);
assert.equal(profile.status, "SOURCE_POLICY_GREEN_NOT_INSTALLED");
assert.equal(
  profile.marker,
  VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1,
);
assert.equal(profile.rate_window_ms, VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1);
assert.equal(
  profile.outer_claim_requests_per_source_per_window,
  VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
);
assert.equal(
  profile.outer_submit_requests_per_source_per_window,
  VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
);
assert.equal(
  profile.inner_claim_aggregate_backstop_per_window,
  VOID_PUBLIC_EARN_INNER_CLAIM_BACKSTOP_PER_MINUTE_V1,
);
assert.equal(
  profile.inner_submit_aggregate_backstop_per_window,
  VOID_PUBLIC_EARN_INNER_SUBMIT_BACKSTOP_PER_MINUTE_V1,
);
assert.equal(
  profile.one_outer_limited_source_can_exhaust_inner_claim_backstop,
  false,
);
assert.equal(
  profile.one_outer_limited_source_can_exhaust_inner_submit_backstop,
  false,
);
assert.ok(
  profile.claim_headroom_after_one_outer_source >=
    VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
);
assert.ok(
  profile.submit_headroom_after_one_outer_source >=
    VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
);
assert.equal(profile.minimum_full_claim_sources_before_inner_backstop, 10);
assert.equal(profile.minimum_full_submit_sources_before_inner_backstop, 10);
assert.equal(profile.caller_forwarding_headers_trusted, false);
assert.equal(profile.outer_source_identity_forwarded_to_adapter, false);
assert.equal(profile.legacy_shared_mode_modified, false);
assert.equal(profile.runtime_integration, false);
assert.equal(profile.live_host_acceptance_claimed, false);

for (const [environment, reason] of [
  [
    {
      ...VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
      VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE: "6",
    },
    "inner_rate_profile_claim_limit_not_canonical",
  ],
  [
    {
      ...VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
      VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE: "30",
    },
    "inner_rate_profile_submit_limit_not_canonical",
  ],
]) {
  const result = classifyVoidPublicEarnInnerRateBackstopProfileV1({
    mutation_ingress_mode: "dedicated_loopback",
    outer_proxy_v2_source_meter: true,
    environment,
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, "HOLD");
  assert.equal(result.reason, reason);
}

const legacy = classifyVoidPublicEarnInnerRateBackstopProfileV1({
  mutation_ingress_mode: "shared_legacy_hold",
  outer_proxy_v2_source_meter: true,
  environment: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
});
assert.equal(legacy.ok, false);
assert.equal(
  legacy.reason,
  "inner_rate_profile_dedicated_ingress_required",
);

const noOuter = classifyVoidPublicEarnInnerRateBackstopProfileV1({
  mutation_ingress_mode: "dedicated_loopback",
  outer_proxy_v2_source_meter: false,
  environment: VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_ENV_V1,
});
assert.equal(noOuter.ok, false);
assert.equal(
  noOuter.reason,
  "inner_rate_profile_outer_source_meter_required",
);

const adapterSource = fs.readFileSync(
  path.join(
    process.cwd(),
    "ops",
    "public",
    "public-seed-adapter-v1.mjs",
  ),
  "utf8",
);

for (const needle of [
  "process.env.VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE",
  "process.env.VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE",
  "function clientKey(req)",
  'return String(req.socket.remoteAddress || "unknown").slice(0, 128);',
  "function submitRateAllowed(req)",
  "function claimRateAllowed(req)",
  "function dedicatedEarnMutationIngressEnabled()",
  'mode: dedicatedEarnMutationIngressEnabled()',
  '"dedicated_loopback"',
]) {
  assert.ok(adapterSource.includes(needle), needle);
}

assert.match(
  adapterSource,
  /VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE,\s*30,\s*1,\s*600,/u,
);
assert.match(
  adapterSource,
  /VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE,\s*6,\s*1,\s*60,/u,
);

for (const [key, expected] of Object.entries({
  source_policy_only: true,
  dedicated_mutation_ingress_required: true,
  outer_proxy_v2_source_meter_required: true,
  outer_source_identity_forwarded_to_adapter: false,
  caller_forwarding_headers_trusted: false,
  inner_loopback_peer_used_as_participant_identity: false,
  inner_limiter_role: "aggregate_secondary_backstop",
  legacy_shared_mode_modified: false,
  service_installation: false,
  systemd_mutation: false,
  nftables_mutation: false,
  network_mutation: false,
  work_credit_write: false,
  credential_issuance: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  public_presale_activation: false,
  funds_movement: false,
})) {
  assert.equal(
    VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_AUTHORITY_V1[key],
    expected,
    key,
  );
}

console.log("VOID_PUBLIC_EARN_INNER_RATE_BACKSTOP_PROFILE_V1_GREEN");
console.log("outer_claim_per_source_per_minute=6");
console.log("inner_claim_aggregate_backstop_per_minute=60");
console.log("outer_submit_per_source_per_minute=30");
console.log("inner_submit_aggregate_backstop_per_minute=300");
console.log("one_outer_limited_source_can_exhaust_inner_backstop=false");
console.log("second_source_full_outer_budget_preserved=true");
console.log("caller_forwarding_headers_trusted=false");
console.log("legacy_shared_mode_modified=false");
console.log("runtime_integration=false");
console.log("funds_movement=false");
