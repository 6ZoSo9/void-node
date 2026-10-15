#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
  VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_AUTHORITY_V1,
  VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
  VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1,
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
  VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
  classifyVoidPublicEarnProxyV2EdgeContractV1,
} from "../tools/void-public-earn-proxy-v2-edge-contract-v1.mjs";

const SIGNATURE = Buffer.from([
  0x0d, 0x0a, 0x0d, 0x0a, 0x00, 0x0d,
  0x0a, 0x51, 0x55, 0x49, 0x54, 0x0a,
]);

function ipv4Bytes(value) {
  const parts = value.split(".").map(Number);
  assert.equal(parts.length, 4);
  assert.equal(
    parts.every(
      (v) => Number.isInteger(v) && v >= 0 && v <= 255,
    ),
    true,
  );
  return Buffer.from(parts);
}

function proxy4({
  source,
  sourcePort,
  destinationPort = 443,
  method = "POST",
  target,
}) {
  const payload = Buffer.alloc(12);
  ipv4Bytes(source).copy(payload, 0);
  ipv4Bytes("127.0.0.1").copy(payload, 4);
  payload.writeUInt16BE(sourcePort, 8);
  payload.writeUInt16BE(destinationPort, 10);
  const header = Buffer.alloc(16);
  SIGNATURE.copy(header, 0);
  header[12] = 0x21;
  header[13] = 0x11;
  header.writeUInt16BE(payload.length, 14);
  return Buffer.concat([
    header,
    payload,
    Buffer.from(
      method +
        " " +
        target +
        " HTTP/1.1\r\nHost: voidchain.org\r\n\r\n",
      "ascii",
    ),
  ]);
}

function baseInput({
  source = "203.0.113.10",
  sourcePort = 40000,
  method = "POST",
  target = VOID_PUBLIC_EARN_CLAIM_PATH_V1,
  headers = {},
  priorEvents = [],
  nowMs = 100_000,
}) {
  return {
    connection_prefix: proxy4({
      source,
      sourcePort,
      method,
      target,
    }),
    headers: {
      Host: "voidchain.org",
      "Content-Type": "application/json",
      ...headers,
    },
    now_ms: nowMs,
    prior_events: priorEvents,
  };
}

function repeatedEvents({
  sourceKey,
  route,
  count,
  startMs = 90_000,
}) {
  return Array.from({ length: count }, (_unused, index) => ({
    source_key: sourceKey,
    route,
    at_ms: startMs + index,
  }));
}

const spoofHeaders = {
  Authorization: "Bearer void_earn_capability_shape_is_preserved",
  Forwarded: "for=198.51.100.99",
  "X-Forwarded-For": "198.51.100.99",
  "X-Forwarded-Proto": "https",
  "X-Real-IP": "198.51.100.99",
  "CF-Connecting-IP": "198.51.100.99",
  "True-Client-IP": "198.51.100.99",
  "X-Void-Trusted-Funnel-Source-V1": "spoofed",
};

const claimA = classifyVoidPublicEarnProxyV2EdgeContractV1(
  baseInput({
    headers: spoofHeaders,
  }),
);
assert.equal(claimA.ok, true);
assert.equal(
  claimA.status,
  "PUBLIC_EARN_SOURCE_RATE_ALLOWED_NOT_MOUNTED",
);
assert.equal(claimA.marker, VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1);
assert.equal(claimA.route, "claim");
assert.equal(claimA.forward_target, VOID_PUBLIC_EARN_CLAIM_PATH_V1);
assert.equal(claimA.max_requests_per_source, 6);
assert.equal(claimA.window_ms, 60_000);
assert.equal(claimA.rate_event_state_mutation_required, true);
assert.equal(claimA.source_identity_forwarded_downstream, false);
assert.equal(claimA.route_body_capability_checks_modified, false);
assert.equal(claimA.existing_inner_adapter_limiter_modified, false);
assert.equal(claimA.inner_adapter_limiter_remains_secondary, true);
assert.equal(
  claimA.self_issued_executor_identity_used_for_rate_authority,
  false,
);
assert.equal(claimA.bearer_capability_used_for_rate_authority, false);
assert.equal(claimA.generic_mutation_route_authorized, false);
assert.equal(claimA.local_transport_trust_proven, false);
assert.equal(claimA.http_parser_stream_binding_proven, false);
assert.equal(claimA.rate_state_custody_proven, false);
assert.equal(claimA.concurrent_rate_state_serialization_proven, false);
assert.equal(claimA.listener_created, false);
assert.equal(claimA.runtime_integration, false);
assert.equal(claimA.work_credit_write, false);
assert.equal(claimA.public_presale_activation, false);
assert.equal(claimA.funds_movement, false);
assert.equal(claimA.rotation_resistant_fairness_proven, false);
assert.equal(claimA.nat_independent_participant_isolation_proven, false);
assert.equal(
  claimA.sanitized_headers.authorization,
  "Bearer void_earn_capability_shape_is_preserved",
);
for (const name of [
  "forwarded",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-real-ip",
  "cf-connecting-ip",
  "true-client-ip",
  "x-void-trusted-funnel-source-v1",
]) {
  assert.equal(
    Object.hasOwn(claimA.sanitized_headers, name),
    false,
    name,
  );
}

const sameSourceOtherPort =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      sourcePort: 49999,
    }),
  );
assert.equal(sameSourceOtherPort.ok, true);
assert.equal(
  sameSourceOtherPort.edge_limiter_source_key,
  claimA.edge_limiter_source_key,
  "ephemeral source-port changes must not mint a new source bucket",
);

const exhaustedClaimEvents = repeatedEvents({
  sourceKey: claimA.edge_limiter_source_key,
  route: "claim",
  count: VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1,
});

const claimAExhausted =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      sourcePort: 40100,
      priorEvents: exhaustedClaimEvents,
    }),
  );
assert.equal(claimAExhausted.ok, false);
assert.equal(claimAExhausted.status, "RATE_LIMITED");
assert.equal(
  claimAExhausted.reason,
  "public_earn_claim_proxy_source_rate_limited",
);
assert.equal(claimAExhausted.rate_event_state_mutation_required, false);

const claimB =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      source: "203.0.113.11",
      sourcePort: 40200,
      headers: {
        "X-Forwarded-For": "203.0.113.10",
      },
      priorEvents: claimAExhausted.next_rate_events,
    }),
  );
assert.equal(claimB.ok, true);
assert.notEqual(
  claimB.edge_limiter_source_key,
  claimA.edge_limiter_source_key,
);
assert.equal(claimB.source_request_count_before, 0);

const submitA =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      sourcePort: 40300,
      target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
      priorEvents: claimAExhausted.next_rate_events,
      headers: {
        Authorization: "Bearer submit_token_shape",
      },
    }),
  );
assert.equal(submitA.ok, true);
assert.equal(submitA.route, "submit");
assert.equal(
  submitA.max_requests_per_source,
  VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
);
assert.equal(
  submitA.source_request_count_before,
  0,
  "claim exhaustion must not spend the submit bucket",
);
assert.equal(
  submitA.sanitized_headers.authorization,
  "Bearer submit_token_shape",
  "edge must preserve downstream capability validation",
);

const exhaustedSubmitEvents = [
  ...claimAExhausted.next_rate_events,
  ...repeatedEvents({
    sourceKey: claimA.edge_limiter_source_key,
    route: "submit",
    count: VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1,
    startMs: 90_100,
  }),
];
const submitAExhausted =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      sourcePort: 40400,
      target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
      priorEvents: exhaustedSubmitEvents,
    }),
  );
assert.equal(submitAExhausted.ok, false);
assert.equal(submitAExhausted.status, "RATE_LIMITED");
assert.equal(
  submitAExhausted.reason,
  "public_earn_submit_proxy_source_rate_limited",
);

const submitB =
  classifyVoidPublicEarnProxyV2EdgeContractV1(
    baseInput({
      source: "203.0.113.12",
      sourcePort: 40500,
      target: VOID_PUBLIC_EARN_SUBMIT_PATH_V1,
      priorEvents: submitAExhausted.next_rate_events,
    }),
  );
assert.equal(submitB.ok, true);
assert.equal(submitB.source_request_count_before, 0);

for (const target of [
  VOID_PUBLIC_EARN_CLAIM_PATH_V1 + "?",
  VOID_PUBLIC_EARN_CLAIM_PATH_V1 + "?x=1",
  "/wc/public-earning-pilot-v1/./claim-ticket",
  "/wc/public-earning-pilot-v1/x/%2e%2e/claim-ticket",
  VOID_PUBLIC_EARN_SUBMIT_PATH_V1 + "?",
  "/wc/public-earning-pilot-v1/./submit-result",
]) {
  const result =
    classifyVoidPublicEarnProxyV2EdgeContractV1(
      baseInput({ target }),
    );
  assert.equal(result.ok, false, target);
  assert.equal(result.status, "HOLD", target);
  assert.equal(
    result.reason,
    "public_earn_edge_target_noncanonical",
    target,
  );
}

for (const [method, target, reason] of [
  ["GET", VOID_PUBLIC_EARN_CLAIM_PATH_V1, "public_earn_edge_post_required"],
  ["HEAD", VOID_PUBLIC_EARN_SUBMIT_PATH_V1, "public_earn_edge_post_required"],
  ["POST", "/wc/public-earning-pilot-v1/other", "public_earn_edge_route_not_allowed"],
  ["POST", "/__void/agents/paid-work/credential-requests/v1", "public_earn_edge_parent_edge_credential_request_target_noncanonical"],
]) {
  const result =
    classifyVoidPublicEarnProxyV2EdgeContractV1(
      baseInput({ method, target }),
    );
  assert.equal(result.ok, false, method + " " + target);
  assert.equal(result.status, "HOLD", method + " " + target);
  if (
    target !==
    "/__void/agents/paid-work/credential-requests/v1"
  ) {
    assert.equal(result.reason, reason, method + " " + target);
  }
}

const wrongDestination =
  classifyVoidPublicEarnProxyV2EdgeContractV1({
    ...baseInput({}),
    connection_prefix: proxy4({
      source: "203.0.113.10",
      sourcePort: 40600,
      destinationPort: 8443,
      target: VOID_PUBLIC_EARN_CLAIM_PATH_V1,
    }),
  });
assert.equal(wrongDestination.ok, false);
assert.match(
  wrongDestination.reason,
  /^public_earn_edge_parent_edge_proxy_destination_port_invalid$/u,
);

const malformed =
  classifyVoidPublicEarnProxyV2EdgeContractV1({
    headers: { Host: "voidchain.org" },
    connection_prefix: Buffer.from(
      "POST " +
        VOID_PUBLIC_EARN_CLAIM_PATH_V1 +
        " HTTP/1.1\r\n\r\n",
      "ascii",
    ),
    now_ms: 100_000,
    prior_events: [],
  });
assert.equal(malformed.ok, false);
assert.match(
  malformed.reason,
  /^public_earn_edge_parent_edge_proxy_v2_/u,
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
assert.match(
  adapterSource,
  /const EARN_CLAIM_PATH = "\/wc\/public-earning-pilot-v1\/claim-ticket";/u,
);
assert.match(
  adapterSource,
  /const EARN_SUBMIT_PATH = "\/wc\/public-earning-pilot-v1\/submit-result";/u,
);
assert.match(
  adapterSource,
  /process\.env\.VOID_EARN_GATEWAY_CLAIM_RATE_LIMIT_PER_MINUTE,\s*6,\s*1,\s*60,/u,
);
assert.match(
  adapterSource,
  /process\.env\.VOID_EARN_GATEWAY_RATE_LIMIT_PER_MINUTE,\s*30,\s*1,\s*600,/u,
);

const claimStart = adapterSource.indexOf(
  "async function proxyEarnClaim(req, res) {",
);
const claimEnd = adapterSource.indexOf(
  "async function proxyEarnSubmit(req, res) {",
);
assert.ok(claimStart >= 0 && claimEnd > claimStart);
const claimHandler = adapterSource.slice(claimStart, claimEnd);
assert.ok(
  claimHandler.indexOf("if (!claimRateAllowed(req))") >= 0,
);
assert.ok(
  claimHandler.indexOf("if (req.headers.authorization)") >
    claimHandler.indexOf("if (!claimRateAllowed(req))"),
);

const submitStart = claimEnd;
const submitEnd = adapterSource.indexOf(
  "function serveShellScript(",
  submitStart,
);
assert.ok(submitEnd > submitStart);
const submitHandler = adapterSource.slice(submitStart, submitEnd);
assert.ok(
  submitHandler.indexOf("if (!submitRateAllowed(req))") >= 0,
);
assert.ok(
  submitHandler.indexOf(
    "validatedEarnCapabilityAuthorization(",
  ) >
    submitHandler.indexOf("if (!submitRateAllowed(req))"),
);
assert.match(
  adapterSource,
  /function clientKey\(req\) \{\s*return String\(req\.socket\.remoteAddress \|\| "unknown"\)\.slice\(0, 128\);\s*\}/u,
);

assert.equal(VOID_PUBLIC_EARN_RATE_WINDOW_MS_V1, 60_000);
assert.equal(VOID_PUBLIC_EARN_CLAIM_RATE_LIMIT_V1, 6);
assert.equal(VOID_PUBLIC_EARN_SUBMIT_RATE_LIMIT_V1, 30);

for (const [key, expected] of Object.entries({
  source_contract: true,
  credential_proxy_v2_edge_composition_reused: true,
  proxy_v2_source_required: true,
  public_tls_destination_port_bound: true,
  exact_claim_submit_routes_only: true,
  claim_submit_separate_rate_buckets: true,
  source_port_excluded_from_limiter_identity: true,
  spoofable_forwarding_headers_trusted: false,
  source_identity_forwarded_downstream: false,
  self_issued_executor_identity_used_for_rate_authority: false,
  bearer_capability_used_for_rate_authority: false,
  route_body_capability_checks_modified: false,
  existing_inner_adapter_limiter_modified: false,
  inner_adapter_limiter_remains_secondary: true,
  generic_mutation_route_authorized: false,
  rate_state_custody_proven: false,
  concurrent_rate_state_serialization_proven: false,
  http_parser_stream_binding_proven: false,
  connector_process_identity_proven: false,
  local_transport_trust_proven: false,
  tailscale_funnel_configuration_verified: false,
  listener_created: false,
  systemd_mutation: false,
  network_mutation: false,
  runtime_integration: false,
  paid_work_dispatch: false,
  work_credit_write: false,
  credential_issuance: false,
  wallet_or_signer_access: false,
  transaction_construction: false,
  transaction_signing: false,
  transaction_broadcast: false,
  chain2050_write: false,
  market_activation: false,
  public_presale_activation: false,
  funds_movement: false,
  rotation_resistant_fairness_proven: false,
  nat_independent_participant_isolation_proven: false,
  source_address_stability_proven: false,
})) {
  assert.equal(
    VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_AUTHORITY_V1[key],
    expected,
    key,
  );
}

console.log(
  JSON.stringify({
    marker: VOID_PUBLIC_EARN_PROXY_V2_EDGE_CONTRACT_V1,
    source_contract: true,
    exact_claim_submit_routes_only: true,
    claim_submit_separate_rate_buckets: true,
    ephemeral_source_port_rotation_changes_bucket: false,
    spoofable_forwarding_headers_trusted: false,
    source_a_exhaustion_denies_source_b: false,
    claim_exhaustion_spends_submit_bucket: false,
    self_issued_executor_identity_used_for_rate_authority: false,
    bearer_capability_used_for_rate_authority: false,
    existing_inner_adapter_limiter_modified: false,
    inner_adapter_limiter_remains_secondary: true,
    route_body_capability_checks_modified: false,
    rate_state_custody_proven: false,
    concurrent_rate_state_serialization_proven: false,
    http_parser_stream_binding_proven: false,
    connector_process_identity_proven: false,
    local_transport_trust_proven: false,
    tailscale_funnel_configuration_verified: false,
    listener_created: false,
    runtime_integration: false,
    work_credit_write: false,
    public_presale_activation: false,
    funds_movement: false,
    nat_independent_participant_isolation_proven: false,
  }),
);
